<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Scene;
use App\Services\Corpus\SceneMatchTargetService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Tags a scene for the painting picker (one LLM call, stored on the scene). Queued so a teacher
 * clicking Paintings never waits on it: the picker shows the year-based match until this lands.
 */
class DeriveSceneMatchTarget implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 90;

    public function __construct(public readonly int $sceneId) {}

    public function handle(SceneMatchTargetService $targets): void
    {
        $scene = Scene::with('lesson')->find($this->sceneId);
        if ($scene && $scene->lesson) {
            $targets->for($scene, $scene->lesson);
        }
    }
}
