<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Only Bart's Mac, holding IMAGE_RELAY_TOKEN, may serve picture requests. No token configured: the relay does not exist. */
class ImageRelayToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = (string) config('services.image_generation.relay_token');
        abort_if($token === '' || ! hash_equals($token, (string) $request->bearerToken()), 404);

        return $next($request);
    }
}
