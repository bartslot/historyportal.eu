<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use App\Services\OfflineSync\LocalCopy;
use App\Services\OfflineSync\RemoteSite;
use Illuminate\Console\Command;
use RuntimeException;

/**
 * On the laptop: copy a live lesson here to edit offline, with every picture, sound and clip it uses, and
 * hold its scenes on the live site so nobody edits them meanwhile. Run it again to refresh the copy; scenes
 * edited here are left as they are.
 *
 *   php artisan lessons:pull 7KQ2ZD             # take it offline
 *   php artisan lessons:pull 7KQ2ZD --no-hold   # a copy only, scenes stay free on the live site
 */
class OfflinePull extends Command
{
    protected $signature = 'lessons:pull {code : The lesson code on the live site}
        {--no-hold : Do not hold the scenes on the live site}
        {--user= : Local account that owns the copy (default: the same email as the live sign-in, else the first admin)}';

    protected $description = 'Copy a live lesson to this laptop for offline editing';

    public function handle(LocalCopy $copies, RemoteSite $remote): int
    {
        try {
            $owner = self::owner($remote, $this->option('user'));
            $result = $copies->reporting(fn (string $line) => $this->line($line))
                ->pull((string) $this->argument('code'), $owner, claim: ! $this->option('no-hold'));
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }
        $lesson = $result['copy']->lesson;
        $this->info("\"{$lesson->title}\" is on this laptop as lesson {$lesson->id} ({$lesson->scenes()->count()} scenes).");
        if ($result['busy'] !== []) {
            $this->warn('Somebody was editing these on the live site, so they are not held for you: '.implode(', ', $result['busy']));
        }
        $this->line('Open it here: '.route('teacher.lessons.wizard', $lesson, false));

        return self::SUCCESS;
    }

    /** The local account a copy belongs to. */
    public static function owner(RemoteSite $remote, ?string $email): User
    {
        $email ??= $remote->account()['email'] ?? null;
        $user = $email ? User::query()->where('email', $email)->first() : null;

        return $user
            ?? User::query()->where('role', 'admin')->orderBy('id')->first()
            ?? throw new RuntimeException('No local account to own the copy: pass --user=<email>.');
    }
}
