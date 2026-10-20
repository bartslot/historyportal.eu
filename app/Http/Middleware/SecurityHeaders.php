<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Baseline security headers on every web response (infra audit 2026-10-17, opus.7).
 *
 * The lesson player (`lesson/*`) is the one thing allowed in another site's frame: teachers embed it
 * in their LMS. Everything else, the teacher dashboard and editor above all, may only be framed by
 * historyportal.eu itself (the hero demo is a same-origin iframe).
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('Strict-Transport-Security', 'max-age=31536000');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');

        if (! $request->is('lesson/*')) {
            $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        }

        return $response;
    }
}
