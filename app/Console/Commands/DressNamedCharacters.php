<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\SvgAsset;
use App\Models\User;
use App\Services\Editor\Characters;
use Illuminate\Console\Command;

/**
 * Dress a teacher's known people (Marco Polo, ...) in the look made for them (a starter with `names`, Characters::
 * namedStarter): the characters an import made before that look existed. Same id, so every scene that shows them shows
 * the new look. Only titles a named starter lists are touched.
 *
 *   php artisan characters:dress-named teacher@example.com [--dry]
 */
class DressNamedCharacters extends Command
{
    protected $signature = 'characters:dress-named {email} {--dry : List who would be dressed, change nothing}';

    protected $description = 'Dress a teacher\'s known characters (e.g. Marco Polo) in their own starter look';

    public function handle(): int
    {
        $user = User::query()->where('email', mb_strtolower(trim((string) $this->argument('email'))))->first();
        if ($user === null) {
            $this->error('No such teacher.');

            return self::FAILURE;
        }
        $rows = Characters::of($user)->filter(fn (SvgAsset $a) => Characters::namedStarter((string) $a->title) !== null);
        foreach ($rows as $row) {
            if ($this->option('dry')) {
                $this->line("would dress #{$row->id} {$row->title} as ".Characters::namedStarter((string) $row->title));

                continue;
            }
            $done = Characters::dressNamed($user, $row);
            $done ? $this->info("✓ #{$row->id} {$row->title}") : $this->error("✗ #{$row->id} {$row->title} could not be saved");
        }
        if ($rows->isEmpty()) {
            $this->line('Nobody to dress.');
        }

        return self::SUCCESS;
    }
}
