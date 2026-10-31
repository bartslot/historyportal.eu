<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Stage25d\LibraryBundle;
use Illuminate\Console\Command;
use InvalidArgumentException;

class SyncLibraryBundle extends Command
{
    protected $signature = 'library:sync {dir : Folder with library.json and its images (e.g. ~/BartsMedia/historyportal/library/nl-prehistory)}
        {--bundle= : Bundle name on the server (default: "bundle" in library.json, else the folder name)}';

    protected $description = 'Copy a 2.5D stage library bundle to storage/app/public/library/<bundle> (checked first, unchanged files skipped)';

    public function handle(LibraryBundle $bundles): int
    {
        try {
            $r = $bundles->sync((string) $this->argument('dir'), $this->option('bundle') ?: null);
        } catch (InvalidArgumentException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }
        $this->info("Bundle {$r['bundle']}: {$r['copied']} copied, {$r['skipped']} unchanged -> ".LibraryBundle::url($r['bundle']));

        return self::SUCCESS;
    }
}
