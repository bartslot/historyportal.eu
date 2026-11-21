<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\MusicLicence;
use App\Models\MusicTrack;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Put the sound bank's ambience beds (engine-mvp/src/sound/bank.json) in the music library as kind
 * 'ambience', so any scene can play one (App\Support\SceneAmbience) and the scene panel can pick it.
 * Safe to run again: a bed is matched on its bank id and only its file and tags are refreshed.
 *
 *   php artisan sound:library                              # audio from ~/BartsMedia/historyportal/sound
 *   php artisan sound:library --from=public/sound/bank     # on production, after the rsync in docs/sound-bank.md
 */
class ImportAmbienceBeds extends Command
{
    protected $signature = 'sound:library {--from= : Folder holding beds/ (default ~/BartsMedia/historyportal/sound)}';

    protected $description = 'Add the sound bank ambience beds to the music library as ambience tracks';

    public function handle(): int
    {
        $from = rtrim((string) ($this->option('from') ?: getenv('HOME').'/BartsMedia/historyportal/sound'), '/');
        $bank = json_decode((string) file_get_contents(base_path('engine-mvp/src/sound/bank.json')), true);
        $prompts = collect(json_decode((string) @file_get_contents(base_path('engine-mvp/tools/soundbank/eleven_beds.json')), true)['beds'] ?? [])
            ->pluck('prompt', 'id');

        $added = 0;
        foreach ($bank['beds'] as $bed) {
            $file = "{$from}/{$bed['file']}";
            if (! is_file($file)) {
                $this->warn("Skipped {$bed['id']}: no {$file}");

                continue;
            }
            $path = "music/ambience/{$bed['id']}.".pathinfo($file, PATHINFO_EXTENSION);
            Storage::disk('public')->put($path, (string) file_get_contents($file));

            $track = MusicTrack::query()->firstOrNew(['slug' => $bed['id']]);
            $added += $track->exists ? 0 : 1;
            $isEleven = ($bed['source'] ?? null) === 'elevenlabs';
            $track->fill([
                'title' => $track->title ?: ucfirst(str_replace('-', ' ', $bed['id'])),
                'kind' => MusicTrack::KIND_AMBIENCE,
                'tags' => self::tags($bed, $bank['bundles'] ?? []),
                'prompt' => $prompts[$bed['id']] ?? $track->prompt,
                'licence' => $isEleven ? MusicLicence::Other : MusicLicence::Cc0,
                'licence_note' => $isEleven ? 'ElevenLabs sound effects, paid plan: commercial use granted.' : 'Self-generated (make_bank.py).',
                'path' => $path,
            ])->save();
        }

        $this->info("Ambience beds in the library: {$added} new, ".MusicTrack::query()->ambience()->count().' in all.');

        return self::SUCCESS;
    }

    /**
     * The bed's tags, plus '!region' for each region of its bundle unless it plays anywhere (universal):
     * Auto plays a regional bed only where the lesson is (no Dutch heath under Babylon).
     *
     * @param  array<string, mixed>  $bed
     * @param  array<string, array{regions?: list<string>}>  $bundles
     * @return list<string>
     */
    private static function tags(array $bed, array $bundles): array
    {
        $regions = ($bed['universal'] ?? false) ? [] : ($bundles[$bed['bundle']]['regions'] ?? []);

        return array_values(array_unique([...$bed['tags'], ...array_map(fn ($r) => "!{$r}", $regions)]));
    }
}
