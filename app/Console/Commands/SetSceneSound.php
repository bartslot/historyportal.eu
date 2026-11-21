<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Lesson;
use App\Models\MusicTrack;
use App\Models\Scene;
use App\Support\SceneAmbience;
use Illuminate\Console\Command;

/**
 * Put one ambience bed under the scenes of some lessons that say certain words, as if the teacher
 * picked it in Scene panel > Music > Sound (with an undo step, so it can be taken back there).
 *
 *   php artisan sound:set mountain-eagle --lesson="Marco Polo" --words=pamir --words=mountain --words=berg --dry-run
 */
class SetSceneSound extends Command
{
    protected $signature = 'sound:set {sound : The bed\'s bank id, e.g. mountain-eagle}
        {--lesson=* : Text in the lesson topic (any of them)}
        {--words=* : A word the scene must say: script, place, chapter or picture prompt (any of them)}
        {--dry-run : Only list the scenes}';

    protected $description = 'Set an ambience bed on the matching scenes of matching lessons';

    public function handle(): int
    {
        $track = MusicTrack::query()->ambience()->where('slug', $this->argument('sound'))->first();
        $topics = (array) $this->option('lesson');
        $words = array_map('mb_strtolower', (array) $this->option('words'));
        if (! $track || $topics === [] || $words === []) {
            $this->error('Give a known bed, at least one --lesson and at least one --words.');

            return self::FAILURE;
        }

        $lessons = Lesson::query()->where(function ($q) use ($topics) {
            foreach ($topics as $t) {
                $q->orWhere('topic', 'ilike', '%'.$t.'%');
            }
        })->get(['id', 'topic']);

        $count = 0;
        foreach (Scene::query()->whereIn('lesson_id', $lessons->pluck('id'))->orderBy('lesson_id')->orderBy('order')->get() as $scene) {
            $text = mb_strtolower(implode(' ', [$scene->script_segment, $scene->location, $scene->chapter_name, $scene->image_prompt]));
            if (! array_filter($words, fn ($w) => str_contains($text, $w))) {
                continue;
            }
            $count++;
            $this->line("lesson {$scene->lesson_id} scene {$scene->id} (#{$scene->order}): ".mb_substr(preg_replace('/\s+/', ' ', (string) $scene->script_segment), 0, 80));
            if ($this->option('dry-run')) {
                continue;
            }
            $config = $scene->config ?? [];
            $undo = $scene->music_undo ?? [];
            $undo[] = ['a' => $config['ambience'] ?? null];
            $config['ambience'] = ['track_id' => $track->id, 'volume' => SceneAmbience::volume($scene)];
            $scene->update(['config' => $config, 'music_undo' => array_slice($undo, -30)]);
        }

        $this->info(($this->option('dry-run') ? 'Would set ' : 'Set ')."{$track->slug} on {$count} scene(s) in {$lessons->count()} lesson(s).");

        return self::SUCCESS;
    }
}
