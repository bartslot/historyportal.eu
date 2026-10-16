<?php

declare(strict_types=1);

namespace App\Services\TestSessions;

use App\Models\TestRrwebChunk;
use App\Models\TestSession;
use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * Screenshots of a recorded test session at given moments, rendered by replaying its rrweb
 * recording in silent headless Chromium (scripts/test-session-snapshot.mjs).
 */
class TestSessionSnapshots
{
    private const TIMEOUT_S = 300;

    /**
     * @param  array<string, int>  $shots  output path => ms since the session start
     * @return list<string> the paths written
     */
    public function render(TestSession $session, array $shots): array
    {
        if ($shots === [] || $session->started_at === null) {
            return [];
        }

        $events = $session->chunks()->orderBy('seq')->get()
            ->flatMap(fn (TestRrwebChunk $chunk): array => $chunk->decoded())
            ->values()->all();

        if ($events === []) {
            return [];
        }

        $job = tempnam(sys_get_temp_dir(), 'hp-snap-');
        file_put_contents($job, json_encode([
            'startedAtMs' => $session->started_at->getTimestampMs(),
            'events' => $events,
            'shots' => array_map(fn (string $out, int $at): array => ['atMs' => $at, 'out' => $out], array_keys($shots), $shots),
        ], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR));

        try {
            $process = new Process(['node', base_path('scripts/test-session-snapshot.mjs'), $job], base_path(), null, null, self::TIMEOUT_S);
            $process->run();

            if (! $process->isSuccessful()) {
                throw new RuntimeException('Snapshot failed: '.trim($process->getErrorOutput() ?: $process->getOutput()));
            }

            $lines = preg_split('/\R/', trim($process->getOutput())) ?: [];

            return json_decode((string) end($lines), true, 512, JSON_THROW_ON_ERROR);
        } finally {
            @unlink($job);
        }
    }
}
