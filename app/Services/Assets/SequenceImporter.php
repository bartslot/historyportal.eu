<?php

declare(strict_types=1);

namespace App\Services\Assets;

use App\Models\SvgAsset;
use App\Services\Jev\JevClient;
use GdImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use InvalidArgumentException;

/**
 * Imports an image sequence from the art pipeline as ONE animated library asset (Bart, 2026-09-29).
 *
 * Files are named `<name>_<clip>_<number>.png|webp`, e.g. sailor_walk_0001.png … sailor_wave_0012.png:
 * one asset, several clips, frames in NUMERIC order (never alphabetical: _10 after _9). The frames
 * share one crop (the union of their drawn pixels), so the feet stay on one line, and are packed
 * side by side into one WebP sprite sheet. Walk clips step once per stride on the floor, so the
 * feet never slide; every other clip plays at a frame rate. JEV picks the real height.
 */
final class SequenceImporter
{
    /** Clips that move the figure over the floor: their frames follow distance, not time. */
    public const WALK_CLIPS = ['walk', 'run'];

    public const DEFAULT_FPS = 12;

    /** One full walk cycle is two steps, about 0.83 × a person's height. A starting value. */
    public const STRIDE_PER_HEIGHT = 0.83;

    /** Heights JEV chooses from, in metres: small props to a tall tree. */
    public const HEIGHT_LADDER = [0.3, 0.5, 0.8, 1.0, 1.2, 1.4, 1.55, 1.65, 1.75, 1.9, 2.2, 2.6, 3.2, 4.0, 6.0, 9.0, 14.0, 20.0];

    public const CATEGORIES = ['figures', 'nature', 'architecture', 'props'];

    private const MAX_FRAME_H = 1024;

    /** WebP is limited to 16383 px a side; the sheet's frames stand side by side. */
    private const MAX_SHEET_W = 16000;

    /** GD alpha runs 0 (opaque) … 127 (clear); a pixel is drawn below this. */
    private const DRAWN_GD_ALPHA = 115;

    private const PATTERN = '/^(?<name>.+)_(?<clip>[^_]+)_(?<n>\d+)\.(?:png|webp)$/i';

    public function __construct(private readonly JevClient $jev) {}

    /**
     * The import plan from the file names alone: the asset name and, per clip, the files in frame
     * order. Every problem is named, so the fix is obvious.
     *
     * @param  list<string>  $names
     * @return array{name: string, clips: array<string, list<int>>}
     */
    public static function plan(array $names): array
    {
        if ($names === []) {
            throw new InvalidArgumentException(__('Choose the frames of one animation.'));
        }
        $parsed = [];
        foreach ($names as $i => $file) {
            if (! preg_match(self::PATTERN, basename($file), $m)) {
                throw new InvalidArgumentException(__(':file is not named name_clip_0001.png.', ['file' => basename($file)]));
            }
            $parsed[$i] = [Str::lower($m['name']), Str::lower($m['clip']), (int) $m['n']];
        }
        // Two assets first: their frames would otherwise read as duplicates of each other.
        $assetNames = array_unique(array_column($parsed, 0));
        if (count($assetNames) > 1) {
            throw new InvalidArgumentException(__('These frames belong to more than one asset: :names.', ['names' => implode(', ', $assetNames)]));
        }
        $numbers = [];
        foreach ($parsed as $i => [, $clip, $n]) {
            if (isset($numbers[$clip][$n])) {
                throw new InvalidArgumentException(__('Frame :n of :clip is there twice.', ['n' => $n, 'clip' => $clip]));
            }
            $numbers[$clip][$n] = $i;
        }

        $clips = [];
        foreach ($numbers as $clip => $byNumber) {
            ksort($byNumber, SORT_NUMERIC);
            $expected = range(array_key_first($byNumber), array_key_last($byNumber));
            $missing = array_diff($expected, array_keys($byNumber));
            if ($missing !== []) {
                throw new InvalidArgumentException(__(':clip is missing frame :n.', ['clip' => $clip, 'n' => implode(', ', $missing)]));
            }
            $clips[$clip] = array_values($byNumber);
        }
        ksort($clips);

        return ['name' => reset($assetNames), 'clips' => $clips];
    }

    /**
     * @param  list<UploadedFile>  $files
     */
    public function import(array $files, string $description, string $category): SvgAsset
    {
        if (! in_array($category, self::CATEGORIES, true)) {
            throw new InvalidArgumentException(__('Pick where the asset belongs.'));
        }
        if (trim($description) === '') {
            throw new InvalidArgumentException(__('Say what it is: JEV needs that to pick its height.'));
        }
        $plan = self::plan(array_map(fn (UploadedFile $f) => $f->getClientOriginalName(), $files));

        $order = array_merge(...array_values($plan['clips']));
        $frames = array_map(fn (int $i) => $this->load($files[$i]), $order);
        [$w, $h] = [imagesx($frames[0]), imagesy($frames[0])];
        foreach ($frames as $frame) {
            if (imagesx($frame) !== $w || imagesy($frame) !== $h) {
                throw new InvalidArgumentException(__('Every frame must be the same size.'));
            }
        }

        $box = $this->drawnUnion($frames);
        $sheetBytes = $this->sheet($frames, $box, $frameW, $frameH);
        $heightM = $this->height($description, $plan);

        $anims = [];
        $index = 0;
        foreach ($plan['clips'] as $clip => $files) {
            $range = range($index, $index + count($files) - 1);
            $anims[$clip] = in_array($clip, self::WALK_CLIPS, true)
                ? ['frames' => $range, 'stride_m' => round(self::STRIDE_PER_HEIGHT * $heightM, 2)]
                : ['frames' => $range, 'fps' => self::DEFAULT_FPS];
            $index += count($files);
        }

        $slug = Str::slug($plan['name']);
        $path = "svg-assets/sequences/{$slug}.webp";
        Storage::disk('public')->put($path, $sheetBytes);
        $ref = "history-line/sequences/{$slug}";

        $asset = SvgAsset::query()->whereNull('user_id')->where('source', 'sequence')->where('source_ref', $ref)->first()
            ?? new SvgAsset(['user_id' => null, 'source' => 'sequence', 'source_ref' => $ref]);
        $asset->fill([
            'source_url' => '', 'title' => Str::ucfirst(str_replace(['-', '_'], ' ', $plan['name'])),
            'license' => 'Royalty-free (commercial)', 'collection' => 'history-line', 'category' => $category,
            'subcategory' => null, 'svg_path' => $path, 'cdn_url' => null,
            'width' => $frameW * count($frames), 'height' => $frameH,
            'description' => trim($description), 'placement' => 'stands', 'height_m' => $heightM,
            'opaque_box' => [0.0, 0.0, 1.0, 1.0],   // the frames are cropped to their drawn union
            'sheet' => ['frames' => count($frames), 'anims' => $anims],
        ])->save();

        return $asset;
    }

    private function load(UploadedFile $file): GdImage
    {
        $bytes = (string) file_get_contents($file->getRealPath());
        $img = @imagecreatefromstring($bytes);
        if (! $img instanceof GdImage) {
            throw new InvalidArgumentException(__(':file is not a readable image.', ['file' => $file->getClientOriginalName()]));
        }
        imagealphablending($img, false);
        imagesavealpha($img, true);

        return $img;
    }

    /**
     * The box that holds every frame's drawn pixels, as [x0, y0, x1, y1) in pixels. Scanned on a
     * small copy (max 256 px a side) and widened by one small-copy pixel, so the scan stays fast
     * and never cuts a line off.
     *
     * @param  list<GdImage>  $frames
     * @return array{int, int, int, int}
     */
    private function drawnUnion(array $frames): array
    {
        [$w, $h] = [imagesx($frames[0]), imagesy($frames[0])];
        $k = min(1, 256 / max($w, $h));
        [$sw, $sh] = [max(1, (int) round($w * $k)), max(1, (int) round($h * $k))];
        $box = [$sw, $sh, 0, 0];
        foreach ($frames as $frame) {
            $small = imagecreatetruecolor($sw, $sh);
            imagealphablending($small, false);
            imagesavealpha($small, true);
            imagefill($small, 0, 0, imagecolorallocatealpha($small, 0, 0, 0, 127));
            imagecopyresampled($small, $frame, 0, 0, 0, 0, $sw, $sh, $w, $h);
            for ($y = 0; $y < $sh; $y++) {
                for ($x = 0; $x < $sw; $x++) {
                    if (((imagecolorat($small, $x, $y) >> 24) & 0x7F) <= self::DRAWN_GD_ALPHA) {
                        $box = [min($box[0], $x), min($box[1], $y), max($box[2], $x + 1), max($box[3], $y + 1)];
                    }
                }
            }
        }
        if ($box[2] <= $box[0]) {
            throw new InvalidArgumentException(__('The frames are empty: nothing is drawn in them.'));
        }

        return [
            max(0, (int) floor(($box[0] - 1) / $k)), max(0, (int) floor(($box[1] - 1) / $k)),
            min($w, (int) ceil(($box[2] + 1) / $k)), min($h, (int) ceil(($box[3] + 1) / $k)),
        ];
    }

    /**
     * Every frame cropped to `$box`, scaled to fit the sheet limits, side by side, as WebP q80.
     *
     * @param  list<GdImage>  $frames
     * @param  array{int, int, int, int}  $box
     */
    private function sheet(array $frames, array $box, ?int &$frameW, ?int &$frameH): string
    {
        [$bw, $bh] = [$box[2] - $box[0], $box[3] - $box[1]];
        $s = min(1, self::MAX_FRAME_H / $bh, (self::MAX_SHEET_W / count($frames)) / $bw);
        [$frameW, $frameH] = [max(1, (int) round($bw * $s)), max(1, (int) round($bh * $s))];

        $sheet = imagecreatetruecolor($frameW * count($frames), $frameH);
        imagealphablending($sheet, false);
        imagesavealpha($sheet, true);
        imagefill($sheet, 0, 0, imagecolorallocatealpha($sheet, 0, 0, 0, 127));
        foreach ($frames as $i => $frame) {
            imagecopyresampled($sheet, $frame, $i * $frameW, 0, $box[0], $box[1], $frameW, $frameH, $bw, $bh);
        }
        ob_start();
        imagewebp($sheet, null, 80);

        return (string) ob_get_clean();
    }

    /** @param  array{name: string, clips: array<string, list<int>>}  $plan */
    private function height(string $description, array $plan): float
    {
        $fmt = fn (float $h) => rtrim(rtrim(number_format($h, 2, '.', ''), '0'), '.');
        $state = 'History Portal, a history comic for children. A drawing from our art pipeline is placed in 3D '
            .'scenes at its real size. It is an animation ('.implode(', ', array_keys($plan['clips'])).'). '
            .'People in medieval and early modern Europe: men about 1.65-1.70 m, women about 1.55-1.60 m.';
        $answer = $this->jev->choose($state, ['height' => [
            'instructions' => "The drawing: {$description} How tall is it from the ground to its highest drawn point?",
            'criteria' => collect(self::HEIGHT_LADDER)->mapWithKeys(fn (float $h) => [$fmt($h) => "About {$fmt($h)} m tall."])->all(),
        ]]);
        $choice = $answer['height']['choice'] ?? null;
        if (! is_numeric($choice)) {
            throw new InvalidArgumentException(__('JEV gave no height. Try again.'));
        }

        return (float) $choice;
    }
}
