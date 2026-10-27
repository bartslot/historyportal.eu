<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Sweep up the throwaway accounts behind the landing-page Configure demo.
 *
 * Deleting the account takes its lesson copies with it (lessons.teacher_id cascades), and the
 * copies never owned their media, so nothing a real lesson depends on is touched.
 */
final class PruneGuestDemos extends Command
{
    protected $signature = 'demo:prune-guests {--hours= : Override the age cutoff}';

    protected $description = 'Delete landing-page guest demo accounts and their lesson copies';

    public function handle(): int
    {
        $hours = (int) ($this->option('hours') ?? config('demo.guest_ttl_hours'));
        $cutoff = now()->subHours(max(1, $hours));

        // Gone = past the 24-hour backstop, or no session still alive (the copy "gets discarded
        // when the user goes away", Bart 2026-10-20). Sessions live in the database
        // (SESSION_DRIVER=database), one row per browser with its last_activity.
        // A guest younger than one session lifetime is never "gone": their session row may not be
        // written yet.
        $alive = now()->subMinutes((int) config('session.lifetime'));
        $guests = User::query()
            ->where('is_guest_demo', true)
            ->where(fn ($q) => $q
                ->where('created_at', '<', $cutoff)
                // Only the database driver can tell: with any other, an empty sessions table would
                // read as "everyone left" and delete a guest mid-edit.
                ->when(config('session.driver') === 'database', fn ($q) => $q->orWhere(fn ($idle) => $idle
                    ->where('created_at', '<', $alive)
                    ->whereNotIn('id', DB::table(config('session.table') ?: 'sessions')
                        ->whereNotNull('user_id')
                        ->where('last_activity', '>=', $alive->getTimestamp())
                        ->select('user_id')))))
            ->get();

        // forceDelete, not delete: users soft-delete, and a soft-deleted row keeps its lessons
        // (and the guest's e-mail) around for ever. There is nothing here worth keeping.
        $guests->each(fn (User $guest) => $guest->forceDelete());

        $this->info("Pruned {$guests->count()} guest demo account(s) older than {$hours}h.");

        return self::SUCCESS;
    }
}
