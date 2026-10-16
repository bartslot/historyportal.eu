<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Services\Support\SceneSplit;
use App\Services\Support\SpeechBalloons;
use Livewire\Attributes\Computed;
use Livewire\Attributes\On;

/**
 * Add ▸ Speech balloon: comic balloons on the selected scene (config.lines, SpeechBalloons). On a
 * split scene a new balloon goes in the active panel. The stage moves them, types in them and
 * pulls their tails (balloon-edit.js → `balloon:change`); the inspector sets the type and the
 * speaker. Each change is one scene save, so the scene history undoes it.
 */
trait EditsSceneBalloons
{
    /** The balloon the inspector edits: `bal_<index in config.lines>`. */
    public ?string $activeBalloonId = null;

    public function addBalloon(string $kind = 'speech'): void
    {
        $scene = $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;
        if (! $scene || ! SceneSplit::allowedFor($scene->kind)) {
            return;   // a quiz, a map, a film: the player draws no balloons there
        }
        $config = $scene->config ?? [];
        $lines = array_values((array) ($config['lines'] ?? []));
        $lines[] = SpeechBalloons::make($kind, $this->editedPanel($scene));
        $config['lines'] = $lines;
        $scene->update(['config' => $config]);

        $id = 'bal_'.(count($lines) - 1);
        $this->activeLayerId = null;
        $this->activeTextId = null;
        $this->activeDioramaId = null;
        $this->activeBalloonId = $id;
        $this->panelView = 'scene';
        $this->selectSceneInternal($scene->id);
        // The stage opens it for typing, its stand-in words selected.
        $this->dispatch('balloon:added', id: $id);
    }

    /** A gesture on the stage (drag, tail, typing): one save. */
    #[On('balloon:change')]
    public function changeBalloon(string $id, array $patch): void
    {
        $this->storeBalloon($id, fn (array $line): array => SpeechBalloons::patch($line, $patch));
    }

    /** The inspector: text, kind, or speaker (a figure's asset id on the balloon's panel, '' = nobody). */
    public function updateBalloon(string $id, string $field, mixed $value): void
    {
        if ($field !== 'speaker') {
            $this->changeBalloon($id, [$field => $value]);

            return;
        }
        $layer = collect($this->balloonSpeakers())->firstWhere('asset_id', (int) $value);
        if ($value !== '' && $value !== null && $layer === null) {
            return;   // not a figure on this panel
        }
        $this->storeBalloon($id, fn (array $line): array => SpeechBalloons::withSpeaker($line, $layer));
    }

    public function deleteBalloon(string $id): void
    {
        $scene = $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;
        $lines = array_values((array) ($scene?->config['lines'] ?? []));
        $i = SpeechBalloons::index($id, $lines);
        if ($i === null) {
            return;
        }
        array_splice($lines, $i, 1);
        $config = $scene->config;
        if (isset($config['timeline'])) {
            $config['timeline'] = SpeechBalloons::timelineWithout($config['timeline'], $i);
        }
        if ($lines === []) {
            unset($config['lines']);
        } else {
            $config['lines'] = $lines;
        }
        $scene->update(['config' => $config]);
        $this->activeBalloonId = null;
        $this->selectSceneInternal($scene->id);
        // The Timeline tab keeps its own copy of the tracks: hand it the re-keyed ones.
        $this->dispatch('timeline-restored', timeline: $config['timeline'] ?? []);
    }

    public function clearActiveBalloon(): void
    {
        $this->activeBalloonId = null;
    }

    /** The selected balloon's line, with its id. */
    #[Computed]
    public function activeBalloon(): ?array
    {
        $lines = array_values((array) ($this->selectedScene['config']['lines'] ?? []));
        $i = $this->activeBalloonId ? SpeechBalloons::index($this->activeBalloonId, $lines) : null;

        return $i === null ? null : ['id' => $this->activeBalloonId] + $lines[$i];
    }

    /**
     * Figures a balloon may point at: those on the panel being edited (every figure of a standard
     * scene). Clicking a balloon in a split panel makes that panel the edited one.
     *
     * @return list<array<string, mixed>>
     */
    public function balloonSpeakers(): array
    {
        return array_values(array_filter(
            $this->sceneArtworkLayers(),
            fn (array $l): bool => empty($l['embed']),
        ));
    }

    /** @param  callable(array<string, mixed>): array<string, mixed>  $change */
    private function storeBalloon(string $id, callable $change): void
    {
        $scene = $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;
        $lines = array_values((array) ($scene?->config['lines'] ?? []));
        $i = SpeechBalloons::index($id, $lines);
        if ($i === null) {
            return;
        }
        $next = $change($lines[$i]);
        if ($next === $lines[$i]) {
            return;
        }
        $lines[$i] = $next;
        $config = $scene->config;
        $config['lines'] = $lines;
        $scene->update(['config' => $config]);
        $this->selectSceneInternal($scene->id);
    }
}
