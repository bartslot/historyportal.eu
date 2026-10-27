<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Lesson;
use App\Models\SvgAsset;
use App\Services\Support\SpeechBalloons;
use Illuminate\Console\Command;

/**
 * Balloons whose speaker was quick-masked before the editor kept them in step (2026-10-20) point
 * at a figure that is no longer on the scene, so their tails are gone. A masked copy keeps the
 * original's title (Step3SceneConfigurator::saveMaskedLayer), so the one figure layer on the scene
 * with the speaker's title and source 'mask' is the speaker. Anything less certain is reported,
 * never guessed. Dry run unless --apply.
 */
class RelinkBalloonSpeakers extends Command
{
    protected $signature = 'balloons:relink {lesson : lesson id} {--apply : write the fixes}';

    protected $description = 'Point balloons back at their quick-masked speaker figure';

    public function handle(): int
    {
        $lesson = Lesson::findOrFail((int) $this->argument('lesson'));
        $fixed = 0;

        foreach ($lesson->scenes()->orderBy('order')->get() as $scene) {
            $onStage = collect($scene->shots ?? [])->flatMap(fn ($shot) => collect($shot['layers'] ?? [])->pluck('asset_id'))
                ->filter()->map(fn ($id) => (int) $id)->unique()->values();
            $config = (array) ($scene->config ?? []);

            foreach ((array) ($config['lines'] ?? []) as $i => $line) {
                $from = (int) ($line['figure']['asset_id'] ?? 0);
                if ($from === 0 || $onStage->contains($from)) {
                    continue;
                }
                $speaker = SvgAsset::withTrashed()->find($from);
                $masks = $speaker === null ? collect() : SvgAsset::whereIn('id', $onStage)
                    ->where('source', 'mask')->where('title', $speaker->title)->pluck('id');
                if ($masks->count() !== 1) {
                    $this->warn("scene {$scene->id} line {$i} ({$line['speaker']}): figure {$from} is not on the scene and has no single masked copy there");

                    continue;
                }
                $config = SpeechBalloons::withSpeakerAsset($config, $from, (int) $masks->first());
                $this->info("scene {$scene->id} line {$i} ({$line['speaker']}): figure {$from} -> {$masks->first()}");
                $fixed++;
            }

            if ($this->option('apply') && $config !== (array) ($scene->config ?? [])) {
                $scene->update(['config' => $config]);
            }
        }

        $this->line($this->option('apply') ? "{$fixed} balloon(s) relinked." : "{$fixed} balloon(s) would be relinked (dry run, --apply to write).");

        return self::SUCCESS;
    }
}
