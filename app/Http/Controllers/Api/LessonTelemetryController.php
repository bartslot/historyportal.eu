<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Lesson;
use App\Models\LessonTelemetryEvent;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * Public batch-ingest endpoint for anonymous player telemetry (Phase 0 experiment).
 * Addressed by lesson CODE (the same public handle students already use to watch), so the
 * player needs no auth and no ids beyond what it already has. Throttled per route.
 *
 * Privacy contract (see the lesson_telemetry_events migration): the request carries an
 * anonymous per-page-load session uuid and playback facts — nothing identifying. This
 * controller must never log or store IPs or add identifying fields.
 */
class LessonTelemetryController extends Controller
{
    private const MAX_EVENTS_PER_REQUEST = 50;

    public function store(Request $request, string $lessonCode): Response
    {
        if (! config('lessons.telemetry_enabled', true)) {
            return response()->noContent();
        }

        $lesson = Lesson::where('lesson_code', $lessonCode)->first();
        if ($lesson === null) {
            // 204, not 404 — a stale tab must not probe which codes exist.
            return response()->noContent();
        }

        $validated = $request->validate([
            'session_uuid' => ['required', 'uuid'],
            'events' => ['required', 'array', 'max:'.self::MAX_EVENTS_PER_REQUEST],
            'events.*.event' => ['required', 'string', 'in:'.implode(',', LessonTelemetryEvent::EVENTS)],
            'events.*.scene_index' => ['nullable', 'integer', 'min:0', 'max:500'],
            'events.*.scene_id' => ['nullable', 'integer', 'min:1'],
            'events.*.playback_position' => ['nullable', 'numeric', 'min:0', 'max:86400'],
            'events.*.client_ts' => ['nullable', 'integer'], // epoch ms from the browser
        ]);

        $now = now();
        $rows = [];
        foreach ($validated['events'] as $event) {
            $clientTs = null;
            if (isset($event['client_ts'])) {
                $ms = (int) $event['client_ts'];
                // Reject nonsense clocks rather than storing them.
                if ($ms > 1_500_000_000_000 && $ms < 32_000_000_000_000) {
                    $clientTs = date('Y-m-d H:i:s', intdiv($ms, 1000));
                }
            }
            $rows[] = [
                'lesson_id' => $lesson->id,
                'session_uuid' => $validated['session_uuid'],
                'event' => $event['event'],
                'scene_index' => $event['scene_index'] ?? null,
                'scene_id' => $event['scene_id'] ?? null,
                'playback_position' => $event['playback_position'] ?? null,
                'client_ts' => $clientTs,
                'created_at' => $now,
            ];
        }

        if ($rows !== []) {
            LessonTelemetryEvent::insert($rows);
        }

        return response()->noContent();
    }
}
