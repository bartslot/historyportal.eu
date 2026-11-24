<?php

declare(strict_types=1);

namespace App\Services\Imaging;

use App\Models\ImageRelayRequest;
use Illuminate\Support\Facades\Sleep;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * The server's half of the ChatGPT relay: prod has no ChatGPT, Bart's Mac has it on his subscription. A job that needs
 * a picture files a request and waits; `php artisan chatgpt:relay` on the Mac claims it over the API
 * (ImageRelayController), makes the picture with ChatGPT and posts it back. A request nobody claims within
 * relay_pickup seconds fails: the Mac is off or the command is not running, and the job says so instead of hanging.
 */
final class ImageRelay
{
    private const POLL_MS = 2000;

    /** @param  list<array{bytes: string, name: string}>  $images */
    public function make(string $prompt, string $size, bool $transparent, array $images): string
    {
        // Not claimable until its pictures are on disk: a Mac polling in between would get an edit without its source.
        $row = ImageRelayRequest::create(['status' => ImageRelayRequest::PREPARING, 'prompt' => $prompt, 'size' => $size, 'transparent' => $transparent]);
        $disk = Storage::disk('local');
        $inputs = [];
        foreach (array_values($images) as $i => $image) {
            $inputs[] = $path = $row->dir().'/in-'.($i + 1).'-'.basename($image['name']);
            $disk->put($path, $image['bytes']);
        }
        $row->update(['inputs' => $inputs, 'status' => ImageRelayRequest::QUEUED]);

        $pickup = (int) config('services.image_generation.relay_pickup', 90);
        $wait = (int) config('services.image_generation.relay_wait', 540);
        $started = time();
        try {
            while (true) {
                $row->refresh();
                if ($row->status === ImageRelayRequest::DONE && $row->result_path && $disk->exists($row->result_path)) {
                    return (string) $disk->get($row->result_path);
                }
                if ($row->status === ImageRelayRequest::FAILED) {
                    throw new RuntimeException('ChatGPT on the Mac could not make the picture: '.$row->error);
                }
                $elapsed = time() - $started;
                if ($row->status === ImageRelayRequest::QUEUED && $elapsed >= $pickup) {
                    $row->update(['status' => ImageRelayRequest::FAILED, 'error' => 'not picked up']);
                    throw new RuntimeException('Nobody picked up the picture: ChatGPT on the Mac is off (run `php artisan chatgpt:relay` there).');
                }
                if ($elapsed >= $wait) {
                    $row->update(['status' => ImageRelayRequest::FAILED, 'error' => 'timed out']);
                    throw new RuntimeException("ChatGPT on the Mac did not finish the picture within {$wait} seconds.");
                }
                Sleep::for(self::POLL_MS)->milliseconds();
            }
        } finally {
            $disk->deleteDirectory($row->dir());
        }
    }

    /** The oldest waiting request, now claimed by the caller; null when there is none. */
    public function claim(): ?ImageRelayRequest
    {
        return \Illuminate\Support\Facades\DB::transaction(function () {
            $row = ImageRelayRequest::query()->where('status', ImageRelayRequest::QUEUED)
                ->orderBy('id')->lockForUpdate()->first();
            $row?->update(['status' => ImageRelayRequest::RUNNING, 'claimed_at' => now()]);

            return $row;
        });
    }

    public function finish(ImageRelayRequest $row, string $bytes): void
    {
        $path = $row->dir().'/result.png';
        Storage::disk('local')->put($path, $bytes);
        $row->update(['status' => ImageRelayRequest::DONE, 'result_path' => $path]);
    }

    public function fail(ImageRelayRequest $row, string $error): void
    {
        $row->update(['status' => ImageRelayRequest::FAILED, 'error' => mb_substr($error, 0, 2000)]);
    }
}
