<?php

declare(strict_types=1);

namespace App\Services\Imaging;

use App\Services\Local\LocalChatGpt;
use Illuminate\Support\Facades\File;
use RuntimeException;

/**
 * Where an AI picture is made: config services.image_generation.driver. OpenAiImageService asks this first and only
 * calls the paid API itself when the driver is "openai". Bart, 2026-11-21: "Generate image with AI is credit based and
 * should be sent to local chatgpt".
 */
final class ImageRoute
{
    public const OPENAI = 'openai';

    public const LOCAL = 'chatgpt_local';

    public const RELAY = 'chatgpt_relay';

    public function __construct(private readonly LocalChatGpt $chatgpt, private readonly ImageRelay $relay) {}

    public static function driver(): string
    {
        return (string) config('services.image_generation.driver', self::OPENAI);
    }

    public static function usesOpenAi(): bool
    {
        return self::driver() === self::OPENAI;
    }

    /** Seconds ChatGPT on this Mac may take for one picture (LocalChatGpt::picture). */
    private const LOCAL_SECONDS = 600;

    /**
     * A job's timeout when it makes `$pictures` pictures one after another: ChatGPT takes longer than the paid API,
     * locally (LOCAL_SECONDS each) and through the relay (relay_wait each). On prod DB_QUEUE_RETRY_AFTER must stay above
     * it, or a still-running job is started a second time.
     */
    public static function jobTimeout(int $openAi, int $pictures = 1): int
    {
        $each = match (self::driver()) {
            self::RELAY => (int) config('services.image_generation.relay_wait', 540),
            self::LOCAL => self::LOCAL_SECONDS,
            default => 0,
        };

        return $each === 0 ? $openAi : max($openAi, $pictures * $each + 60);
    }

    /**
     * One picture, PNG bytes: a new one from the prompt, or `$images` edited (the first is changed, the rest are
     * references).
     *
     * @param  list<array{bytes: string, name: string}>  $images
     */
    public function make(string $prompt, string $size, bool $transparent = false, array $images = []): string
    {
        return match (self::driver()) {
            self::LOCAL => $this->local($prompt, $size, $transparent, $images),
            self::RELAY => $this->relay->make($prompt, $size, $transparent, $images),
            default => throw new RuntimeException('Unknown image driver: '.self::driver()),
        };
    }

    /** @param  list<array{bytes: string, name: string}>  $images */
    private function local(string $prompt, string $size, bool $transparent, array $images): string
    {
        if (! LocalChatGpt::available()) {
            throw new RuntimeException('ChatGPT is not available on this machine (the ChatGPT app with its Codex CLI is needed).');
        }
        $dir = storage_path('app/chatgpt-local/in-'.bin2hex(random_bytes(6)));
        File::ensureDirectoryExists($dir);
        try {
            $paths = [];
            foreach (array_values($images) as $i => $image) {
                $paths[] = $path = $dir.'/'.($i + 1).'-'.basename($image['name']);
                file_put_contents($path, $image['bytes']);
            }

            return $this->chatgpt->picture($prompt, $size, $transparent, $paths);
        } finally {
            File::deleteDirectory($dir);
        }
    }
}
