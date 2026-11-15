<?php

declare(strict_types=1);

/**
 * A throwaway lesson for terrain-worlds-stage25d.spec.ts: one stage25d scene per ready-made world (config/worlds.php),
 * put on the way pickStage25dWorld puts it, made fresh on every run.
 *
 *   php artisan tinker --execute='require "tests/playwright/terrain-worlds-lesson.php";'
 *
 * Prints PW_TERRAIN_WORLDS=<lesson>/<scene>:<world>,... Local database only.
 */

use App\Models\Lesson;
use App\Models\Scene;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

const TERRAIN_TITLE = 'Terrain worlds (throwaway)';
const TERRAIN_FROM_SCENE = 16104;

throw_unless(in_array(DB::connection()->getConfig('host'), ['127.0.0.1', 'localhost'], true), RuntimeException::class, 'Local database only.');

foreach (Lesson::withTrashed()->where('title', TERRAIN_TITLE)->get() as $old) {
    $old->forceDelete();
}

$from = Scene::findOrFail(TERRAIN_FROM_SCENE);
$lesson = $from->lesson->replicate();
$lesson->title = TERRAIN_TITLE;
$lesson->lesson_code = Str::upper(Str::random(6));
$lesson->save();

$out = [];
foreach (array_values(array_keys(config('worlds'))) as $i => $key) {
    $preset = config('worlds')[$key];
    $parts = $preset['set'];
    $set = ['sky' => $parts['sky'] ?? null, 'groundSlots' => $parts['groundSlots']]
        + (empty($parts['groundBands']) ? [] : ['groundBands' => $parts['groundBands']])
        + ['layers' => array_map(fn ($l) => $l + ['world' => true], $parts['layers'] ?? [])];
    $stage = ['id' => "w{$i}", 'bundle' => $preset['bundle'], 'world_id' => $key, 'set' => $set, 'look' => (array) ($preset['look'] ?? [])];
    $scene = $from->replicate();
    $scene->lesson_id = $lesson->id;
    $scene->order = $i + 1;
    $scene->config = ['stage25d' => $stage];
    $scene->save();
    $out[] = "{$scene->id}:{$key}";
}

echo "PW_TERRAIN_WORLDS={$lesson->id}/".implode(',', $out).PHP_EOL;
