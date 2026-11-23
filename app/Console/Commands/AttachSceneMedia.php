<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Scene;
use App\Services\StoryVideo\SceneFilmUpload;
use Illuminate\Console\Command;
use Illuminate\Http\File;

/**
 * Put a video file that is on this machine onto a scene as its moving picture, without the editor's upload box.
 * The file is copied, converted like any upload (720p 12 fps H.264 + AV1) and plays over the scene's picture.
 * From another machine, use tools/render-pc/render_worker.py attach, which sends the file to the server.
 */
class AttachSceneMedia extends Command
{
    protected $signature = 'media:attach
        {file : The video file (mp4 or mov)}
        {--scene= : The scene it belongs to}';

    protected $description = 'Put a video file on a scene as its moving picture';

    public function handle(SceneFilmUpload $upload): int
    {
        $file = (string) $this->argument('file');
        $scene = Scene::find((int) $this->option('scene'));
        if ($scene === null) {
            $this->error('Give the scene with --scene=<id>.');

            return self::FAILURE;
        }
        if (! is_file($file) || ! in_array(strtolower(pathinfo($file, PATHINFO_EXTENSION)), ['mp4', 'mov', 'm4v'], true)) {
            $this->error("Not a video file: {$file}");

            return self::FAILURE;
        }
        $path = $upload->attach($scene, new File($file));
        if ($path === null) {
            $this->error('The scene has no picture and no first frame could be taken from the video (is ffmpeg installed?).');

            return self::FAILURE;
        }
        $this->info("Scene {$scene->id} (lesson {$scene->lesson_id}) now plays {$path}. The class files are made on the queue.");

        return self::SUCCESS;
    }
}
