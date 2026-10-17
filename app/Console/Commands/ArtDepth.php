<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Process;
use Symfony\Component\Finder\Finder;

/**
 * A depth map for every library backdrop that has none: <name>.depth.webp beside <name>.webp,
 * written by tools/artkit/depth/depth_map.py (Depth Anything V2 Small, local, CPU or MPS).
 *
 * Run it on a machine with Python, never on the server: SiteGround cannot run Python. The depth
 * files are committed beside the art and shipped like it; `icons:import` records them on the
 * picture's row and the player only reads them (occlusion, the editor's "fit to this spot").
 *
 * One picture per Python run, so the model's memory is handed back between pictures.
 */
class ArtDepth extends Command
{
    protected $signature = 'art:depth
        {collection : the library collection, e.g. history-line}
        {--only= : only backdrops whose path under backdrops/ contains this, e.g. tasman or tasman/deck_}';

    protected $description = 'Write a depth map beside every library backdrop that lacks one (local, Python)';

    /** One picture through Depth Anything on a laptop CPU takes well under this. */
    private const TIMEOUT_S = 600;

    public function handle(): int
    {
        $dir = config('art.library_path').'/'.$this->argument('collection').'/backdrops';
        if (! is_dir($dir)) {
            $this->error("No backdrops at {$dir}.");

            return self::FAILURE;
        }

        $only = (string) $this->option('only');
        $todo = collect(Finder::create()->files()->in($dir)->name(['*.webp', '*.png'])->notName('*.depth.*')->sortByName())
            ->filter(fn ($f) => $only === '' || str_contains(str_replace('\\', '/', $f->getRelativePathname()), $only))
            ->filter(fn ($f) => ! is_file($f->getPath().'/'.$f->getFilenameWithoutExtension().'.depth.webp'))
            ->values();

        if ($todo->isEmpty()) {
            $this->info('Every backdrop already has a depth map.');

            return self::SUCCESS;
        }

        $failed = 0;
        foreach ($todo as $file) {
            $run = Process::timeout(self::TIMEOUT_S)->run([
                (string) config('art.python'), base_path('tools/artkit/depth/depth_map.py'), $file->getPathname(),
            ]);
            if ($run->failed()) {
                $failed++;
                $this->warn("  {$file->getRelativePathname()}: ".trim($run->errorOutput() ?: $run->output()));

                continue;
            }
            $this->line("  {$file->getRelativePathname()}");
        }

        $made = $todo->count() - $failed;
        $this->info("Wrote {$made} depth map(s)".($failed ? ", {$failed} failed" : '').'. Commit them beside the art, then run icons:import.');

        return $failed ? self::FAILURE : self::SUCCESS;
    }
}
