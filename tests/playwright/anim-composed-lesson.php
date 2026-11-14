<?php

declare(strict_types=1);

/**
 * A throwaway lesson made the way the agents make one: a lesson.json whose figures name animation presets, imported by
 * LessonImporter (lessons:import-25d). One scene on the Old Babylonian steppe: the teacher's own kit character walks in
 * and Ana's flat rig waves. Made fresh on every run; local database only.
 *
 *   KIT_CHARACTER=<id> RIG_DIR=~/BartsMedia/historyportal/topics/character-bones/ana/rig/flat-v1/rig-shader \
 *     php artisan tinker --execute='require "tests/playwright/anim-composed-lesson.php";'
 *
 * NARRATION_MP3=<file>: an mp3 to read as the scene's narration, so the player's clock (the narration's time) runs.
 *
 * Prints ANIM_COMPOSED=<lesson>/<scene> and the import's report.
 */

use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\Stage25d\LessonImporter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

const COMPOSED_ID = 'anim-presets-throwaway';
const COMPOSED_FROM_SCENE = 15926;   // the steppe scene ana-rig-lesson.php uses too

throw_unless(in_array(DB::connection()->getConfig('host'), ['127.0.0.1', 'localhost'], true), RuntimeException::class, 'Local database only.');
$kit = (int) getenv('KIT_CHARACTER');
$character = SvgAsset::whereKey($kit)->where('source', 'character')->firstOrFail();
$teacher = User::findOrFail($character->user_id);
$rigDir = (string) getenv('RIG_DIR');
$puppet = json_decode((string) file_get_contents("{$rigDir}/fig-ana-flat-rig-01.json"), true, flags: JSON_THROW_ON_ERROR);

foreach (Lesson::withTrashed()->where('title', 'Animation presets (throwaway)')->get() as $old) {
    Storage::disk('public')->deleteDirectory("lessons/{$old->id}");
    $old->forceDelete();
}

// Ana's atlas and shade mask beside a path the stage can fetch (the import copies no pictures)
$dir = 'anim-composed';
Storage::disk('public')->put("{$dir}/fig-ana-flat-rig-01.webp", (string) file_get_contents("{$rigDir}/fig-ana-flat-rig-01.webp"));
Storage::disk('public')->put("{$dir}/fig-ana-flat-rig-01-shade.webp", (string) file_get_contents("{$rigDir}/fig-ana-flat-rig-01-shade.webp"));
$puppet['atlas'] = "/storage/{$dir}/fig-ana-flat-rig-01.webp";

$from = Scene::findOrFail(COMPOSED_FROM_SCENE)->config['stage25d'];
$set = $from['set'];
$set['layers'] = [
    ...array_values(array_filter($set['layers'], fn ($l) => empty($l['figure']) && empty($l['puppet']))),
    ['asset' => "chr-{$kit}", 'depth' => 'mid', 'x' => 0.75, 'z' => 5, 'figure' => 'scribe', 'animation' => ['id' => 'walk', 'start' => 0.5, 'length' => 5]],
    ['asset' => 'fig-ana-stand-01', 'depth' => 'mid', 'x' => 1.12, 'z' => 5, 'figure' => 'ana', 'puppet' => $puppet, 'animation' => ['id' => 'wave', 'start' => 2]],
];

$lesson = [
    'id' => COMPOSED_ID, 'title' => 'Animation presets (throwaway)', 'lang' => 'nl', 'bundle' => (string) $from['bundle'], 'level' => 'po',
    'teacher' => 'Doelen.',
    'scenes' => [[
        'id' => 'sc01', 'beat' => 'hook', 'where_when' => 'Babylon', 'narration' => 'Een schrijver loopt over de vlakte. Ana zwaait naar hem.',
        'dur_s' => 8.0, 'set' => $set, ...(getenv('NARRATION_MP3') ? ['audio' => basename((string) getenv('NARRATION_MP3'))] : []), 'camera' => $from['camera'] ?? null, 'sound' => null, 'interaction' => null, 'balloons' => [],
        'figures' => [['char' => 'scribe', 'pose' => 'walk', 'x' => 0.75, 'depth' => 'mid', 'facing' => 'right', 'expression' => 'neutral', 'animation' => ['id' => 'walk', 'start' => 0.5, 'length' => 5]],
            ['char' => 'ana', 'pose' => 'stand', 'x' => 1.12, 'depth' => 'mid', 'facing' => 'left', 'expression' => 'happy', 'animation' => ['id' => 'wave', 'start' => 2]]],
    ]],
];

$report = app(LessonImporter::class)->import($lesson, $teacher, getenv('NARRATION_MP3') ? dirname((string) getenv('NARRATION_MP3')) : null, force: true);
$scene = Scene::where('lesson_id', $report['lesson_id'])->orderBy('order')->firstOrFail();
echo 'ANIM_COMPOSED='.$report['lesson_id'].'/'.$scene->id.PHP_EOL;
echo json_encode(['keys' => $report['keys'], 'audio' => $report['audio'], 'warnings' => $report['warnings']]).PHP_EOL;
