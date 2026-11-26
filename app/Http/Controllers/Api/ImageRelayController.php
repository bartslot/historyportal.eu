<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\FinishImageRelayRequest;
use App\Models\ImageRelayRequest;
use App\Services\Imaging\ImageRelay;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/** The API `php artisan chatgpt:relay` on Bart's Mac talks to; see App\Services\Imaging\ImageRelay. */
class ImageRelayController extends Controller
{
    public function next(ImageRelay $relay): JsonResponse
    {
        $row = $relay->claim();
        if ($row === null) {
            return response()->json(['request' => null]);
        }

        return response()->json(['request' => [
            'id' => $row->id,
            'prompt' => $row->prompt,
            'size' => $row->size,
            'transparent' => $row->transparent,
            'inputs' => array_map(fn (int $i) => route('api.image-relay.input', [$row->id, $i]), array_keys($row->inputs ?? [])),
            'names' => array_map('basename', $row->inputs ?? []),
        ]]);
    }

    public function input(ImageRelayRequest $imageRelayRequest, int $index): Response
    {
        $path = ($imageRelayRequest->inputs ?? [])[$index] ?? null;
        abort_if($path === null || ! Storage::disk('local')->exists($path), 404);

        return response((string) Storage::disk('local')->get($path), 200, ['Content-Type' => 'application/octet-stream']);
    }

    public function finish(FinishImageRelayRequest $request, ImageRelayRequest $imageRelayRequest, ImageRelay $relay): JsonResponse
    {
        // Too late: the waiting job gave up already, and nobody would read the picture.
        abort_unless($imageRelayRequest->status === ImageRelayRequest::RUNNING, 409);

        if ($request->hasFile('picture')) {
            $relay->finish($imageRelayRequest, (string) $request->file('picture')->get());
        } else {
            $relay->fail($imageRelayRequest, (string) $request->input('error'));
        }

        return response()->json(['ok' => true]);
    }
}
