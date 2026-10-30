<?php

declare(strict_types=1);

namespace App\Services\Art;

use App\Jobs\RestyleImage;
use App\Models\ImageRestyle;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\OpenAiImageService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * "Restyle": send a scene picture or a library asset through OpenAI's image EDIT endpoint and get it
 * back in the History Lines style (prompt: {@see HistoryLineStyle::restyle()}).
 *
 * Non-destructive. The result is a new file beside the original; Keep points the subject at it,
 * revert() points it back. Nothing here ever overwrites or deletes the original file.
 */
class ImageRestyler
{
    /** Why a click was refused before anything was queued (user-facing keys live in lang/*.json). */
    public const BUSY = 'busy';

    public const LIMIT = 'limit';

    public const UNSUPPORTED = 'unsupported';

    public const FORBIDDEN = 'forbidden';

    public function __construct(private readonly OpenAiImageService $images) {}

    /** Can this user restyle this subject at all? Teachers: their own lesson's scenes. Admins: also the shared library. */
    public function allows(User $user, Model $subject): bool
    {
        // A guest demo account must never spend the image budget.
        if ($user->isGuestDemo()) {
            return false;
        }
        if ($subject instanceof Scene) {
            return $user->canManage($subject->lesson);
        }

        return $subject instanceof SvgAsset && $user->isAdmin();
    }

    /** Is there a picture to send? A vector, or a sprite-sheet asset, is not one. */
    public function canRestyle(Model $subject): bool
    {
        if ($subject instanceof Scene) {
            return filled($subject->image_path);
        }

        return $subject instanceof SvgAsset && $subject->isRaster() && empty($subject->sheet);
    }

    /**
     * Queue one restyle. Returns the row, or a refusal reason (BUSY, LIMIT, UNSUPPORTED, FORBIDDEN) as a string.
     */
    public function request(User $user, Model $subject): ImageRestyle|string
    {
        if (! $this->allows($user, $subject)) {
            return self::FORBIDDEN;
        }
        if (! $this->canRestyle($subject)) {
            return self::UNSUPPORTED;
        }
        if (ImageRestyle::latestFor($subject)?->isActive()) {
            return self::BUSY;
        }

        $key = 'restyle:'.$user->id;
        $perHour = (int) config('services.openai.restyle_per_hour', 12);
        if (RateLimiter::tooManyAttempts($key, $perHour)) {
            return self::LIMIT;
        }
        RateLimiter::hit($key, 3600);

        $row = ImageRestyle::create([
            'user_id' => $user->id,
            'subject_type' => $subject->getMorphClass(),
            'subject_id' => $subject->getKey(),
            'status' => ImageRestyle::QUEUED,
            'before' => $this->pointer($subject),
        ]);
        RestyleImage::dispatch($row->id);

        return $row;
    }

    /** Ink pass below this share of dark pixels is a blank page; above this it is a smudge. Either way, one retry. */
    private const INK_COVERAGE_MIN = 0.04;

    private const INK_COVERAGE_MAX = 0.28;

    /** Pixel luminance under which a pixel counts as ink. */
    private const INK_LUMINANCE = 110;

    /**
     * Pass 1 (job): source + ink anchors → black ink with hatching, stored as the "ink" version.
     * Never throws for an API problem: the row records it for the teacher.
     */
    public function runInk(ImageRestyle $row): void
    {
        $subject = $row->subject;
        if ($subject === null) {
            $this->fail($row, new RuntimeException('subject deleted'));

            return;
        }
        $row->update(['status' => ImageRestyle::RUNNING, 'step' => 1]);

        try {
            $source = $this->editable($this->sourceBytes($row->before['path'] ?? null));
            $figure = $subject instanceof SvgAsset;
            $size = $this->sizeFor($source);
            $images = [['bytes' => $source, 'name' => 'source.png'], ...$this->anchors(1, $figure)];
            $prompt = HistoryLineStyle::restyleInk($figure, $this->era($subject));

            $ink = $this->edit($images, $prompt, $size);
            $coverage = $this->inkCoverage($ink);
            if ($coverage < self::INK_COVERAGE_MIN || $coverage > self::INK_COVERAGE_MAX) {
                Log::warning('restyle ink coverage off, retrying once', ['id' => $row->id, 'coverage' => round($coverage, 3)]);
                $ink = $this->edit($images, $prompt, $size);
                $coverage = $this->inkCoverage($ink);
            }
            Log::info('restyle ink done', ['id' => $row->id, 'ink_coverage' => round($coverage, 3)]);

            $row->update(['ink_path' => $this->store($row, $subject, $ink, 'ink', true)]);
            RestyleImage::dispatch($row->id, 2);
        } catch (\Throwable $e) {
            $this->fail($row, $e);
        }
    }

    /** Pass 2 (job): the pass-1 ink + colour anchors + texture anchor → watercolour edited from that ink. Figures get their alpha cut after. */
    public function runColour(ImageRestyle $row): void
    {
        $subject = $row->subject;
        if ($subject === null || ! $row->ink_path) {
            $this->fail($row, new RuntimeException('no ink to colour'));

            return;
        }
        $row->update(['status' => ImageRestyle::RUNNING, 'step' => 2]);

        try {
            $figure = $subject instanceof SvgAsset;
            $ink = Storage::disk('public')->get($row->ink_path);
            $images = [['bytes' => $ink, 'name' => 'ink.png'], ...$this->anchors(2, $figure)];
            $final = $this->edit($images, HistoryLineStyle::restyleColour($figure), $this->sizeFor($ink));
            if ($figure) {
                $final = $this->cutAlpha($final);
            }

            $path = $this->store($row, $subject, $final, 'final', $figure);
            $row->update(['status' => ImageRestyle::READY, 'result_path' => $path, 'error_code' => null, 'error_detail' => null]);
            Log::info('restyle done', ['id' => $row->id, 'user' => $row->user_id, 'api_calls' => 2, 'estimated_usd' => 2 * (float) config('services.openai.restyle_cost_usd')]);
        } catch (\Throwable $e) {
            $this->fail($row, $e);
        }
    }

    public function prompt(Model $subject): string
    {
        return HistoryLineStyle::restyleInk($subject instanceof SvgAsset, $this->era($subject));
    }

    private function era(Model $subject): string
    {
        if ($subject instanceof SvgAsset) {
            return (string) ($subject->era ?? '');
        }

        return $subject instanceof Scene && is_numeric($subject->year) ? 'the year '.(int) $subject->year : '';
    }

    /** @param  list<array{bytes: string, name: string}>  $images */
    private function edit(array $images, string $prompt, string $size): string
    {
        return $this->images->editImages($images, $prompt, $size, false, [
            'quality' => (string) config('services.openai.restyle_quality', 'medium'),
            'input_fidelity' => 'high',
        ]);
    }

    /** @return list<array{bytes: string, name: string}> the shared anchor images for a pass, in attach order */
    private function anchors(int $pass, bool $figure): array
    {
        return array_map(function (string $file) {
            $path = HistoryLineStyle::anchorPath($file);
            if (! is_file($path)) {
                throw new RuntimeException("Restyle: style anchor missing ({$file}).");
            }

            return ['bytes' => (string) file_get_contents($path), 'name' => $file];
        }, HistoryLineStyle::anchors($pass, $figure));
    }

    /** Share of pixels dark enough to count as ink, sampled on a 256px copy. */
    public function inkCoverage(string $bytes): float
    {
        $img = @imagecreatefromstring($bytes);
        if ($img === false) {
            return 0.0;
        }
        $small = imagescale($img, 256) ?: $img;
        $w = imagesx($small);
        $h = imagesy($small);
        $dark = 0;
        for ($y = 0; $y < $h; $y++) {
            for ($x = 0; $x < $w; $x++) {
                $c = imagecolorat($small, $x, $y);
                $lum = (0.299 * (($c >> 16) & 255)) + (0.587 * (($c >> 8) & 255)) + (0.114 * ($c & 255));
                $dark += $lum < self::INK_LUMINANCE ? 1 : 0;
            }
        }

        return $dark / max(1, $w * $h);
    }

    /** Paper white connected to the border becomes transparent; white inside the figure stays. */
    public function cutAlpha(string $bytes): string
    {
        $img = @imagecreatefromstring($bytes);
        if ($img === false) {
            return $bytes;
        }
        $w = imagesx($img);
        $h = imagesy($img);
        $out = imagecreatetruecolor($w, $h);
        imagealphablending($out, false);
        imagesavealpha($out, true);
        imagecopy($out, $img, 0, 0, 0, 0, $w, $h);
        $clear = imagecolorallocatealpha($out, 255, 255, 255, 127);
        $isPaper = fn (int $x, int $y): bool => (($c = imagecolorat($out, $x, $y)) >> 24) < 127
            && (($c >> 16) & 255) >= 225 && (($c >> 8) & 255) >= 225 && ($c & 255) >= 215;

        $seen = [];
        $queue = [];
        $push = function (int $x, int $y) use (&$seen, &$queue, $w, $h, $isPaper): void {
            if ($x < 0 || $y < 0 || $x >= $w || $y >= $h || isset($seen[$y * $w + $x]) || ! $isPaper($x, $y)) {
                return;
            }
            $seen[$y * $w + $x] = true;
            $queue[] = [$x, $y];
        };
        for ($x = 0; $x < $w; $x++) {
            $push($x, 0);
            $push($x, $h - 1);
        }
        for ($y = 0; $y < $h; $y++) {
            $push(0, $y);
            $push($w - 1, $y);
        }
        while ($queue !== []) {
            [$x, $y] = array_pop($queue);
            imagesetpixel($out, $x, $y, $clear);
            $push($x + 1, $y);
            $push($x - 1, $y);
            $push($x, $y + 1);
            $push($x, $y - 1);
        }
        ob_start();
        imagepng($out);

        return (string) ob_get_clean();
    }

    private function fail(ImageRestyle $row, \Throwable $e): void
    {
        Log::error('restyle failed', ['id' => $row->id, 'user' => $row->user_id, 'step' => $row->step, 'error' => $e->getMessage()]);
        $row->update(['status' => ImageRestyle::FAILED, 'error_code' => $this->classify($e->getMessage()), 'error_detail' => mb_substr($e->getMessage(), 0, 2000)]);
    }

    /** Point the subject at the restyled file. The original stays on disk and in `before`. */
    public function keep(ImageRestyle $row): void
    {
        if (! in_array($row->status, [ImageRestyle::READY, ImageRestyle::KEPT], true) || ! $row->result_path) {
            return;
        }
        $subject = $row->subject;
        if ($subject instanceof Scene) {
            $subject->update(['image_path' => $row->result_path]);
        } elseif ($subject instanceof SvgAsset) {
            $subject->update(['svg_path' => $row->result_path, 'cdn_url' => null]);
        }
        $row->update(['status' => ImageRestyle::KEPT]);
    }

    /** Back to the original, any time. The restyle stays available to Keep again. */
    public function revert(ImageRestyle $row): void
    {
        $subject = $row->subject;
        $original = $row->before ?? [];
        if ($subject instanceof Scene) {
            $subject->update(['image_path' => $original['path'] ?? null]);
        } elseif ($subject instanceof SvgAsset) {
            $subject->update(['svg_path' => $original['path'], 'cdn_url' => $original['cdn_url'] ?? null]);
        }
        if ($row->status === ImageRestyle::KEPT) {
            $row->update(['status' => ImageRestyle::READY]);
        }
    }

    /** Undo on a result that was never kept: drop it from view, subject untouched. */
    public function discard(ImageRestyle $row): void
    {
        if ($row->status === ImageRestyle::KEPT) {
            $this->revert($row);
        }
        $row->update(['status' => ImageRestyle::DISCARDED]);
    }

    /** @return array{path: ?string, cdn_url: ?string} */
    private function pointer(Model $subject): array
    {
        return $subject instanceof SvgAsset
            ? ['path' => $subject->svg_path, 'cdn_url' => $subject->cdn_url]
            : ['path' => $subject->image_path, 'cdn_url' => null];
    }

    private function sourceBytes(?string $path): string
    {
        if (! $path) {
            throw new RuntimeException('Restyle: subject has no image.');
        }
        if (str_starts_with($path, '/storage/')) {
            $path = substr($path, strlen('/storage/'));
        }
        if (preg_match('#^https?://#i', $path) === 1) {
            $res = Http::timeout(60)->get($path);
            if (! $res->successful()) {
                throw new RuntimeException("Restyle: source download failed ({$res->status()}).");
            }

            return $res->body();
        }
        $disk = Storage::disk('public');
        if (! $disk->exists($path)) {
            throw new RuntimeException("Restyle: source file missing ({$path}).");
        }

        return $disk->get($path);
    }

    /**
     * The edit endpoint takes PNG, JPEG or WebP. Scene pictures are often AVIF (the CDN format), so
     * anything else is re-encoded to PNG first (GD, else Imagick) rather than sent to fail.
     */
    private function editable(string $bytes): string
    {
        $head = substr($bytes, 0, 12);
        if (str_starts_with($head, "\x89PNG") || str_starts_with($head, "\xFF\xD8") || (str_starts_with($head, 'RIFF') && substr($head, 8, 4) === 'WEBP')) {
            return $bytes;
        }
        if (($img = @imagecreatefromstring($bytes)) !== false) {
            ob_start();
            imagepng($img);

            return (string) ob_get_clean();
        }
        if (class_exists(\Imagick::class)) {
            $im = new \Imagick;
            $im->readImageBlob($bytes);
            $im->setImageFormat('png');

            return $im->getImageBlob();
        }

        throw new RuntimeException('Restyle: cannot decode the source image format.');
    }

    /** The edit API only takes three sizes: pick the one that keeps the picture's orientation. */
    private function sizeFor(string $bytes): string
    {
        $info = @getimagesizefromstring($bytes);
        $ratio = $info && $info[1] > 0 ? $info[0] / $info[1] : 1.5;

        return $ratio > 1.2 ? '1536x1024' : ($ratio < 0.83 ? '1024x1536' : '1024x1024');
    }

    /** Writes one version beside the original: restyle-{id}-ink / restyle-{id}-final. Ink and figures stay PNG (alpha, line fidelity); scene finals go WebP. */
    private function store(ImageRestyle $row, Model $subject, string $bytes, string $label, bool $png): string
    {
        $dir = $subject instanceof Scene
            ? "lessons/{$subject->lesson_id}/scenes/{$subject->id}"
            : 'library/restyles';
        if (! $png && function_exists('imagewebp') && ($img = @imagecreatefromstring($bytes))) {
            ob_start();
            imagewebp($img, null, 82);
            $webp = (string) ob_get_clean();
            if ($webp !== '') {
                $path = "{$dir}/restyle-{$row->id}-{$label}.webp";
                Storage::disk('public')->put($path, $webp);

                return $path;
            }
        }
        $path = "{$dir}/restyle-{$row->id}-{$label}.png";
        Storage::disk('public')->put($path, $bytes);

        return $path;
    }

    private function classify(string $message): string
    {
        $m = strtolower($message);

        return match (true) {
            str_contains($m, 'insufficient_quota'), str_contains($m, 'billing_hard_limit'), str_contains($m, 'exceeded your current quota'), str_contains($m, 'returned 402') => 'credits',
            str_contains($m, 'moderation'), str_contains($m, 'content_policy'), str_contains($m, 'safety system') => 'blocked',
            str_contains($m, 'returned 429'), str_contains($m, 'rate_limit') => 'busy',
            default => 'failed',
        };
    }
}
