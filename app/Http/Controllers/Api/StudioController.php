<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\FinishStudioItemRequest;
use App\Http\Requests\Api\StudioBatchRequest;
use App\Models\StoryMediaItem;
use App\Services\StoryVideo\StudioQueue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * What tools/studio/studio.py on bart's Mac talks to: what waits, pull a batch, fetch its reference pictures, send
 * the results back, hand a batch back. Guarded by StudioToken.
 */
class StudioController extends Controller
{
    public function __construct(private readonly StudioQueue $queue) {}

    public function status(): JsonResponse
    {
        return response()->json($this->queue->status());
    }

    /** A batch to make, or 204 when nothing waits. */
    public function next(StudioBatchRequest $request): JsonResponse|Response
    {
        $batch = $this->queue->claim((int) ($request->validated('max') ?? config('story_video.studio.max_batch', 10)));
        if ($batch === null) {
            return response()->noContent();
        }

        return response()->json([
            'claim' => $batch['claim'],
            'items' => array_map(fn (StoryMediaItem $item) => [
                'id' => $item->id,
                'lesson_id' => $item->lesson_id,
                'lesson' => (string) ($item->lesson?->topic ?? ''),
                'scene_id' => $item->scene_id,
                'kind' => $item->kind->value,
                'key' => $item->key,
                'label' => (string) $item->label,
                'prompt' => (string) $item->prompt,
                'text' => (string) (($item->input ?? [])['text'] ?? ''),
                'settings' => $this->queue->settings($item),
                'references' => $this->references($item),
            ], $batch['items']),
        ]);
    }

    /** @return list<array{name: string, url: string}> numbered in the prompt's order */
    private function references(StoryMediaItem $item): array
    {
        $out = [];
        foreach ($this->queue->references($item) as $i => $ref) {
            $out[] = ['name' => sprintf('%02d-%s', $i + 1, $ref['name']), 'url' => route('api.studio.input', ['item' => $item->id, 'index' => $i])];
        }

        return $out;
    }

    /** One reference picture of an item in a batch the Mac holds. */
    public function input(Request $request, StoryMediaItem $item, int $index): Response
    {
        abort_unless($this->queue->holds($item, (string) $request->query('claim')), 409);
        $ref = $this->queue->references($item)[$index] ?? null;
        $bytes = $ref !== null ? $this->queue->referenceBytes($ref) : null;
        abort_if($bytes === null, 404);

        return response($bytes, 200, ['Content-Type' => 'application/octet-stream']);
    }

    public function finish(FinishStudioItemRequest $request, StoryMediaItem $item): JsonResponse
    {
        if (! $this->queue->holds($item, (string) $request->validated('claim'))) {
            return response()->json(['message' => 'This item was handed out again or redone; the upload is not used.'], 409);
        }
        if ($request->hasFile('file')) {
            return response()->json(['status' => 'ready', 'path' => $this->queue->finish($item, $request->file('file'))]);
        }
        $this->queue->fail($item, (string) $request->validated('error'));

        return response()->json(['status' => 'failed']);
    }

    /** The run stopped: everything still unmade in the batch waits again. */
    public function release(StudioBatchRequest $request): JsonResponse
    {
        return response()->json(['released' => $this->queue->release((string) $request->validated('claim'))]);
    }
}
