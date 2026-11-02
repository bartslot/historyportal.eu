<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Scene;
use App\Services\Stage25d\LayerKeys;
use Illuminate\Console\Command;

class KeyStage25dFigures extends Command
{
    protected $signature = 'lessons:keys-25d {lesson? : Lesson id (default: every lesson)} {--dry-run : Report, write nothing}';

    protected $description = 'Turn the director\'s figure motion tracks of stage25d scenes into keys on the figure layers (flat tracks are dropped; safe to repeat)';

    public function handle(): int
    {
        $scenes = Scene::query()->where('kind', 'stage25d')
            ->when($this->argument('lesson'), fn ($q, $id) => $q->where('lesson_id', (int) $id))
            ->orderBy('id')->get();
        $total = ['converted' => 0, 'flat' => 0, 'unmatched' => 0];
        $touched = 0;
        foreach ($scenes as $scene) {
            $config = $scene->config ?? [];
            if (! is_array($config['stage25d'] ?? null)) {
                continue;
            }
            [$stage, $r] = LayerKeys::fromMotion($config['stage25d']);
            foreach ($r as $k => $n) {
                $total[$k] += $n;
            }
            if ($stage === $config['stage25d']) {
                continue;
            }
            $touched++;
            if (! $this->option('dry-run')) {
                $scene->update(['config' => [...$config, 'stage25d' => $stage]]);
            }
        }
        $this->info(($this->option('dry-run') ? '[dry run] ' : '')."{$touched} of {$scenes->count()} scenes changed: {$total['converted']} tracks keyed, {$total['flat']} flat dropped, {$total['unmatched']} unmatched kept");

        return self::SUCCESS;
    }
}
