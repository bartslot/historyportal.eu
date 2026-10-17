<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Mail\OpsAlertMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Is prod broken? Every 5 minutes: a stalled queue, new failed jobs, new ERROR lines in the log.
 * Mails services.alerts.email, each kind at most once per ops.quiet_minutes (infra audit 2026-10-17:
 * a two-week queue outage and a day of 500s were found by a person).
 *
 * It remembers where it got to (storage/app/ops/state.json), so each problem is told once.
 */
class OpsCheck extends Command
{
    protected $signature = 'ops:check';

    protected $description = 'Mail the admin when the queue stalls, jobs fail or errors are logged';

    private const STATE = 'ops/state.json';

    private const MAX_LINES = 5;

    public function handle(): int
    {
        $state = $this->state();
        $problems = array_filter([
            'queue' => $this->stalledQueue(),
            'failed' => $this->newFailedJobs($state),
            'errors' => $this->newLogErrors($state),
        ]);
        Storage::disk('local')->put(self::STATE, json_encode($state));

        if ($problems === []) {
            $this->info('Prod looks healthy.');

            return self::SUCCESS;
        }

        foreach ($problems as $line) {
            $this->warn($line);
        }
        $this->mail($problems);

        return self::FAILURE;
    }

    private function stalledQueue(): ?string
    {
        $minutes = (int) config('ops.stalled_queue_minutes');
        $oldest = DB::table('jobs')->whereNull('reserved_at')->min('available_at');

        if ($oldest === null || (int) $oldest > now()->subMinutes($minutes)->timestamp) {
            return null;
        }

        $waiting = DB::table('jobs')->whereNull('reserved_at')->count();

        return "The queue has stalled: {$waiting} job(s) waiting, the oldest for "
            .(int) now()->diffInMinutes(\Illuminate\Support\Carbon::createFromTimestamp((int) $oldest), true)
            .' minutes. Check the Site Tools cron that runs schedule:run.';
    }

    /** @param  array<string, mixed>  $state */
    private function newFailedJobs(array &$state): ?string
    {
        $since = (int) ($state['failed_id'] ?? DB::table('failed_jobs')->max('id') ?? 0);
        $failed = DB::table('failed_jobs')->where('id', '>', $since)->orderBy('id')->get(['id', 'payload', 'exception']);
        $state['failed_id'] = (int) ($failed->last()->id ?? $since);

        if ($failed->isEmpty()) {
            return null;
        }

        $lines = $failed->take(self::MAX_LINES)->map(function ($job): string {
            $name = json_decode((string) $job->payload, true)['displayName'] ?? 'job';

            return $name.': '.Str::limit(strtok((string) $job->exception, "\n"), 200);
        })->implode("\n");

        return $failed->count()." job(s) failed:\n".$lines;
    }

    /** @param  array<string, mixed>  $state */
    private function newLogErrors(array &$state): ?string
    {
        $path = (string) config('ops.log_path');
        if (! is_file($path)) {
            return null;
        }

        $size = filesize($path);
        // First run, or the log was rotated/truncated: start from the end, never re-mail old errors.
        $offset = isset($state['log_offset']) && $state['log_offset'] <= $size ? (int) $state['log_offset'] : $size;
        $state['log_offset'] = $size;

        if ($offset === $size) {
            return null;
        }

        $handle = fopen($path, 'rb');
        fseek($handle, $offset);
        $errors = [];
        while (($line = fgets($handle)) !== false) {
            if (preg_match('/^\[[^\]]+\] \w+\.(ERROR|CRITICAL|ALERT|EMERGENCY): (.*)$/', rtrim($line), $match)) {
                $errors[] = Str::limit($match[2], 200);
            }
        }
        fclose($handle);

        if ($errors === []) {
            return null;
        }

        return count($errors)." new error(s) in the log:\n".implode("\n", array_slice(array_unique($errors), 0, self::MAX_LINES));
    }

    /** @param  array<string, string>  $problems */
    private function mail(array $problems): void
    {
        $to = (string) config('services.alerts.email', '');
        if ($to === '') {
            $this->error('services.alerts.email is not set: nobody can be told.');

            return;
        }

        $quiet = (int) config('ops.quiet_minutes') * 60;
        $fresh = array_filter($problems, fn (string $_, string $kind) => Cache::add("ops-alert:{$kind}", true, $quiet), ARRAY_FILTER_USE_BOTH);

        if ($fresh !== []) {
            Mail::to($to)->send(new OpsAlertMail(array_values($fresh)));
        }
    }

    /** @return array<string, mixed> */
    private function state(): array
    {
        $disk = Storage::disk('local');

        return $disk->exists(self::STATE) ? (array) json_decode((string) $disk->get(self::STATE), true) : [];
    }
}
