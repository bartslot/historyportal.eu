<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * The sound bank (engine-mvp/src/sound/bank.json: ambience beds + sfx) where the lesson player fetches it,
 * public/sound/bank/{beds,sfx} (bank.json base_url /sound/bank/). The audio is media, not code: it lives in
 * ~/BartsMedia/historyportal/sound and public/sound/bank is git-ignored. Production gets it by rsync, see
 * docs/sound-bank.md; scripts/deploy-prod.sh leaves public/sound/bank alone.
 */
class SyncSoundBank extends Command
{
    protected $signature = 'sound:sync
        {--from= : Folder with beds/ and sfx/ (default ~/BartsMedia/historyportal/sound)}
        {--copy : Copy the files instead of linking the folder}';

    protected $description = 'Link (or copy) the sound bank audio into public/sound/bank and report files bank.json names but the folder lacks';

    public function handle(): int
    {
        $from = rtrim((string) ($this->option('from') ?: (getenv('HOME').'/BartsMedia/historyportal/sound')), '/');
        if (! is_dir("{$from}/beds") || ! is_dir("{$from}/sfx")) {
            $this->error("No beds/ and sfx/ in {$from}");

            return self::FAILURE;
        }

        $bank = json_decode((string) file_get_contents(base_path('engine-mvp/src/sound/bank.json')), true);
        $missing = collect([...$bank['beds'], ...$bank['sfx']])->pluck('file')->reject(fn ($f) => is_file("{$from}/{$f}"))->values();

        $to = public_path('sound/bank');
        if (is_link($to) || is_file($to)) {
            unlink($to);
        }
        File::ensureDirectoryExists(dirname($to));
        if ($this->option('copy')) {
            foreach (['beds', 'sfx'] as $dir) {
                File::copyDirectory("{$from}/{$dir}", "{$to}/{$dir}");
            }
        } elseif (is_dir($to)) {
            $this->error("{$to} is a real folder (an earlier --copy): remove it, or run with --copy again");

            return self::FAILURE;
        } else {
            symlink($from, $to);
        }

        $this->info(($this->option('copy') ? 'Copied ' : 'Linked ')."{$from} -> {$to} (served at /sound/bank/)");
        if ($missing->isNotEmpty()) {
            $this->warn('bank.json names files the folder lacks: '.$missing->implode(', '));
        }

        return self::SUCCESS;
    }
}
