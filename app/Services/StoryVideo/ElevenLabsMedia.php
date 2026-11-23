<?php

declare(strict_types=1);

namespace App\Services\StoryVideo;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * The ElevenLabs image and video flows (POST /v1/flows/image | /v1/flows/video, then GET /{id} until done).
 *
 * A generation is created once and polled later from a queued job, so no worker sits waiting on a render.
 * Failed generations are not charged (ElevenLabs docs). The key needs the image and video permission,
 * which the narration key does not have: services.elevenlabs.media_api_key (ELEVENLABS_IMAGE_API_KEY).
 */
class ElevenLabsMedia
{
    public const IMAGE = 'image';

    public const VIDEO = 'video';

    public function __construct(
        private readonly string $apiKey = '',
        private readonly string $baseUrl = 'https://api.elevenlabs.io',
    ) {}

    public static function make(): self
    {
        return new self(
            (string) config('services.elevenlabs.media_api_key', ''),
            (string) config('services.elevenlabs.base_url', 'https://api.elevenlabs.io'),
        );
    }

    public function isConfigured(): bool
    {
        return $this->apiKey !== '';
    }

    /**
     * Start a generation. Returns its id; the body is sent as given (the API rejects unknown fields).
     *
     * @param  self::IMAGE|self::VIDEO  $kind
     * @param  array<string,mixed>  $body
     */
    public function create(string $kind, array $body): string
    {
        $this->assertConfigured();
        $response = $this->http()->post("{$this->baseUrl}/v1/flows/{$kind}", $body);
        $id = $response->json('id');
        if (! $response->successful() || ! is_string($id) || $id === '') {
            $code = (string) ($response->json('detail.code') ?? $response->json('code') ?? '');
            throw new ElevenLabsRefused(match (true) {
                $response->status() === 402 || $code === 'paid_plan_required' => 'ElevenLabs needs a Pro plan or above for pictures and video.',
                $code === 'model_access_denied' => 'This ElevenLabs account has no access to the model yet (ByteDance models need approval).',
                in_array($response->status(), [401, 403], true) => 'The ElevenLabs key has no image or video permission.',
                default => "ElevenLabs {$kind} create failed ({$response->status()}): ".mb_substr($response->body(), 0, 300),
            }, $response->status() === 429 || $response->serverError());
        }

        return $id;
    }

    /**
     * Where a generation stands.
     *
     * @param  self::IMAGE|self::VIDEO  $kind
     * @return array{status: string, url: ?string, mime: ?string, error: ?string}
     */
    public function poll(string $kind, string $id): array
    {
        $this->assertConfigured();
        $response = $this->http()->get("{$this->baseUrl}/v1/flows/{$kind}/".rawurlencode($id));
        if ($response->status() === 429 || $response->serverError()) {
            return ['status' => 'pending', 'url' => null, 'mime' => null, 'error' => null];   // ask again later
        }
        if (! $response->successful()) {
            return ['status' => 'failed', 'url' => null, 'mime' => null, 'error' => "poll failed ({$response->status()})"];
        }
        $status = (string) $response->json('status', 'pending');

        return [
            'status' => $status,
            'url' => $status === 'completed' ? (string) $response->json('content_url') : null,
            'mime' => $response->json('content_mime_type'),
            'error' => $status === 'failed'
                ? trim(($response->json('failure_reason') ?? '').': '.($response->json('error_message') ?? ''), ': ')
                : null,
        ];
    }

    /** The finished file's bytes. The signed URL lives about an hour, so this runs right after a completed poll. */
    public function download(string $url): string
    {
        $response = Http::timeout(180)->connectTimeout(10)->get($url);
        if (! $response->successful()) {
            throw new RuntimeException("ElevenLabs download failed ({$response->status()})");
        }

        return $response->body();
    }

    /**
     * A reference picture for a request body.
     *
     * @return array{type: string, content_base64: string, mime_type: string}
     */
    public static function inline(string $bytes, ?string $path = null): array
    {
        $ext = strtolower(pathinfo((string) $path, PATHINFO_EXTENSION));
        $mime = match (true) {
            $ext === 'webp' || str_starts_with($bytes, 'RIFF') => 'image/webp',
            $ext === 'png' || str_starts_with($bytes, "\x89PNG") => 'image/png',
            default => 'image/jpeg',
        };

        return ['type' => 'inline_base64', 'content_base64' => base64_encode($bytes), 'mime_type' => $mime];
    }

    private function http(): \Illuminate\Http\Client\PendingRequest
    {
        return Http::withHeaders(['xi-api-key' => $this->apiKey])->acceptJson()->asJson()->timeout(60)->connectTimeout(5);
    }

    private function assertConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('ELEVENLABS_IMAGE_API_KEY is not set: the story-to-video pipeline needs a key with image and video permission.');
        }
    }
}
