<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\StoryVideo\Clips\RenderPcClipDriver;
use App\Services\StoryVideo\RenderPcQueue;
use Illuminate\Console\Command;

/**
 * How the render PC route stands: clips waiting, clips rendering, when the PC last asked for work.
 * With --hand-over, clips that are still waiting go to another driver (the PC is off and the lesson cannot wait).
 */
class RenderPcStatus extends Command
{
    protected $signature = 'story-video:render-pc
        {--hand-over= : Give waiting clips to this driver instead (elevenlabs spends credits)}
        {--lesson= : With --hand-over: only this lesson}';

    protected $description = 'Show the render PC clip queue, or hand its waiting clips to another driver';

    public function handle(RenderPcQueue $queue): int
    {
        if ((string) config('story_video.render_pc.token') === '') {
            $this->warn('RENDER_PC_TOKEN is not set: the render PC cannot fetch clips.');
        }
        $requeued = $queue->requeueStale();
        $status = $queue->status();
        $this->line('Render PC last asked for work: '.($status['last_seen']?->diffForHumans() ?? 'never'));
        $this->line("Waiting: {$status['waiting']}   Rendering: {$status['rendering']}".($requeued > 0 ? "   ({$requeued} taken back from a PC that stopped)" : ''));

        $driver = (string) $this->option('hand-over');
        if ($driver === '') {
            return self::SUCCESS;
        }
        if ($driver === RenderPcClipDriver::NAME) {
            $this->error('These clips are already with the render PC.');

            return self::FAILURE;
        }
        $lesson = $this->option('lesson') !== null ? (int) $this->option('lesson') : null;
        $moved = $queue->handOver($driver, $lesson);
        $this->info("{$moved} waiting clip(s) handed to {$driver}.");

        return self::SUCCESS;
    }
}
