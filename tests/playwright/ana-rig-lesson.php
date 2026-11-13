<?php

declare(strict_types=1);

/**
 * A throwaway lesson with Ana's full-body rig on a Mesopotamian scene, for checking bones in the real browser
 * (vault topics/character-bones/plan.md, phase 2). Made fresh on every run.
 *
 *   RIG_DIR=~/BartsMedia/historyportal/topics/character-bones/ana/rig/v1/rig [RIG_NAME=fig-ana-flat-rig-01] \
 *     php artisan tinker --execute='require "tests/playwright/ana-rig-lesson.php";'
 *
 * Prints ANA_RIG=<lesson>/<scene>/<layer index> (and PIETER_LAYER=<index> with PIETER_DIR set). Local database only. The rig rides on the layer (layer.puppet) over
 * Ana's own library drawing, so the library is not touched; its atlas is copied into the lesson's edits.
 */

use App\Models\Lesson;
use App\Models\Scene;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

const ANA_TITLE = 'Ana rig (throwaway)';
const ANA_FROM_SCENE = 15926;   // a draft Mesopotamian steppe scene on the babylonia-old-babylonian bundle; its camera is panned
// right, so Ana stands at x 1.12, 5 m away: in front of the near field strip (5.5 m)

throw_unless(in_array(DB::connection()->getConfig('host'), ['127.0.0.1', 'localhost'], true), RuntimeException::class, 'Local database only.');
$rigDir = (string) getenv('RIG_DIR');
$rigName = (string) (getenv('RIG_NAME') ?: 'fig-ana-rig-01');   // fig-ana-flat-rig-01: the flat-sheet Ana (plan 10)
throw_unless(is_file("{$rigDir}/".$rigName.'.json'), RuntimeException::class, 'Set RIG_DIR to the folder rig_parts.py wrote.');

// a rig's atlas is .webp (rig_parts.py, Bart 11-13: "use webp and not the very big .png files"); an older rig folder may
// still hold a .png
$atlasOf = fn (string $dir, string $name): string => is_file("{$dir}/{$name}.webp") ? "{$name}.webp" : "{$name}.png";

$disk = Storage::disk('public');
foreach (Lesson::withTrashed()->where('title', ANA_TITLE)->get() as $old) {
    $disk->deleteDirectory("lessons/{$old->id}");
    $old->forceDelete();
}

$fromScene = Scene::findOrFail(ANA_FROM_SCENE);
$lesson = $fromScene->lesson->replicate();
$lesson->title = ANA_TITLE;
$lesson->lesson_code = Str::upper(Str::random(6));
$lesson->save();

$edits = "lessons/{$lesson->id}/edits";
$disk->makeDirectory($edits);
$atlas = $atlasOf($rigDir, $rigName);
$disk->put("{$edits}/{$atlas}", (string) file_get_contents("{$rigDir}/{$atlas}"));
$puppet = json_decode((string) file_get_contents("{$rigDir}/".$rigName.'.json'), true, flags: JSON_THROW_ON_ERROR);
$puppet['atlas'] = "/storage/{$edits}/{$atlas}";

$config = $fromScene->config;
$layers = $config['stage25d']['set']['layers'];
$layers[] = ['need' => 'fig-ana-stand-01', 'asset' => 'fig-ana-stand-01', 'depth' => 'mid', 'x' => 1.12, 'z' => 5, 'scale' => 1, 'puppet' => $puppet];
$anaLayer = count($layers) - 1;

// PIETER_DIR: Pieter's older rigid upper-body puppet (no smart bones) beside her, to see that he is drawn as before.
// It rides on Ana's library drawing too, only for a height and an anchor on this Mesopotamian bundle.
$pieterDir = (string) getenv('PIETER_DIR');
if (is_file("{$pieterDir}/pieter-rigid.json")) {
    $pieterAtlas = $atlasOf($pieterDir, 'pieter-rigid');
    $disk->put("{$edits}/{$pieterAtlas}", (string) file_get_contents("{$pieterDir}/{$pieterAtlas}"));
    $pieter = json_decode((string) file_get_contents("{$pieterDir}/pieter-rigid.json"), true, flags: JSON_THROW_ON_ERROR);
    $pieter['atlas'] = "/storage/{$edits}/{$pieterAtlas}";
    $layers[] = ['need' => 'fig-ana-stand-01', 'asset' => 'fig-ana-stand-01', 'depth' => 'mid', 'x' => 1.3, 'z' => 5, 'scale' => 1, 'puppet' => $pieter];
}
$config['stage25d']['set']['layers'] = $layers;

$scene = $fromScene->replicate();
$scene->lesson_id = $lesson->id;
$scene->order = 1;
$scene->config = $config;
$scene->save();

echo 'ANA_RIG='.$lesson->id.'/'.$scene->id.'/'.$anaLayer.(count($layers) - 1 > $anaLayer ? ' PIETER_LAYER='.(count($layers) - 1) : '').PHP_EOL;
