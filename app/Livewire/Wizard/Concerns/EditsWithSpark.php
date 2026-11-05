<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Services\Art\HistoryLineStyle;
use App\Services\Editor\EditedImages;
use App\Services\Local\LocalChatGpt;
use App\Services\Local\SparkJobs;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;

/**
 * The spark on a picture: type what to change, ChatGPT on this machine changes it (LocalChatGpt, local only). The result
 * lands like an editor Save (EditsImages): a new file, the original kept, one Cmd-Z.
 */
trait EditsWithSpark
{
    private const SPARK_MAX_CHARS = 500;

    /** Past ChatGPT's own timeout (LocalChatGpt::editImage): an edit still "running" then has died. */
    private const SPARK_MAX_SECONDS = 720;

    /** @return array{ok: bool, job?: string} */
    public function sparkEdit(string $target, string $instruction): array
    {
        $instruction = trim($instruction);
        $at = EditedImages::target($target);
        $scene = $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;
        if (! LocalChatGpt::available() || $at === null || $scene === null || $instruction === '' || mb_strlen($instruction) > self::SPARK_MAX_CHARS) {
            return ['ok' => false];
        }
        $source = $this->sparkSource($scene, $at);
        if ($source === null) {
            return ['ok' => false];
        }
        $job = SparkJobs::newId();
        SparkJobs::write($job, [
            'status' => SparkJobs::RUNNING, 'scene' => $scene->id, 'target' => $target, 'source' => $source, 'picture' => $source, 'started' => time(),
            'prompt' => $instruction."\n\n".$this->sparkStyle($scene),
        ]);
        Process::run(['sh', '-c', sprintf('nohup %s %s chatgpt:edit-image %s > /dev/null 2>&1 &', escapeshellarg(PHP_BINARY), escapeshellarg(base_path('artisan')), escapeshellarg($job))]);
        $this->skipRender();

        return ['ok' => true, 'job' => $job];
    }

    /** @return array{status: string} running: nothing changes, so no render; done: the picture was swapped */
    public function sparkStatus(string $id): array
    {
        $job = SparkJobs::read($id);
        $scene = $job === null ? null : $this->lesson->scenes()->find($job['scene'] ?? 0);
        if ($scene === null) {
            $this->skipRender();

            return ['status' => SparkJobs::FAILED];
        }
        if ($job['status'] === SparkJobs::RUNNING) {
            if (time() - (int) ($job['started'] ?? 0) <= self::SPARK_MAX_SECONDS) {
                $this->skipRender();

                return ['status' => SparkJobs::RUNNING];
            }
            $job['status'] = SparkJobs::FAILED;   // the command died without a word
        }
        $failure = __('ChatGPT could not change this picture. Is the ChatGPT app open?');
        $saved = false;
        if ($job['status'] === SparkJobs::DONE) {
            $target = $this->sparkLandingTarget($scene, $job);
            if ($target === null) {
                $failure = __('This picture changed while ChatGPT worked, so its result was not used.');
            } else {
                $bytes = (string) file_get_contents(SparkJobs::dir($id).'/result.png');
                $saved = $this->applyEditedImage($scene, $target, 'data:image/png;base64,'.base64_encode($bytes))['ok'];
            }
        }
        SparkJobs::forget($id);
        if (! $saved) {
            $this->skipRender();
            $this->dispatch('toast', type: 'error', message: $failure);
        }

        return ['status' => $saved ? SparkJobs::DONE : SparkJobs::FAILED];
    }

    /**
     * This lesson's edits still on disk, for the page to follow again after a reload.
     *
     * @return list<array{job: string, key: string}>
     */
    public function sparkPending(): array
    {
        $this->skipRender();
        if (! LocalChatGpt::available()) {
            return [];
        }
        $scenes = $this->lesson->scenes()->pluck('id')->all();

        return collect(SparkJobs::ids())
            ->map(fn (string $id) => [$id, SparkJobs::read($id)])
            ->filter(fn (array $j) => in_array($j[1]['scene'] ?? null, $scenes, true))
            ->map(fn (array $j) => ['job' => $j[0], 'key' => $j[1]['scene'].':'.$j[1]['target']])
            ->values()->all();
    }

    /**
     * Where a finished edit lands: its own row if that still draws the picture it was made from, else the one row that
     * does (a layer above it was deleted). Null when the picture is gone or was changed meanwhile: then it lands nowhere.
     */
    private function sparkLandingTarget(Scene $scene, array $job): ?string
    {
        $target = (string) $job['target'];
        $at = EditedImages::target($target);
        if ($at === null) {
            return null;
        }
        if ($this->sparkPicture($scene, $at) === ($job['picture'] ?? null)) {
            return $target;
        }
        if ($at[0] === 'art' || ! str_starts_with((string) $at[1], 'layer-')) {
            return null;
        }
        $same = [];
        foreach (array_keys($scene->config['stage25d']['set']['layers'] ?? []) as $n) {
            if ($this->sparkPicture($scene, ['stage', "layer-{$n}"]) === ($job['picture'] ?? null)) {
                $same[] = "s25_layer-{$n}";
            }
        }

        return count($same) === 1 ? $same[0] : null;
    }

    /** What a row draws now: compared at landing, so a result never lands on another picture. */
    private function sparkPicture(Scene $scene, array $at): ?string
    {
        return $this->sparkSource($scene, $at);
    }

    /** The file the layer draws now, found here and never taken from the browser. */
    private function sparkSource(Scene $scene, array $at): ?string
    {
        if ($at[0] === 'art') {
            foreach ($scene->shots ?? [] as $shot) {
                foreach ($shot['layers'] ?? [] as $layer) {
                    if (($layer['asset_id'] ?? null) === $at[1] && is_string($layer['path'] ?? null)) {
                        return $this->sparkOnDisk($layer['path']);
                    }
                }
            }

            return null;
        }
        $set = $scene->config['stage25d']['set'] ?? [];
        $row = $at[1];
        $values = $row === 'sky' ? ($set['skyLayer'] ?? []) : (str_starts_with($row, 'band-') ? ($set['groundBands'][(int) substr($row, 5)] ?? []) : ($set['layers'][(int) substr($row, 6)] ?? []));
        $src = $values['src'] ?? null;
        if (is_string($src)) {
            return $this->sparkOnDisk(preg_replace('#^/storage/#', '', $src));
        }
        $path = $this->stageRowOriginalPath($scene, $row);

        return $path === null ? null : $this->sparkOnDisk($path);
    }

    private function sparkOnDisk(string $path): ?string
    {
        return ! str_contains($path, '..') && Storage::disk('public')->exists($path) ? Storage::disk('public')->path($path) : null;
    }

    /** The lesson's style: a 3D scene is drawn in History Lines, whatever the older image_style field says. */
    private function sparkStyle(Scene $scene): string
    {
        return $scene->isStage25d() || $this->lesson->image_style === HistoryLineStyle::KEY
            ? HistoryLineStyle::KEEP_IN_EDIT
            : 'Keep the picture in its own style.';
    }
}
