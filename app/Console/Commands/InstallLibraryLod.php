<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Stage25d\LibraryBundle;
use Illuminate\Console\Command;
use InvalidArgumentException;

class InstallLibraryLod extends Command
{
    protected $signature = 'library:lod {bundle? : Bundle name (default: every bundle on the disk)}';

    protected $description = 'Put the far, low-detail copies of the 2.5D library (resources/library-lod) beside each bundle and name them in its library.json (safe to repeat; run on deploy)';

    public function handle(LibraryBundle $bundles): int
    {
        $names = $this->argument('bundle') ? [(string) $this->argument('bundle')] : LibraryBundle::names();
        foreach ($names as $bundle) {
            try {
                $r = $bundles->installLod($bundle);
            } catch (InvalidArgumentException $e) {
                $this->error($e->getMessage());

                return self::FAILURE;
            }
            $this->info("{$bundle}: {$r['copied']} copied, {$r['skipped']} unchanged, {$r['named']} named");
        }

        return self::SUCCESS;
    }
}
