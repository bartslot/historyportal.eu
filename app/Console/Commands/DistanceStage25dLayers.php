<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Scene;
use App\Services\Stage25d\GroundDistance;
use Illuminate\Console\Command;

class DistanceStage25dLayers extends Command
{
    protected $signature = 'lessons:distance-25d {lesson? : Lesson id (default: every lesson)} {--dry-run : Report, write nothing}';

    protected $description = 'Give the ground pictures of stage25d scenes their distance in metres (from their depth band: no visual change; safe to repeat)';

    public function handle(): int
    {
        $scenes = Scene::query()->where('kind', 'stage25d')
            ->when($this->argument('lesson'), fn ($q, $id) => $q->where('lesson_id', (int) $id))
            ->orderBy('id')->get();
        $total = ['filled' => 0, 'skipped' => 0];
        $touched = 0;
        foreach ($scenes as $scene) {
            $config = $scene->config ?? [];
            if (! is_array($config['stage25d'] ?? null)) {
                continue;
            }
            [$stage, $r] = GroundDistance::fill($config['stage25d']);
            foreach ($r as $k => $n) {
                $total[$k] += $n;
            }
            if ($stage === $config['stage25d']) {
                continue;
            }
            $touched++;
            if (! $this->option('dry-run')) {
                // Quietly: no undo step; the scene looks exactly as before.
                $scene->updateQuietly(['config' => [...$config, 'stage25d' => $stage]]);
            }
        }
        $this->info(($this->option('dry-run') ? '[dry run] ' : '')."{$touched} of {$scenes->count()} scenes changed: {$total['filled']} layers given a distance, {$total['skipped']} backdrops and sky pictures kept");

        return self::SUCCESS;
    }
}
