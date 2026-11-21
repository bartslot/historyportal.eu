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

    /** A job that may wait on the Mac needs the relay's wait plus room for its own work. */
    public static function jobTimeout(int $openAi): int
    {
        return self::driver() === self::RELAY ? max($openAi, (int) config('services.image_generation.relay_wait', 540) + 60) : $openAi;
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
