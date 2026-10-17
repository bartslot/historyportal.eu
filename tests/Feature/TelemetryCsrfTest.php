<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Http\Middleware\ValidateCsrfToken;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * PM, 2026-10-18: the player at /lesson/W24VRI logs 419s. They are its anonymous telemetry,
 * POST /api/lesson/{code}/telemetry: the stateful API (bootstrap/app.php statefulApi) checks CSRF on
 * a same-site request, and the player sends no token (a sendBeacon cannot carry one). Every batch
 * was refused. Like the quiz score it is public, throttled and untrusted input: exempt.
 * (Laravel skips CSRF in tests, so this reads the exemption list itself.)
 */
class TelemetryCsrfTest extends TestCase
{
    public function test_the_players_anonymous_posts_are_exempt_from_csrf(): void
    {
        $middleware = app(ValidateCsrfToken::class);
        $exempt = (new \ReflectionMethod($middleware, 'inExceptArray'));

        foreach (['/api/lesson/W24VRI/telemetry', '/lesson/W24VRI/quiz-score'] as $path) {
            $this->assertTrue($exempt->invoke($middleware, Request::create($path, 'POST')), $path);
        }
        $this->assertFalse($exempt->invoke($middleware, Request::create('/api/lesson/W24VRI/anything-else', 'POST')));
    }
}
