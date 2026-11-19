<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Models\SvgAsset;
use App\Services\Art\HistoryLineStyle;
use App\Services\Editor\Cutouts;
use App\Services\Local\LocalChatGpt;
use App\Services\Local\SparkJobs;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use Livewire\Attributes\Renderless;

/**
 * Draw: the teacher types what the scene needs ("Marco Polo on a camel"), ChatGPT on this machine draws it in History
 * Lines (ink, then the watercolour edited from that ink, on #00FF00 keyed out: HistoryLineStyle::draw). It is saved
 * as the teacher's cut-out (chatgpt:draw), so it is in My cut-outs for every scene and a row of the 3D library for
 * stage25d scenes, and the page places it in the scene it was asked for. Local only, like the spark (LocalChatGpt).
 */
trait DrawsWithChatGpt
{
    private const DRAW_MAX_CHARS = 300;

    /** Two pictures in one run: past LocalChatGpt::draw's own timeout, a draw still "running" has died. */
    private const DRAW_MAX_SECONDS = 1000;

    /** @return array{ok: bool, job?: string} */
    #[Renderless]
    public function drawPicture(string $what): array
    {
        $what = trim(strip_tags($what));
        $scene = $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;
        if (! LocalChatGpt::available() || $scene === null || $what === '' || mb_strlen($what) > self::DRAW_MAX_CHARS || auth()->user()?->isGuestDemo()) {
            return ['ok' => false];
        }
        $job = SparkJobs::newId();
        SparkJobs::write($job, [
            'draw' => true, 'status' => SparkJobs::RUNNING, 'user' => (int) auth()->id(), 'scene' => $scene->id, 'started' => time(),
            'title' => Str::limit($what, 60, ''),
            'prompt' => HistoryLineStyle::draw($what, $this->drawEra($scene), LocalChatGpt::GREEN_BACKGROUND, 'ink.png', LocalChatGpt::DRAWN),
        ]);
        Process::run(['sh', '-c', sprintf('nohup %s %s chatgpt:draw %s > /dev/null 2>&1 &', escapeshellarg(PHP_BINARY), escapeshellarg(base_path('artisan')), escapeshellarg($job))]);

        return ['ok' => true, 'job' => $job];
    }

    /**
     * running: wait. done: the cut-out is saved; `id` is it, for the page to place in the scene (`scene`) it was drawn for.
     *
     * @return array{status: string, id?: int, scene?: int, stage25d?: bool, stage?: array<string,mixed>}
     */
    #[Renderless]
    public function drawStatus(string $id): array
    {
        $job = SparkJobs::read($id);
        if ($job === null || ($job['draw'] ?? false) !== true || (int) ($job['user'] ?? 0) !== (int) auth()->id()) {
            return ['status' => SparkJobs::FAILED];
        }
        if ($job['status'] === SparkJobs::RUNNING && time() - (int) ($job['started'] ?? 0) <= self::DRAW_MAX_SECONDS) {
            return ['status' => SparkJobs::RUNNING];
        }
        SparkJobs::forget($id);
        $asset = $job['status'] === SparkJobs::DONE
            ? SvgAsset::query()->whereKey((int) ($job['asset'] ?? 0))->where('user_id', auth()->id())->where('source', Cutouts::SOURCE)->first()
            : null;
        if ($asset === null) {
            $this->dispatch('toast', type: 'error', message: __('ChatGPT could not draw this. Is the ChatGPT app open?'));

            return ['status' => SparkJobs::FAILED];
        }
        // the Assets panels follow, as after a cut-out is saved: My cut-outs opens, the 3D library takes the new row
        $this->dispatch('cutouts-changed', id: $asset->id, stage: Cutouts::stageRow($asset));

        $scene = $this->lesson->scenes()->find((int) $job['scene']);

        return ['status' => SparkJobs::DONE, 'id' => $asset->id, 'scene' => (int) $job['scene'], 'stage25d' => (bool) $scene?->isStage25d(), 'stage' => Cutouts::stageRow($asset)];
    }

    /** The time the picture belongs to: the scene's year, else the lesson's era. */
    private function drawEra(Scene $scene): string
    {
        if (is_numeric($scene->year)) {
            return 'the year '.(int) $scene->year;
        }

        return trim((string) ($this->lesson->era ?? ''));
    }
}
