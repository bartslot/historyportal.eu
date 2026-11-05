<?php

declare(strict_types=1);

namespace App\Services\Local;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use RuntimeException;

/**
 * ChatGPT on this machine: the Codex CLI inside the ChatGPT app, on the logged-in subscription, not the paid API. The
 * same route as the chatgpt MCP (workflows/historyportal-mcp/chatgpt_mcp.py). It exists on a developer's Mac only:
 * prod has no ChatGPT app, and a subscription is not there to serve other people, so available() is false everywhere else.
 */
final class LocalChatGpt
{
    private const IMAGE_SUFFIXES = ['png', 'jpg', 'jpeg', 'webp'];

    public static function available(): bool
    {
        return (bool) config('services.chatgpt_local.enabled') && is_executable(self::bin());
    }

    /** One answer in text. */
    public function text(string $system, string $user, int $timeout = 300): string
    {
        $dir = $this->workdir();
        try {
            return $this->run(trim($system."\n\n".$user), [], $dir, $timeout);
        } finally {
            File::deleteDirectory($dir);
        }
    }

    /**
     * Image 1 changed as `$instruction` asks, saved at `$out`. A picture with a transparent background asks for one back.
     *
     * @throws RuntimeException when ChatGPT is closed, over its limit, or makes no picture
     */
    public function editImage(string $source, string $instruction, string $out, bool $transparent, int $timeout = 600): void
    {
        $dir = $this->workdir();
        try {
            $name = 'result.png';
            $prompt = 'Edit image 1. Change only what is asked below and keep everything else (composition, camera, style, '
                ."colours, every object and person) exactly as it is.\n\n{$instruction}\n\n"
                ."Generate the image and save it in the current folder as {$name}.".($transparent ? ' Transparent background (PNG with alpha).' : '');
            $reply = $this->run($prompt, [$source], $dir, $timeout);
            $made = collect(File::allFiles($dir))->first(fn ($f) => in_array(strtolower($f->getExtension()), self::IMAGE_SUFFIXES, true));
            if ($made === null) {
                throw new RuntimeException('ChatGPT made no picture: '.mb_substr($reply, 0, 300));
            }
            File::ensureDirectoryExists(dirname($out));
            File::copy($made->getPathname(), $out);
        } finally {
            File::deleteDirectory($dir);
        }
    }

    /** The answer of one `codex exec`: the prompt goes on stdin, because -i takes several values and would swallow it. */
    private function run(string $prompt, array $images, string $dir, int $timeout): string
    {
        $cmd = [self::bin(), 'exec', '--skip-git-repo-check', '-s', 'workspace-write', '-C', $dir];
        foreach ($images as $image) {
            array_push($cmd, '-i', $image);
        }
        $result = Process::timeout($timeout)->input($prompt)->run($cmd);
        if (! $result->successful()) {
            $tail = implode("\n", array_slice(explode("\n", trim($result->output()."\n".$result->errorOutput())), -12));
            throw new RuntimeException("ChatGPT failed (exit {$result->exitCode()}): {$tail}");
        }

        return self::replyOf($result->output());
    }

    /** The final message: after the last line that is exactly "codex", before "tokens used". */
    public static function replyOf(string $output): string
    {
        $lines = preg_split('/\R/', $output) ?: [];
        $last = null;
        foreach ($lines as $i => $line) {
            if (trim($line) === 'codex') {
                $last = $i;
            }
        }
        $tail = $last === null ? array_slice($lines, -40) : array_slice($lines, $last + 1);
        $kept = [];
        foreach ($tail as $line) {
            if (str_starts_with(strtolower(trim($line)), 'tokens used')) {
                break;
            }
            $kept[] = $line;
        }

        return trim(implode("\n", $kept));
    }

    private function workdir(): string
    {
        $dir = storage_path('app/chatgpt-local/run-'.bin2hex(random_bytes(6)));
        File::ensureDirectoryExists($dir);

        return $dir;
    }

    private static function bin(): string
    {
        return (string) config('services.chatgpt_local.bin');
    }
}
