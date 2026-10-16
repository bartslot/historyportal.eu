<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\TestSession\StoreTestSessionRequest;
use App\Http\Requests\TestSession\TestSessionBatchRequest;
use App\Http\Requests\TestSession\TestSessionControlRequest;
use App\Models\TestEvent;
use App\Models\TestRrwebChunk;
use App\Models\TestSession;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * Live test sessions (P1). The recorder (resources/js/test-session/recorder.js) asks consent, calls
 * start, posts a batch every 5 seconds and calls end on Stop. Reading is for admins and the owner;
 * Claude reads through `php artisan test:report`.
 */
class TestSessionController extends Controller
{
    /** "Start test session": open a session and send the teacher back to the page with ?test=CODE. */
    public function store(StoreTestSessionRequest $request): RedirectResponse
    {
        $session = TestSession::create([
            'code' => TestSession::newCode(),
            'label' => $request->validated('label'),
            'user_id' => $request->user()->id,
        ]);

        $return = (string) ($request->validated('return') ?: route('teacher.dashboard', absolute: false));
        $separator = str_contains($return, '?') ? '&' : '?';

        return redirect($return.$separator.'test='.$session->code);
    }

    /** Consent given. Idempotent: every page load of an ongoing test calls it to learn the clock. */
    public function start(TestSessionControlRequest $request, string $code): JsonResponse
    {
        $session = $this->find($code);

        if ($session->ended_at !== null) {
            return response()->json(['message' => 'ended'], 410);
        }

        if ($session->started_at === null) {
            $session->forceFill(['started_at' => now()])->save();
        }

        // The client sets its own zero from this, so a skewed client clock does not matter.
        return response()->json([
            'code' => $session->code,
            'elapsed_ms' => max(0, (int) $session->started_at->diffInMilliseconds(now())),
        ]);
    }

    public function batch(TestSessionBatchRequest $request, string $code): Response|JsonResponse
    {
        if (strlen((string) $request->getContent()) > TestSessionBatchRequest::MAX_BYTES) {
            return response()->json(['message' => 'too large'], 413);
        }

        $session = $this->find($code);

        if (! $session->isOpen()) {
            return response()->json(['message' => 'closed'], 410);
        }

        $rows = array_map(fn (array $event): array => [
            'test_session_id' => $session->id,
            't_ms' => (int) $event['t'],
            'type' => $event['type'],
            'payload' => isset($event['data']) ? json_encode($event['data'], JSON_UNESCAPED_UNICODE) : null,
        ], $request->validated('events'));

        $rrweb = $request->validated('rrweb');

        DB::transaction(function () use ($rows, $rrweb, $session): void {
            foreach (array_chunk($rows, 200) as $chunk) {
                TestEvent::insert($chunk);
            }

            if ($rrweb) {
                // insertOrIgnore: a beacon retried after a fetch that did land must not fail the batch.
                TestRrwebChunk::insertOrIgnore([
                    'test_session_id' => $session->id,
                    'seq' => (int) $rrweb['seq'],
                    ...TestRrwebChunk::encode($rrweb['events']),
                    'created_at' => now(),
                ]);
            }
        });

        return response()->noContent();
    }

    /** Stop pressed. */
    public function end(TestSessionControlRequest $request, string $code): Response
    {
        $session = $this->find($code);

        if ($session->ended_at === null) {
            $session->forceFill(['ended_at' => now()])->save();
        }

        return response()->noContent();
    }

    /** The timeline as JSON, for admins and the session's owner. */
    public function show(Request $request, string $code): JsonResponse
    {
        $session = $this->find($code);

        abort_unless($session->readableBy($request->user()), 403);

        return response()->json([
            'session' => $session->only(['code', 'label', 'started_at', 'ended_at']),
            'events' => $session->events()->orderBy('t_ms')->orderBy('id')->get(['t_ms', 'type', 'payload']),
        ]);
    }

    private function find(string $code): TestSession
    {
        return TestSession::where('code', strtoupper($code))->firstOrFail();
    }
}
