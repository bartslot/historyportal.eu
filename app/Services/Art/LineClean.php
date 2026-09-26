<?php

declare(strict_types=1);

namespace App\Services\Art;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use RuntimeException;

/** Thin wrapper around tools/artkit/lineclean.py: bytes in, cleaned PNG bytes out. */
final class LineClean
{
    /** Levels + hollowed fills, RGB on white. */
    public function plate(string $bytes): string
    {
        return $this->inTemp(function (string $dir) use ($bytes): string {
            $this->run(['plate', $this->put($dir, 'in.png', $bytes), "{$dir}/out.png"]);

            return (string) file_get_contents("{$dir}/out.png");
        });
    }

    /** Same cleanup, outside paper transparent, cropped to the figure + margin (RGBA). */
    public function cutout(string $bytes, int $margin = 24): string
    {
        return $this->inTemp(function (string $dir) use ($bytes, $margin): string {
            $this->run(['cutout', $this->put($dir, 'in.png', $bytes), "{$dir}/out.png", '--margin', (string) $margin]);

            return (string) file_get_contents("{$dir}/out.png");
        });
    }

    /** @return list<string> PNG bytes per cell, reading order */
    public function slice(string $bytes, int $rows, int $cols, float $inset = 0.02): array
    {
        return $this->inTemp(function (string $dir) use ($bytes, $rows, $cols, $inset): array {
            $this->run(['slice', $this->put($dir, 'in.png', $bytes), "{$dir}/cells", (string) $rows, (string) $cols, '--inset', (string) $inset]);

            return array_map(
                fn (int $i) => (string) file_get_contents("{$dir}/cells/cell_{$i}.png"),
                range(0, $rows * $cols - 1),
            );
        });
    }

    private function run(array $args): void
    {
        $result = Process::timeout(300)->run([
            (string) config('art.python', 'python3'),
            base_path('tools/artkit/lineclean.py'),
            ...$args,
        ]);
        if (! $result->successful()) {
            throw new RuntimeException('lineclean failed: '.trim($result->errorOutput() ?: $result->output()));
        }
    }

    /**
     * @template T
     *
     * @param  callable(string): T  $work
     * @return T
     */
    private function inTemp(callable $work): mixed
    {
        $dir = storage_path('app/tmp/art/'.Str::random(16));
        File::ensureDirectoryExists($dir);
        try {
            return $work($dir);
        } finally {
            File::deleteDirectory($dir);
        }
    }

    private function put(string $dir, string $name, string $bytes): string
    {
        file_put_contents("{$dir}/{$name}", $bytes);

        return "{$dir}/{$name}";
    }
}
