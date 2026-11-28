<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Only the render PC, holding RENDER_PC_TOKEN, may fetch and deliver clips. No token configured: the route does not exist. */
class RenderPcToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = (string) config('story_video.render_pc.token');
        abort_if($token === '' || ! hash_equals($token, (string) $request->bearerToken()), 404);

        return $next($request);
    }
}
