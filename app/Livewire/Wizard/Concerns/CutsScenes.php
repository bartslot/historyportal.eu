<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Jobs\EncodeSceneLoop;
use App\Models\Scene;
use App\Services\Editor\NarrationCutter;
use App\Services\Editor\SceneCut;
use App\Services\Editor\SceneHistory;
use App\Services\Stage25d\LayerKeys;
use App\Services\Support\SceneLoop;
use App\Services\VideoTranscoder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Livewire\Attributes\Renderless;

/**
 * The timeline's cut tool: the scene in two at the playhead (SceneCut says what goes where). The
 * second piece lands straight after the first and is opened, ready for its own background.
 *
 * The browser asks first where the cut really falls (cutPointFor: on a word gap or a pause in the
 * narration, never inside a word), splits its own keys there with the code that plays them, and
 * then sends both halves. One step: Cmd-Z or the toast's Undo puts the scene back as it was.
 */
trait CutsScenes
{
    /**
     * The last cut, so it can be taken back: the first piece's columns before the cut, the second
     * piece's id, and when (Cmd-Z weighs it against newer edits, as it does a deleted scene). In the
     * session, not on the component: a stage's config can be large, and a property rides along with
     * every request the editor makes.
     *
     * @return array{first: int, second: int, before: array<string, mixed>, at: float}|null
     */
    private function lastCut(): ?array
    {
        $cut = session()->get($this->cutKey());

        return is_array($cut) ? $cut : null;
    }

    private function cutKey(): string
    {
        return "scene_cut.{$this->lesson->id}";
    }

    /** The columns a cut changes on the first piece. */
    /**
     * Goes up with every cut and every undone cut. The open timeline remembers each scene's length and keys in the page
     * (timeline-panel.js SESSIONS, so a save's re-render keeps the playhead); a cut changes what a scene id holds, so the
     * panel only takes back what it remembered under the same count.
     */
    public int $timelineEpoch = 0;

    private const CUT_COLUMNS = ['script_segment', 'audio_path', 'audio_alignment', 'audio_script_hash', 'duration_seconds', 'config', 'shots'];

    /**
     * Where a cut near `$at` falls, and whether this scene can be cut there.
     *
     * @return array{ok: bool, at: float, message?: string}
     */
    #[Renderless]
    public function cutPointFor(float $at): array
    {
        $scene = $this->cuttableScene();
        if (is_string($scene)) {
            return ['ok' => false, 'at' => $at, 'message' => $scene];
        }
        $snapped = $this->snapCut($scene, $at);
        if ($this->nearAnEnd($snapped, (float) ($scene->config['timeline']['duration'] ?? 0))) {
            return ['ok' => false, 'at' => $snapped, 'message' => __('Move the playhead away from the ends of the scene to cut it.')];
        }

        return ['ok' => true, 'at' => $snapped];
    }

    /** Too near either end of a scene `$length` seconds long (0: length unknown, only the start counts). */
    private function nearAnEnd(float $at, float $length): bool
    {
        return $at < SceneCut::MIN_PIECE_S || ($length > 0 && $at > $length - SceneCut::MIN_PIECE_S);
    }

    /**
     * Cut the open scene at `$at` (a point cutPointFor gave). `$first` and `$second` are the two
     * halves of its timeline, as the panel saves a timeline (setTimeline).
     *
     * @param  array<string, mixed>  $first
     * @param  array<string, mixed>  $second
     */
    public function cutSceneAt(float $at, array $first, array $second): void
    {
        $scene = $this->cuttableScene();
        if (is_string($scene)) {
            $this->dispatch('toast', type: 'warning', message: $scene);

            return;
        }
        $cut = round($this->snapCut($scene, $at), 3);
        $length = (float) ($first['duration'] ?? 0) + (float) ($second['duration'] ?? 0);
        if ($this->nearAnEnd($cut, $length)) {
            $this->dispatch('toast', type: 'warning', message: __('Move the playhead away from the ends of the scene to cut it.'));

            return;
        }

        $narration = $this->cutNarration($scene, $cut, $length);
        if ($narration === null) {
            $this->dispatch('toast', type: 'error', message: __('The narration could not be cut. Nothing was changed.'));

            return;
        }

        $before = collect(self::CUT_COLUMNS)->mapWithKeys(fn (string $c) => [$c => $scene->getAttributes()[$c] ?? null])->all();
        $config = (array) ($scene->config ?? []);

        // A quiz stays with the first piece: a copy on the second would ask the class twice.
        try {
            $piece = DB::transaction(function () use ($scene, $config, $cut, $first, $second, $narration): Scene {
                $copy = $scene->replicate();
                $copy->order = $this->parkingOrder();
                $copy->save();

                $scene->update([
                    ...$narration['first'],
                    'config' => $this->cutConfig($config, $cut, $first, false),
                ]);
                $copy->update([
                    ...$narration['second']($copy),
                    'config' => $this->cutConfig($config, $cut, $second, true),
                    'shots' => SceneCut::shotsAfter($copy->shots, $cut),
                ]);

                return $copy;
            });
        } catch (\RuntimeException) {
            $this->dispatch('toast', type: 'error', message: __('The narration could not be cut. Nothing was changed.'));

            return;
        }
        $this->cutLoop($piece, $cut);

        $this->placeSceneAfterSelected($piece, $scene->id);
        session()->put($this->cutKey(), ['first' => $scene->id, 'second' => $piece->id, 'before' => $before, 'at' => now()->getTimestampMs() / 1000]);
        $this->timelineEpoch++;
        $this->selectSceneInternal($piece->id);
        $this->dispatch('toast', type: 'success', message: __('Scene cut in two. This is the second part.'), duration: 9000, action: [
            'label' => __('Undo'),
            'event' => 'scene:undo-cut',
        ]);
    }

    /**
     * The second piece's moving picture plays on from the cut, not from its first frame again: it gets
     * the rest of the video as its own loop. A cut after the video has already looped, or a server
     * that cannot encode, leaves the whole video on it.
     */
    private function cutLoop(Scene $second, float $cut): void
    {
        $loop = SceneLoop::of($second);
        if ($loop === null || SceneLoop::urlForScene($second) === null) {
            return;
        }
        $length = NarrationCutter::fromConfig()->duration($loop['src']);
        if ($length === null || $cut > $length - SceneCut::MIN_PIECE_S) {
            return;
        }
        $out = "lessons/{$second->lesson_id}/uploads/".Str::random(40).'.mp4';
        if (! VideoTranscoder::make()->tail($loop['src'], $out, $cut)) {
            return;
        }
        $second->update(['config' => SceneLoop::with($second->config ?? [], $out, $loop['poster'])]);
        EncodeSceneLoop::dispatch($second->id, $out);
    }

    /** Put the last cut back: one scene again, as it was before. */
    public function undoSceneCut(): void
    {
        $pending = $this->lastCut();
        session()->forget($this->cutKey());
        $first = $pending ? $this->lesson->scenes()->find($pending['first']) : null;
        if (! $first) {
            return;
        }
        $second = $this->lesson->scenes()->find($pending['second']);

        // The audio the cut made, and nothing else: the original narration is what the first piece goes back to.
        // A lesson copied in between shares the files by path: those stay.
        $made = array_diff(array_filter([$first->audio_path, $second?->audio_path]), [$pending['before']['audio_path'] ?? null]);
        $shared = Scene::withTrashed()->whereIn('audio_path', $made)->whereNotIn('id', array_filter([$first->id, $second?->id]))->pluck('audio_path')->all();
        $made = array_values(array_diff($made, $shared));
        DB::transaction(function () use ($first, $second, $pending): void {
            // Straight onto the row: the cut stored these columns as they were, already cast.
            $first->setRawAttributes([...$first->getAttributes(), ...$pending['before']]);
            $first->save();
            if ($second) {
                $second->update(['order' => $this->parkingOrder()]);
                $second->delete();
                $this->renumberScenes();
            }
        });
        Storage::disk('public')->delete($made);

        $this->timelineEpoch++;
        $this->selectSceneInternal($first->id);
        $this->dispatch('toast', type: 'info', message: __('Cut undone.'));
    }

    /** Is the newest edit the cut? Then Cmd-Z takes the cut back (undoLastEdit asks). */
    private function cutIsNewest(): bool
    {
        $cut = $this->lastCut();
        if ($cut === null) {
            return false;
        }
        $at = (float) $cut['at'];
        $editAt = $this->selectedSceneId ? SceneHistory::lastStepAt($this->selectedSceneId) : null;
        $deletedAt = (float) ($this->deletedScene['at'] ?? 0);

        return ($editAt === null || $editAt <= $at) && $deletedAt <= $at;
    }

    /** The open scene, or why it cannot be cut (a message for the teacher). */
    private function cuttableScene(): Scene|string
    {
        $scene = $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;
        if (! $scene) {
            return __('Open a scene to cut it.');
        }
        if (in_array($scene->kind, SceneCut::UNCUTTABLE_KINDS, true)) {
            return __('A game or a voyage stop cannot be cut.');
        }

        return $scene;
    }

    /** `$at` moved onto a word gap (timed narration) or a pause (untimed narration); left alone with no narration. */
    private function snapCut(Scene $scene, float $at): float
    {
        if (! $scene->audio_path) {
            return round($at, 3);
        }
        $gap = SceneCut::wordGap($scene->audio_alignment, $at);
        if ($gap !== null) {   // more than a second off: past the last word (or before the first), nothing to snap to
            return abs($gap['time'] - $at) <= 1.0 ? $gap['time'] : round($at, 3);
        }

        return SceneCut::nearestSilence(NarrationCutter::fromConfig()->silences($scene->audio_path), $at) ?? round($at, 3);
    }

    /**
     * The narration columns of each piece: the first piece's now, the second's once its row exists
     * (its audio goes in its own folder). Null when the audio could not be cut.
     *
     * @return array{first: array<string, mixed>, second: \Closure(Scene): array<string, mixed>}|null
     */
    private function cutNarration(Scene $scene, float $cut, float $length): ?array
    {
        $script = (string) $scene->script_segment;
        $fresh = $scene->hasFreshAudio();
        $alignment = $scene->audio_alignment;
        $gap = $scene->audio_path ? SceneCut::wordGap($alignment, $cut) : null;
        $spoken = is_array($alignment) ? count($alignment) : 0;

        $audioLength = $scene->audio_path ? NarrationCutter::fromConfig()->duration($scene->audio_path) : null;
        // The narration is over before the cut: all of it stays in the first piece, the second is silent.
        $end = $spoken > 0 ? (float) (end($alignment)['end_time'] ?? 0) : $audioLength;
        if ($scene->audio_path && $end !== null && $end > 0 && $cut >= $end - 0.05) {
            return [
                'first' => [],
                'second' => fn (Scene $copy): array => ['script_segment' => null, 'audio_path' => null, 'audio_alignment' => null, 'audio_script_hash' => null, 'duration_seconds' => null],
            ];
        }

        if ($gap !== null && abs($gap['time'] - $cut) < 0.002) {
            [$alignA, $alignB] = SceneCut::splitAlignment($alignment, $gap['index'], $cut);
            [$textA, $textB] = SceneCut::splitScript($script, $gap['index'] / max(1, $spoken), mb_strlen($script) === $spoken);
        } else {
            $alignA = $alignB = null;
            $total = $audioLength ?? $length;
            [$textA, $textB] = SceneCut::splitScript($script, $total > 0 ? $cut / $total : 0.5);
        }

        if (! $scene->audio_path) {
            return [
                'first' => ['script_segment' => $textA],
                'second' => fn (Scene $copy): array => ['script_segment' => $textB],
            ];
        }

        $cutter = NarrationCutter::fromConfig();
        $ext = pathinfo($scene->audio_path, PATHINFO_EXTENSION) ?: 'mp3';
        $dir = "lessons/{$scene->lesson_id}/scenes";
        $pathA = "{$dir}/{$scene->id}/narration-".Str::lower(Str::random(8)).".{$ext}";
        if (! $cutter->cut($scene->audio_path, $pathA, 0.0, $cut)) {
            return null;
        }
        $source = $scene->audio_path;
        // A stale clip (the script changed since it was read) stays stale in both pieces: the hash only
        // vouches for audio that matched its words.
        $hash = fn (string $text): ?string => $fresh ? sha1($text) : null;
        $seconds = fn (?array $align, float $fallback): int => (int) max(1, ceil($align ? (float) (end($align)['end_time'] ?? $fallback) : $fallback));
        $whole = (float) ($scene->duration_seconds ?? 0);

        return [
            'first' => [
                'script_segment' => $textA,
                'audio_path' => $pathA,
                'audio_alignment' => $alignA,
                'audio_script_hash' => $hash($textA),
                'duration_seconds' => $seconds($alignA, $cut),
            ],
            'second' => function (Scene $copy) use ($cutter, $source, $dir, $ext, $cut, $textB, $alignB, $hash, $seconds, $whole): array {
                $pathB = "{$dir}/{$copy->id}/narration-".Str::lower(Str::random(8)).".{$ext}";
                if (! $cutter->cut($source, $pathB, $cut, null)) {
                    throw new \RuntimeException('narration cut failed');
                }

                return [
                    'script_segment' => $textB,
                    'audio_path' => $pathB,
                    'audio_alignment' => $alignB,
                    'audio_script_hash' => $hash($textB),
                    'duration_seconds' => $seconds($alignB, max(1.0, $whole - $cut)),
                ];
            },
        ];
    }

    /**
     * One piece's config: its half of the timeline (and of a stage's layer keys), its balloons.
     *
     * @param  array<string, mixed>  $config
     * @param  array<string, mixed>  $timeline
     * @return array<string, mixed>
     */
    private function cutConfig(array $config, float $cut, array $timeline, bool $second): array
    {
        $stored = $this->storedTimeline($timeline);
        $config['timeline'] = $stored;
        $config = SceneCut::linesFor($config, $cut, $second);

        if (is_array($config['stage25d']['set'] ?? null)) {
            $span = (float) $stored['duration'];
            if (isset($config['stage25d']['dur_s'])) {
                $config['stage25d']['dur_s'] = $span;
            }
            $config = LayerKeys::applyTo($config, (array) ($timeline['stage25dKeys'] ?? []), $span);
            // The camera's half, split in the browser with the stage's framing code (timeline-cut.js cutCamera).
            if (is_array($timeline['stage25dCamera'] ?? null)) {
                $config = $this->configWithCamera($config, $timeline['stage25dCamera']['camera'] ?? null, $timeline['stage25dCamera']['camera_more'] ?? []);
            }
        }

        return $config;
    }
}
