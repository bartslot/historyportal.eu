<?php

declare(strict_types=1);

/**
 * A throwaway lesson for picture-editor-walk.spec.ts, made fresh on every run because the walk saves into it.
 *
 *   php artisan tinker --execute='require "tests/playwright/editor-walk-lesson.php";'
 *
 * Prints PW_EDITOR_WALK=<lesson>/<scene>. Local database only. layer-0 is an edited figure, layer-2 a drawn test card
 * whose every region is known to the spec (white, a hole behind a drawn line, a blue coat, a red spot, a green field).
 */

use App\Models\Lesson;
use App\Models\Scene;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

const WALK_TITLE = 'Editor walk (throwaway)';
const WALK_FROM_SCENE = 9967;

throw_unless(in_array(DB::connection()->getConfig('host'), ['127.0.0.1', 'localhost'], true), RuntimeException::class, 'Local database only.');

$disk = Storage::disk('public');

foreach (Lesson::withTrashed()->where('title', WALK_TITLE)->get() as $old) {
    $disk->deleteDirectory("lessons/{$old->id}");
    $old->forceDelete();
}

$fromScene = Scene::findOrFail(WALK_FROM_SCENE);
$lesson = $fromScene->lesson->replicate();
$lesson->title = WALK_TITLE;
$lesson->lesson_code = Str::upper(Str::random(6));
$lesson->save();

$card = imagecreatetruecolor(600, 600);
imagefill($card, 0, 0, imagecolorallocate($card, 252, 250, 246));
$ink = imagecolorallocate($card, 20, 15, 10);
$frame = static function (int $x0, int $y0, int $x1, int $y1) use ($card, $ink): void {
    imagesetthickness($card, 4);
    imagerectangle($card, $x0, $y0, $x1, $y1, $ink);
};
$frame(60, 60, 240, 240);                                       // a white hole behind a drawn line
for ($y = 60; $y <= 240; $y++) {
    for ($x = 320; $x <= 540; $x++) {                           // a blue coat, mottled, turning violet to the right
        $t = ($x - 320) / 220;
        $mottle = ($x * 7 + $y * 13) % 5 * 3;
        imagesetpixel($card, $x, $y, imagecolorallocate($card, (int) (60 + 80 * $t) + $mottle, (int) (110 - 40 * $t) + $mottle, (int) (230 - 60 * $t)));
    }
}
$frame(316, 56, 544, 244);
imagefilledellipse($card, 150, 420, 80, 80, imagecolorallocate($card, 210, 40, 30));
imagefilledrectangle($card, 320, 320, 540, 540, imagecolorallocate($card, 60, 160, 70));

$edits = "lessons/{$lesson->id}/edits";
$disk->makeDirectory($edits);
ob_start();
imagepng($card);
$disk->put("{$edits}/walk-card.png", (string) ob_get_clean());

$config = $fromScene->config;
$figure = $config['stage25d']['set']['layers'][0];
$figureFile = basename((string) $figure['src']);
$disk->copy("lessons/{$fromScene->lesson_id}/edits/{$figureFile}", "{$edits}/{$figureFile}");
$config['stage25d']['set']['layers'][0]['src'] = "/storage/{$edits}/{$figureFile}";
$config['stage25d']['set']['layers'][2] = [...$figure, 'x' => 0.8, 'src' => "/storage/{$edits}/walk-card.png"];
$config['stage25d']['set']['layers'][3] = array_diff_key([...$figure, 'x' => 0.15], ['src' => true]);   // straight from the library: opens cleaned

$scene = $fromScene->replicate();
$scene->lesson_id = $lesson->id;
$scene->config = $config;
$scene->save();

echo "PW_EDITOR_WALK={$lesson->id}/{$scene->id}".PHP_EOL;
