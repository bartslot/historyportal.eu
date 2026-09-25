<?php

declare(strict_types=1);

namespace App\Services\Art;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * The one fal.ai client for art (history-line). Every call is priced and recorded in the ledger
 * BEFORE it is sent, so the global budget and the per-command cap hold across processes.
 */
final class FalImageService
{
    private const QUEUE_URL = 'https://queue.fal.run/';

    private const ASPECT_RATIOS = ['1:1' => 1.0, '4:3' => 4 / 3, '3:4' => 3 / 4, '16:9' => 16 / 9, '9:16' => 9 / 16, '21:9' => 21 / 9];

    private ?float $runCap = null;

    private float $runSpent = 0.0;

    public function __construct(private readonly FalLedger $ledger) {}

    /** Per-command cap (--max-usd). Call once at the start of a command. */
    public function capRun(?float $usd): self
    {
        $this->runCap = $usd;
        $this->runSpent = 0.0;

        return $this;
    }

    /** Text → image. Returns image bytes. */
    public function generate(string $model, string $prompt, int $w, int $h, string $purpose, array $meta = [], array $extra = []): string
    {
        $input = array_merge(['prompt' => $prompt, 'num_images' => 1], $this->sizeInput($model, $w, $h), $extra);

        return $this->firstImage($this->run($model, $input, $purpose, $meta));
    }

    /**
     * Image(s) + prompt → image. $refs: file paths, raw bytes, or https URLs, in order.
     * Returns image bytes.
     */
    public function edit(string $model, string $prompt, array $refs, int $w, int $h, string $purpose, array $meta = [], array $extra = []): string
    {
        if ($refs === []) {
            throw new RuntimeException('edit() needs at least one reference image.');
        }
        $input = array_merge(
            ['prompt' => $prompt, 'image_urls' => array_map(fn (string $r) => $this->asUrl($r), array_values($refs)), 'num_images' => 1],
            $this->sizeInput($model, $w, $h),
            $extra,
        );

        return $this->firstImage($this->run($model, $input, $purpose, $meta));
    }

    /** Estimated USD for n images on a model, without calling anything. */
    public function estimate(string $model, int $images = 1): float
    {
        return $this->ledger->priceFor($model) * $images;
    }

    public function run(string $model, array $input, string $purpose, array $meta = []): array
    {
        $key = (string) config('services.falai.api_key');
        if ($key === '') {
            throw new RuntimeException('FAL_AI_KEY is not set.');
        }
        $usd = $this->estimate($model, max(1, (int) ($input['num_images'] ?? 1)));
        $this->ledger->assertAffordable($usd, $this->runCap, $this->runSpent);

        $entry = $this->ledger->open($model, $purpose, $usd, $meta + [
            'prompt_hash' => hash('sha256', (string) ($input['prompt'] ?? '')),
            'refs' => count($input['image_urls'] ?? []),
        ]);
        $this->runSpent += $usd;

        try {
            $http = Http::withHeaders(['Authorization' => 'Key '.$key])->acceptJson()->timeout(60);
            $submit = $http->post(self::QUEUE_URL.$model, $input)->throw()->json();
            $entry->update(['request_id' => $submit['request_id'] ?? null]);

            $this->waitUntilCompleted($http, (string) $submit['status_url'], $model);

            $out = $http->get((string) $submit['response_url'])->throw()->json();
            $this->ledger->complete($entry);

            return $out;
        } catch (\Throwable $e) {
            $this->ledger->fail($entry, $e->getMessage());
            throw $e;
        }
    }

    private function waitUntilCompleted(\Illuminate\Http\Client\PendingRequest $http, string $statusUrl, string $model): void
    {
        $timeout = (int) config('art.timeout', 300);
        $deadline = time() + $timeout;
        while ($http->get($statusUrl)->throw()->json('status') !== 'COMPLETED') {
            if (time() > $deadline) {
                throw new RuntimeException("fal timeout after {$timeout}s for {$model}");
            }
            sleep((int) config('art.poll_seconds', 2));
        }
    }

    private function sizeInput(string $model, int $w, int $h): array
    {
        $mode = (config('art.size_param') ?? [])[$model] ?? 'image_size';
        if ($mode !== 'aspect_ratio') {
            return ['image_size' => ['width' => $w, 'height' => $h]];
        }
        $target = $w / max(1, $h);
        $ratios = self::ASPECT_RATIOS;
        uasort($ratios, fn (float $a, float $b) => abs($a - $target) <=> abs($b - $target));

        return ['aspect_ratio' => array_key_first($ratios)];
    }

    private function asUrl(string $ref): string
    {
        if (str_starts_with($ref, 'https://') || str_starts_with($ref, 'data:')) {
            return $ref;
        }
        if (strlen($ref) < 4096 && ! str_contains($ref, "\0") && is_file($ref)) {
            $ref = (string) file_get_contents($ref);
        }
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($ref) ?: 'image/png';

        return 'data:'.$mime.';base64,'.base64_encode($ref);
    }

    private function firstImage(array $out): string
    {
        $url = $out['images'][0]['url'] ?? null;
        if (! is_string($url) || $url === '') {
            throw new RuntimeException('fal returned no image.');
        }
        if (str_starts_with($url, 'data:')) {
            return (string) base64_decode(substr($url, strpos($url, ',') + 1));
        }

        return Http::timeout(120)->get($url)->throw()->body();
    }
}
