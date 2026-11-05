<?php

declare(strict_types=1);

namespace App\Services\Local;

use Illuminate\Support\Facades\File;

/** The spark edits in flight: one folder per edit, its state in a file, so the detached command and the page share it. */
final class SparkJobs
{
    public const RUNNING = 'running';

    public const DONE = 'done';

    public const FAILED = 'failed';

    public static function dir(string $id): string
    {
        return storage_path('app/chatgpt-local/'.$id);
    }

    /** @return array<string,mixed>|null null for anything that is not a job of ours */
    public static function read(string $id): ?array
    {
        if (! preg_match('/^spark-[a-f0-9]{24}$/', $id) || ! is_file(self::dir($id).'/job.json')) {
            return null;
        }

        return json_decode((string) file_get_contents(self::dir($id).'/job.json'), true) ?: null;
    }

    /** @param array<string,mixed> $fields */
    public static function write(string $id, array $fields): void
    {
        File::ensureDirectoryExists(self::dir($id));
        $tmp = self::dir($id).'/job.tmp';
        file_put_contents($tmp, json_encode([...(self::read($id) ?? []), ...$fields]));
        rename($tmp, self::dir($id).'/job.json');   // whole or not at all: the page reads it while the command writes
    }

    /** Every edit still on disk. @return list<string> */
    public static function ids(): array
    {
        return array_values(array_filter(array_map('basename', glob(storage_path('app/chatgpt-local/spark-*')) ?: []), fn (string $id) => self::read($id) !== null));
    }

    public static function newId(): string
    {
        return 'spark-'.bin2hex(random_bytes(12));
    }

    public static function forget(string $id): void
    {
        if (self::read($id) !== null) {
            File::deleteDirectory(self::dir($id));
        }
    }
}
