<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Only bart's Mac, holding STUDIO_TOKEN, may pull studio batches and deliver results. No token configured: no route. */
class StudioToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = (string) config('story_video.studio.token');
        abort_if($token === '' || ! hash_equals($token, (string) $request->bearerToken()), 404);

        return $next($request);
    }
}
