<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Services\Lessons\TeamGameSpec;
use Livewire\Attributes\Validate;

/**
 * The Step 3 inspector for a team game (kind=game, game_type=team, config.team).
 *
 * Bart's rule: a teacher can change everything and change it back. Every text, item, cost,
 * capacity, fixed item, option, dossier card, timer and reveal is in the draft; "Reset" puts back
 * the copy the lesson was built with (config.team_default), and every save goes through the Scene
 * model, so Cmd-Z (SceneHistory) undoes it step by step.
 *
 * The draft arrives from the browser: TeamGameSpec::clean() cleans it on every save, the same
 * code that cleans a composed spec. The #[Validate] rules only tell the teacher, field by field,
 * when a number is out of range; the clamp is what keeps the data sound.
 */
trait EditsTeamGame
{
    /** @var array<string,mixed> */
    #[Validate([
        'teamDraft.mode' => 'nullable|in:budget,choose,discuss',
        'teamDraft.teams' => 'nullable|integer|min:'.TeamGameSpec::TEAMS_MIN.'|max:'.TeamGameSpec::TEAMS_MAX,
        'teamDraft.minutes' => 'nullable|integer|min:0|max:'.TeamGameSpec::MINUTES_MAX,
        'teamDraft.capacity' => 'nullable|integer|min:1|max:'.TeamGameSpec::CAPACITY_MAX,
        'teamDraft.fixed.*.cost' => 'nullable|integer|min:0|max:'.TeamGameSpec::COST_MAX,
        'teamDraft.items.*.cost' => 'nullable|integer|min:0|max:'.TeamGameSpec::COST_MAX,
        'teamDraft.options.*.image' => 'nullable|string|max:2048',
        'teamDraft.evidence.*.image' => 'nullable|string|max:2048',
        'teamDraft.map' => 'nullable|string|max:2048',
        'teamDraft.fixed.*.image' => 'nullable|string|max:2048',
        'teamDraft.items.*.image' => 'nullable|string|max:2048',
        'teamDraft.presentation' => 'nullable|in:hold,grid',
        'teamDraft.hold.ship' => 'nullable|string|max:2048',
        'teamDraft.hold.backdrop' => 'nullable|string|max:2048',
        'teamDraft.hold.x' => 'nullable|numeric|min:0|max:100',
        'teamDraft.hold.y' => 'nullable|numeric|min:0|max:200',
        'teamDraft.hold.h' => 'nullable|numeric|min:5|max:400',
        'teamDraft.hold.waterline' => 'nullable|numeric|min:0|max:1',
        'teamDraft.hold.draught' => 'nullable|numeric|min:0|max:0.2',
    ])]
    public array $teamDraft = [];

    /** The team-game scene the draft belongs to. */
    public ?int $teamDraftSceneId = null;

    /** The stored game the draft was loaded from: a change underneath it (undo) reloads it. */
    public ?string $teamDraftSource = null;

    public function isTeamGameScene(?Scene $scene): bool
    {
        return $scene !== null && $scene->kind === 'game' && $scene->game_type === 'team';
    }

    /**
     * Keep the draft in step with the selected scene. A status-poll re-select of the same, unchanged
     * scene keeps what the teacher is typing; a different scene, or an undo, reloads it.
     */
    public function syncTeamDraftFor(Scene $scene): void
    {
        if (! $this->isTeamGameScene($scene)) {
            $this->teamDraft = [];
            $this->teamDraftSceneId = null;
            $this->teamDraftSource = null;

            return;
        }

        $stored = $this->storedTeamGame($scene);
        $source = json_encode($stored);
        if ($this->teamDraftSceneId === $scene->id && $this->teamDraftSource === $source) {
            return;
        }

        $this->teamDraftSceneId = $scene->id;
        $this->teamDraftSource = $source;
        $this->teamDraft = $stored;
        $this->resetValidation('teamDraft*');
    }

    /** Blade entry point: every field autosaves through here. */
    public function saveTeamDraft(): void
    {
        $scene = $this->teamGameScene();
        if ($scene === null) {
            return;
        }
        // A mode the browser made up keeps the stored one.
        $this->storeTeamGame($scene, TeamGameSpec::clean($this->teamDraft, $this->storedTeamGame($scene)['mode']));
    }

    /** Switch the mode. Nothing is lost: every mode's fields stay in the game. */
    public function setTeamMode(string $mode): void
    {
        if (! in_array($mode, TeamGameSpec::MODES, true)) {
            return;
        }
        $this->teamDraft['mode'] = $mode;
        $this->saveTeamDraft();
    }

    public function addTeamRow(string $field): void
    {
        $blank = TeamGameSpec::blankRow($field);
        $rows = (array) ($this->teamDraft[$field] ?? []);
        if ($blank === null || count($rows) >= TeamGameSpec::maxRows($field)) {
            return;
        }
        $this->teamDraft[$field] = [...$rows, $blank];
        $this->saveTeamDraft();
    }

    public function removeTeamRow(string $field, int $index): void
    {
        $rows = (array) ($this->teamDraft[$field] ?? []);
        if (TeamGameSpec::blankRow($field) === null || ! array_key_exists($index, $rows)) {
            return;
        }
        unset($rows[$index]);
        $this->teamDraft[$field] = array_values($rows);
        if ($field === 'options') {
            $answer = $this->teamDraft['answer'] ?? null;
            $this->teamDraft['answer'] = TeamGameSpec::answerAfterRemoving(is_numeric($answer) ? (int) $answer : null, $index);
        }
        $this->saveTeamDraft();
    }

    /** Put back the game as the lesson was built (or a blank game of this mode, if it never had one). */
    public function resetTeamGame(): void
    {
        $scene = $this->teamGameScene();
        if ($scene === null) {
            return;
        }
        $default = ($scene->config ?? [])['team_default'] ?? null;
        $mode = $this->storedTeamGame($scene)['mode'];
        $this->storeTeamGame($scene, TeamGameSpec::clean(is_array($default) ? $default : [], $mode));
        $this->resetValidation('teamDraft*');
        $this->dispatch('toast', type: 'info', message: __('Team game reset to the original.'));
    }

    public function teamGameIsDefault(): bool
    {
        $scene = $this->teamGameScene();
        $default = ($scene?->config ?? [])['team_default'] ?? null;

        return ! is_array($default) || TeamGameSpec::clean($default, (string) ($this->teamDraft['mode'] ?? 'budget')) === $this->teamDraft;
    }

    /**
     * saveSelected() writes the whole config from the page's snapshot, which the browser can
     * change. The team game in it goes through the same cleaner as every other team save, and the
     * reset copy is always the stored one: no request may rewrite what Reset puts back.
     *
     * @param  array<string,mixed>  $payload
     * @return array<string,mixed>
     */
    private function withCleanTeamGame(array $payload, Scene $scene): array
    {
        if (! is_array($payload['config'] ?? null)) {
            return $payload;
        }
        $stored = (array) ($scene->config ?? []);
        $config = $payload['config'];
        unset($config['team_default']);
        if (array_key_exists('team_default', $stored)) {
            $config['team_default'] = $stored['team_default'];
        }
        if (array_key_exists('team', $config)) {
            $config['team'] = is_array($config['team'])
                ? TeamGameSpec::clean($config['team'], (string) (($stored['team'] ?? [])['mode'] ?? 'budget'))
                : ($stored['team'] ?? null);
            if ($config['team'] === null) {
                unset($config['team']);
            }
        }
        $payload['config'] = $config;

        return $payload;
    }

    private function teamGameScene(): ?Scene
    {
        if (! $this->teamDraftSceneId) {
            return null;
        }
        $scene = $this->lesson->scenes()->find($this->teamDraftSceneId);

        return $this->isTeamGameScene($scene) ? $scene : null;
    }

    /** @return array<string,mixed> */
    private function storedTeamGame(Scene $scene): array
    {
        $team = ($scene->config ?? [])['team'] ?? [];

        return TeamGameSpec::clean(is_array($team) ? $team : []);
    }

    /** @param array<string,mixed> $team already normalized */
    private function storeTeamGame(Scene $scene, array $team): void
    {
        $scene->config = array_merge($scene->config ?? [], ['team' => $team]);
        $scene->save();

        // saveSelected() writes the whole config from this snapshot; a stale copy would undo us.
        if ($this->selectedSceneId === $scene->id && $this->selectedScene !== null) {
            $this->selectedScene['config'] = $scene->config;
        }
        $this->teamDraft = $team;
        $this->teamDraftSource = json_encode($team);
    }
}
