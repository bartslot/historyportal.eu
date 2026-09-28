<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\LessonTelemetryEvent;
use Illuminate\Console\Command;

/**
 * Minimal-retention half of the telemetry privacy contract: events older than the configured
 * window are deleted. Run daily (SiteGround cron alongside queue:work — see CLAUDE.md).
 */
class PruneLessonTelemetry extends Command
{
    protected $signature = 'lessons:prune-telemetry {--days= : Override lessons.telemetry_retention_days}';

    protected $description = 'Delete anonymous player telemetry older than the retention window';

    public function handle(): int
    {
        $days = (int) ($this->option('days') ?: config('lessons.telemetry_retention_days', 90));
        if ($days < 1) {
            $this->error('Retention must be at least 1 day.');

            return self::FAILURE;
        }

        $deleted = 0;
        // Chunked deletes: the table can be large and shared hosting has statement limits.
        do {
            $batch = LessonTelemetryEvent::where('created_at', '<', now()->subDays($days))
                ->limit(5000)
                ->delete();
            $deleted += $batch;
        } while ($batch > 0);

        $this->info("Pruned {$deleted} telemetry events older than {$days} days.");

        return self::SUCCESS;
    }
}
