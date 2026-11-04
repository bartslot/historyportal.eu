<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\MusicLicence;
use App\Models\MusicTrack;
use Illuminate\Console\Command;
use Illuminate\Http\File;
use Illuminate\Support\Facades\Storage;

/**
 * Add a downloaded music file to the library.
 *
 *   php artisan music:import ~/Downloads/road-ahead.mp3 --source=https://suno.com/s/fTrDC3Nbq9febwlm
 *
 * The audio itself always comes from a file on disk: Suno serves a song's audio only to its signed-in
 * owner, and its terms grant commercial use only to downloads made through Suno on a paid plan. From
 * a share link this reads the public title, nothing more.
 */
class ImportMusicTrack extends Command
{
    protected $signature = 'music:import {file} {--source=} {--title=} {--licence=suno_paid} {--note=}';

    protected $description = 'Add a downloaded MP3/M4A (e.g. from Suno) to the music library';

    public function handle(): int
    {
        $path = (string) $this->argument('file');
        $licence = MusicLicence::tryFrom((string) $this->option('licence'));
        if (! is_file($path) || ! in_array(strtolower(pathinfo($path, PATHINFO_EXTENSION)), ['mp3', 'm4a'], true)) {
            $this->error('Give an existing .mp3 or .m4a file.');

            return self::FAILURE;
        }
        if (! $licence) {
            $this->error('Unknown licence. Use one of: '.implode(', ', array_column(MusicLicence::cases(), 'value')));

            return self::FAILURE;
        }

        $source = $this->option('source') ?: null;
        $title = $this->option('title') ?: ($source ? MusicTrack::titleFromLink($source) : null) ?: pathinfo($path, PATHINFO_FILENAME);

        $track = MusicTrack::create([
            'title' => mb_substr($title, 0, 120),
            'source_url' => $source,
            'licence' => $licence,
            'licence_note' => $this->option('note') ?: null,
            'path' => Storage::disk('public')->putFile('music', new File($path)),
        ]);

        $this->info("Added \"{$track->title}\" (id {$track->id}).");

        return self::SUCCESS;
    }
}
