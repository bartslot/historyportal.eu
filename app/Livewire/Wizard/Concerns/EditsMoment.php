<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Models\SvgAsset;
use App\Services\Lessons\MomentSpec;
use App\Services\Lessons\SceneDialogue;
use Livewire\Attributes\Validate;
use Throwable;

/**
 * The Step 3 inspector for a power-meter moment on a story panel (config.moment, MomentSpec).
 *
 * Bart's rule: a teacher can change everything and change it back. On/off, every word, the meter's
 * label and size, the instruction, the after line, when it starts, a timer, teams, the reaction and
 * the payoff are in the draft; "Reset" puts back the moment the lesson was built with
 * (config.moment_default), and every save goes through the Scene model, so Cmd-Z (SceneHistory)
 * undoes it step by step.
 *
 * The after line's recording belongs to its words: editing the line drops it (the player then shows
 * the line to read), and "Re-narrate" records it again. Narration costs money, so it never runs by
 * itself.
 *
 * The draft arrives from the browser: MomentSpec::clean() cleans it on every save, the same code
 * that cleans a composed spec. The #[Validate] rules only tell the teacher when a number is out of
 * range; the clamp is what keeps the data sound.
 */
trait EditsMoment
{
    /** @var array<string,mixed> */
    #[Validate([
        'momentDraft.goal' => 'nullable|integer|min:1|max:'.MomentSpec::RIGHT_MAX,
        'momentDraft.seconds' => 'nullable|integer|min:0|max:'.MomentSpec::TIMER_MAX,
        'momentDraft.teams' => 'nullable|integer|min:0|max:'.MomentSpec::TEAMS_MAX,
        'momentDraft.react.amount' => 'nullable|numeric|min:0|max:2',
        'momentDraft.payoff.to_x' => 'nullable|numeric|min:-50|max:150',
        'momentDraft.payoff.to_y' => 'nullable|numeric|min:-50|max:150',
        'momentDraft.payoff.duration' => 'nullable|numeric|min:0.3|max:30',
    ])]
    public array $momentDraft = [];

    public ?int $momentDraftSceneId = null;

    /** The stored moment the draft was loaded from: a change underneath it (undo) reloads it. */
    public ?string $momentDraftSource = null;

    public function isMomentScene(?Scene $scene): bool
    {
        return $scene !== null && $scene->kind === 'narration';
    }

    /** Keep the draft in step with the selected scene, without wiping what the teacher is typing. */
    public function syncMomentDraftFor(Scene $scene): void
    {
        if (! $this->isMomentScene($scene)) {
            $this->momentDraft = [];
            $this->momentDraftSceneId = null;
            $this->momentDraftSource = null;

            return;
        }

        $stored = $this->storedMoment($scene);
        $source = json_encode($stored);
        if ($this->momentDraftSceneId === $scene->id && $this->momentDraftSource === $source) {
            return;
        }

        $this->momentDraftSceneId = $scene->id;
        $this->momentDraftSource = $source;
        $this->momentDraft = $stored;
        $this->resetValidation('momentDraft*');
    }

    /** Blade entry point: every field autosaves through here. */
    public function saveMomentDraft(): void
    {
        $scene = $this->momentScene();
        if ($scene !== null) {
            $this->storeMoment($scene, $this->cleanMoment($this->momentDraft, $this->storedMoment($scene)));
        }
    }

    public function toggleMoment(): void
    {
        $this->momentDraft['enabled'] = ! (bool) ($this->momentDraft['enabled'] ?? false);
        $this->saveMomentDraft();
    }

    /** Switch the payoff. Nothing is lost: every payoff's fields stay in the moment. */
    public function setMomentPayoff(string $type): void
    {
        if (! in_array($type, MomentSpec::PAYOFFS, true)) {
            return;
        }
        $this->momentDraft['payoff'] = array_merge((array) ($this->momentDraft['payoff'] ?? []), ['type' => $type]);
        $this->saveMomentDraft();
    }

    public function addMomentWord(string $side): void
    {
        $max = ['right' => MomentSpec::RIGHT_MAX, 'wrong' => MomentSpec::WRONG_MAX][$side] ?? 0;
        $words = (array) ($this->momentDraft['words'][$side] ?? []);
        if (count($words) >= $max) {
            return;
        }
        $this->momentDraft['words'][$side] = [...$words, ''];
        $this->saveMomentDraft();
    }

    public function removeMomentWord(string $side, int $index): void
    {
        $words = (array) ($this->momentDraft['words'][$side] ?? []);
        if (! in_array($side, ['right', 'wrong'], true) || ! array_key_exists($index, $words)) {
            return;
        }
        unset($words[$index]);
        $this->momentDraft['words'][$side] = array_values($words);
        $this->saveMomentDraft();
    }

    /** Put back the moment as the lesson was built (or a moment that is off, if it never had one). */
    public function resetMoment(): void
    {
        $scene = $this->momentScene();
        if ($scene === null) {
            return;
        }
        $default = ($scene->config ?? [])['moment_default'] ?? null;
        $this->storeMoment($scene, is_array($default) ? MomentSpec::clean($default) : MomentSpec::blank());
        $this->resetValidation('momentDraft*');
        $this->dispatch('toast', type: 'info', message: __('Moment reset to the original.'));
    }

    public function momentIsDefault(): bool
    {
        $scene = $this->momentScene();
        $default = ($scene?->config ?? [])['moment_default'] ?? null;

        return is_array($default) ? MomentSpec::clean($default) === $this->momentDraft : $this->momentDraft === MomentSpec::blank();
    }

    /** Record the after line again, in the narrator's voice. Only when the teacher asks: it costs. */
    public function renarrateMomentAfter(): void
    {
        $scene = $this->momentScene();
        $moment = $scene ? $this->storedMoment($scene) : null;
        if ($moment === null || $moment['after'] === '') {
            return;
        }
        try {
            $path = app(SceneDialogue::class)->narratorClip($scene, $moment['after'], (string) ($this->lesson->language ?: 'en'));
        } catch (Throwable $e) {
            report($e);
            $this->dispatch('toast', type: 'error', message: __('The narration could not be recorded. Try again later.'));

            return;
        }
        $this->storeMoment($scene, array_merge($moment, ['after_audio' => '/storage/'.$path]));
        $this->dispatch('toast', type: 'success', message: __('After line narrated.'));
    }

    /**
     * The panel's figure layers a reaction or a payoff can use, for the editor's pickers.
     *
     * @return array<int,string> asset_id => title
     */
    public function momentLayers(): array
    {
        $scene = $this->momentScene();
        $ids = array_values(array_filter(array_map(
            fn ($l): ?int => is_array($l) && isset($l['asset_id']) ? (int) $l['asset_id'] : null,
            (array) (((array) ($scene?->shots ?? []))[0]['layers'] ?? []),
        )));

        return $ids === [] ? [] : SvgAsset::query()->whereIn('id', $ids)->pluck('title', 'id')
            ->map(fn ($title, $id): string => (string) ($title ?: "#{$id}"))->all();
    }

    /**
     * The browser's draft, cleaned against what is stored. The recording never comes from the
     * browser: it is the stored one while the after line is unchanged, and gone when it changed.
     *
     * @param  array<string,mixed>  $draft
     * @param  array<string,mixed>  $stored
     * @return array<string,mixed>
     */
    private function cleanMoment(array $draft, array $stored): array
    {
        $clean = MomentSpec::clean($draft, $stored);
        $clean['after_audio'] = $clean['after'] === $stored['after'] ? $stored['after_audio'] : '';

        return $clean;
    }

    /**
     * saveSelected() writes the whole config from the page's snapshot, which the browser can change.
     * The moment in it goes through the same cleaner, and the reset copy is always the stored one.
     *
     * @param  array<string,mixed>  $payload
     * @return array<string,mixed>
     */
    private function withCleanMoment(array $payload, Scene $scene): array
    {
        if (! is_array($payload['config'] ?? null)) {
            return $payload;
        }
        $stored = (array) ($scene->config ?? []);
        $config = $payload['config'];
        unset($config['moment_default']);
        if (array_key_exists('moment_default', $stored)) {
            $config['moment_default'] = $stored['moment_default'];
        }
        if (array_key_exists('moment', $config)) {
            if (is_array($config['moment'])) {
                $config['moment'] = $this->cleanMoment($config['moment'], $this->storedMoment($scene));
            } elseif (array_key_exists('moment', $stored)) {
                $config['moment'] = $stored['moment'];
            } else {
                unset($config['moment']);
            }
        }
        $payload['config'] = $config;

        return $payload;
    }

    private function momentScene(): ?Scene
    {
        if (! $this->momentDraftSceneId) {
            return null;
        }
        $scene = $this->lesson->scenes()->find($this->momentDraftSceneId);

        return $this->isMomentScene($scene) ? $scene : null;
    }

    /** @return array<string,mixed> */
    private function storedMoment(Scene $scene): array
    {
        $moment = ($scene->config ?? [])['moment'] ?? null;

        return is_array($moment) ? MomentSpec::clean($moment) : MomentSpec::blank();
    }

    /** @param array<string,mixed> $moment already clean */
    private function storeMoment(Scene $scene, array $moment): void
    {
        $scene->config = array_merge($scene->config ?? [], ['moment' => $moment]);
        $scene->save();

        // saveSelected() writes the whole config from this snapshot; a stale copy would undo us.
        if ($this->selectedSceneId === $scene->id && $this->selectedScene !== null) {
            $this->selectedScene['config'] = $scene->config;
        }
        $this->momentDraft = $moment;
        $this->momentDraftSource = json_encode($moment);
    }
}
