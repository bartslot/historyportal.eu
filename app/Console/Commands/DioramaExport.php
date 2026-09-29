<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Scene;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Print or write a scene's diorama JSON, for AI agents and JEV to read and edit.
 *
 *   php artisan diorama:export 812                     # print
 *   php artisan diorama:export 812 --out=scene.json    # write a file
 *
 * Edit it, then `php artisan diorama:import 812 scene.json`. Format: docs/diorama-example.json.
 */
class DioramaExport extends Command
{
    protected $signature = 'diorama:export
        {scene : Scene id}
        {--out= : Write to this file instead of printing}';

    protected $description = "Export a scene's diorama JSON (where what is)";

    public function handle(): int
    {
        $scene = Scene::find((int) $this->argument('scene'));
        if (! $scene) {
            $this->error("No scene with id {$this->argument('scene')}.");

            return self::FAILURE;
        }
        if (! $scene->isDiorama()) {
            $this->error("Scene {$scene->id} is not a diorama yet; import one with diorama:import.");

            return self::FAILURE;
        }

        $json = json_encode($scene->config['diorama'], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION)."\n";

        $out = $this->option('out');
        if ($out) {
            File::put($out, $json);
            $this->info("Wrote {$out}.");
        } else {
            $this->output->write($json);
        }

        return self::SUCCESS;
    }
}
