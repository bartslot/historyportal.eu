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
    /** What the last slice() said on stderr: a grid fallback names the figure count it found. '' = cut per figure. */
    public string $lastSliceWarning = '';

    /** Levels + hollowed fills, RGB on white. */
    public function plate(string $bytes): string
    {
        return $this->inTemp(function (string $dir) use ($bytes): string {
            $this->run(['plate', $this->put($dir, 'in.png', $bytes), "{$dir}/out.png"]);

            return (string) file_get_contents("{$dir}/out.png");
        });
    }

    /**
     * Same cleanup; the figure's silhouette is opaque, the outside transparent, cropped to the
     * figure + margin (RGBA). $closed: sides where the model cut the figure off (e.g. ['bottom']),
     * kept shut so an open hem does not turn see-through.
     *
     * @param  list<string>  $closed
     */
    public function cutout(string $bytes, int $margin = 24, array $closed = []): string
    {
        return $this->inTemp(function (string $dir) use ($bytes, $margin, $closed): string {
            $this->run(['cutout', $this->put($dir, 'in.png', $bytes), "{$dir}/out.png",
                '--margin', (string) $margin, '--closed', implode(',', $closed)]);

            return (string) file_get_contents("{$dir}/out.png");
        });
    }

    /**
     * One crop per detected figure ('auto'), falling back to equal cells when the figure count
     * does not match the grid; 'grid' forces equal cells.
     *
     * @return list<string> PNG bytes per cell, reading order
     */
    public function slice(string $bytes, int $rows, int $cols, float $inset = 0.02, string $mode = 'auto'): array
    {
        return $this->inTemp(function (string $dir) use ($bytes, $rows, $cols, $inset, $mode): array {
            $this->lastSliceWarning = $this->run(['slice', $this->put($dir, 'in.png', $bytes), "{$dir}/cells",
                (string) $rows, (string) $cols, '--inset', (string) $inset, '--mode', $mode]);

            return array_map(
                fn (int $i) => (string) file_get_contents("{$dir}/cells/cell_{$i}.png"),
                range(0, $rows * $cols - 1),
            );
        });
    }

    /** @return string stderr of a successful run (warnings) */
    private function run(array $args): string
    {
        $result = Process::timeout(300)->run([
            (string) config('art.python', 'python3'),
            base_path('tools/artkit/lineclean.py'),
            ...$args,
        ]);
        if (! $result->successful()) {
            throw new RuntimeException('lineclean failed: '.trim($result->errorOutput() ?: $result->output()));
        }

        return trim($result->errorOutput());
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
