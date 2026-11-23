<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\EncodeSceneLoop;
use App\Models\Scene;
use App\Services\Support\SceneLoop;
use App\Services\VideoTranscoder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Bring every scene's moving picture to the class files (720p 12 fps silent H.264 + AV1), for loops
 * uploaded before uploads were converted, or on a server that has just had a capable ffmpeg put on
 * it. Safe to run again: a loop that is already converted with its AV1 copy is skipped.
 */
class EncodeSceneLoops extends Command
{
    protected $signature = 'media:encode-loops
        {--lesson= : Only this lesson}
        {--dry-run : List the loops without converting}';

    protected $description = 'Convert scene moving pictures to 720p 12 fps H.264 + AV1';

    public function handle(): int
    {
        $transcoder = VideoTranscoder::make();
        $this->line('ffmpeg encoders: '.(implode(', ', array_intersect(['libx264', 'libsvtav1', 'libaom-av1'], $transcoder->encoders())) ?: 'none'));

        $scenes = Scene::query()
            ->when($this->option('lesson'), fn ($q, $id) => $q->where('lesson_id', (int) $id))
            ->orderBy('id')->get()
            ->filter(fn (Scene $s) => SceneLoop::of($s) !== null);

        foreach ($scenes as $scene) {
            $loop = SceneLoop::of($scene);
            $done = VideoTranscoder::isEncodedLoop($loop['src']) && isset($loop['av1']);
            $size = fn (?string $p) => $p && Storage::disk('public')->exists($p) ? number_format(Storage::disk('public')->size($p) / 1048576, 1).' MB' : '-';
            if ($done || $this->option('dry-run')) {
                $this->line(sprintf('  scene %d  %s  %s%s', $scene->id, $loop['src'], $size($loop['src']), $done ? '  (done)' : ''));

                continue;
            }
            $before = $size($loop['src']);
            EncodeSceneLoop::dispatchSync($scene->id, $loop['src']);
            $after = SceneLoop::of($scene->refresh());
            $this->line(sprintf('  scene %d  %s → H.264 %s, AV1 %s', $scene->id, $before, $size($after['src'] ?? null), $size($after['av1'] ?? null)));
        }
        $this->info($scenes->count().' moving picture(s).');

        return self::SUCCESS;
    }
}
