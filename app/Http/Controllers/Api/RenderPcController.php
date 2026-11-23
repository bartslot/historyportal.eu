<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\AttachSceneFilmRequest;
use App\Http\Requests\Api\FinishRenderPcClipRequest;
use App\Models\Scene;
use App\Models\StoryMediaItem;
use App\Services\StoryVideo\RenderPcQueue;
use App\Services\StoryVideo\SceneFilmUpload;
use App\Services\StoryVideo\StoryVideoRun;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * What the render PC's worker talks to (tools/render-pc/render_worker.py). The PC only makes outgoing requests:
 * ask for the next clip, download its reference pictures, send the clip back. Guarded by RenderPcToken.
 */
class RenderPcController extends Controller
{
    public function __construct(private readonly RenderPcQueue $queue) {}

    /** The worker's self-check: the token is right, and this is what waits. Does not count as asking for work. */
    public function ping(): JsonResponse
    {
        $status = $this->queue->status();

        return response()->json(['waiting' => $status['waiting'], 'rendering' => $status['rendering']]);
    }

    /** The next clip to render, or 204 when nothing waits. */
    public function next(): JsonResponse|Response
    {
        $job = $this->queue->claim();
        if ($job === null) {
            return response()->noContent();
        }
        $clip = $job['clip'];
        $input = $clip->input ?? [];

        return response()->json([
            'id' => $clip->id,
            'claim' => $job['claim'],
            'lesson_id' => $clip->lesson_id,
            'scene_id' => $clip->scene_id,
            'key' => $clip->key,
            'prompt' => (string) $clip->prompt,
            'seconds' => (int) ($input['seconds'] ?? 5),
            'text' => (string) ($input['text'] ?? ''),
            // Image 1 is the empty world shot, the rest are the character sheets, in the prompt's order.
            'inputs' => array_map(fn (int $i) => route('api.render-pc.input', ['clip' => $clip->id, 'index' => $i]), array_keys($job['references'])),
        ]);
    }

    /** One reference picture of a clip the PC holds. */
    public function input(Request $request, StoryMediaItem $clip, int $index): Response
    {
        abort_unless($this->queue->holds($clip, (string) $request->query('claim')), 409);
        $path = StoryVideoRun::for($clip->lesson)->clipReferencePaths($clip)[$index] ?? null;
        abort_if($path === null, 404);

        return Storage::disk('public')->response($path);
    }

    public function finish(FinishRenderPcClipRequest $request, StoryMediaItem $clip): JsonResponse
    {
        if (! $this->queue->holds($clip, (string) $request->validated('claim'))) {
            return response()->json(['message' => 'This clip was handed out again or redone; the upload is not used.'], 409);
        }
        if ($request->hasFile('video')) {
            $path = $this->queue->finish($clip, $request->file('video'));

            return response()->json(['status' => 'ready', 'path' => $path]);
        }
        $this->queue->fail($clip, (string) $request->validated('error'));

        return response()->json(['status' => 'failed']);
    }

    /** A film made by hand goes straight onto its scene; it is converted like an uploaded video. */
    public function film(AttachSceneFilmRequest $request, Scene $scene, SceneFilmUpload $upload): JsonResponse
    {
        $path = $upload->attach($scene, $request->file('film'));
        if ($path === null) {
            return response()->json(['message' => 'This scene has no picture yet; a film plays over a picture.'], 422);
        }

        return response()->json(['status' => 'attached', 'scene_id' => $scene->id, 'path' => $path]);
    }
}
