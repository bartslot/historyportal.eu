<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Services\Lessons\PredictSpec;
use Livewire\Attributes\Validate;

/**
 * The Step 3 inspector for a predict moment (kind=game, game_type=predict, config.predict): the
 * question, what happened, the debrief question and the rubric the WHY answers are graded against.
 *
 * The draft arrives from the browser: PredictSpec::normalize() cleans it on every save, the same code
 * that cleans a composed spec and a generated outline. Every save goes through the Scene model, so
 * Cmd-Z (SceneHistory) undoes it step by step. Same shape as EditsTeamGame.
 */
trait EditsPredict
{
    /** @var array<string,mixed> */
    #[Validate([
        'predictDraft.question' => 'nullable|string|max:300',
        'predictDraft.outcome' => 'nullable|string|max:300',
        'predictDraft.debrief' => 'nullable|string|max:300',
        'predictDraft.mode' => 'nullable|in:paper,typed',
        'predictDraft.seconds' => 'nullable|integer|min:0|max:'.PredictSpec::SECONDS_MAX,
        'predictDraft.rubric.key_cause' => 'nullable|string|max:300',
        'predictDraft.rubric.concepts.*' => 'nullable|string|max:80',
        'predictDraft.rubric.misconceptions.*' => 'nullable|string|max:200',
    ])]
    public array $predictDraft = [];

    public ?int $predictDraftSceneId = null;

    /** The stored moment the draft was loaded from: a change underneath it (undo) reloads it. */
    public ?string $predictDraftSource = null;

    public function isPredictScene(?Scene $scene): bool
    {
        return $scene !== null && $scene->kind === 'game' && $scene->game_type === 'predict';
    }

    /** Keep the draft in step with the selected scene; a poll re-select keeps what is being typed. */
    public function syncPredictDraftFor(Scene $scene): void
    {
        if (! $this->isPredictScene($scene)) {
            $this->predictDraft = [];
            $this->predictDraftSceneId = null;
            $this->predictDraftSource = null;

            return;
        }
        $stored = $this->storedPredict($scene);
        $source = json_encode($stored);
        if ($this->predictDraftSceneId === $scene->id && $this->predictDraftSource === $source) {
            return;
        }
        $this->predictDraftSceneId = $scene->id;
        $this->predictDraftSource = $source;
        $this->predictDraft = $stored;
        $this->resetValidation('predictDraft*');
    }

    /** Blade entry point: every field autosaves through here. */
    public function savePredictDraft(): void
    {
        $scene = $this->predictScene();
        if ($scene !== null) {
            $this->storePredict($scene, PredictSpec::normalize($this->predictDraft));
        }
    }

    /** How the board starts: the writing time only (paper), or the teacher's text box open (typed). */
    public function setPredictMode(string $mode): void
    {
        if (! in_array($mode, PredictSpec::MODES, true)) {
            return;
        }
        $this->predictDraft['mode'] = $mode;
        $this->savePredictDraft();
    }

    /** @param 'concepts'|'misconceptions' $field */
    public function addPredictRow(string $field): void
    {
        $max = ['concepts' => PredictSpec::CONCEPTS_MAX, 'misconceptions' => PredictSpec::MISCONCEPTIONS_MAX][$field] ?? 0;
        $rows = (array) ($this->predictDraft['rubric'][$field] ?? []);
        if (count($rows) >= $max) {
            return;
        }
        $this->predictDraft['rubric'][$field] = [...$rows, ''];
        $this->savePredictDraft();
    }

    public function removePredictRow(string $field, int $index): void
    {
        if (! in_array($field, ['concepts', 'misconceptions'], true)) {
            return;
        }
        $rows = (array) ($this->predictDraft['rubric'][$field] ?? []);
        unset($rows[$index]);
        $this->predictDraft['rubric'][$field] = array_values($rows);
        $this->savePredictDraft();
    }

    /**
     * saveSelected() writes the whole config from the page's snapshot, which the browser can change:
     * the moment in it goes through the same cleaner as every other predict save.
     *
     * @param  array<string,mixed>  $payload
     * @return array<string,mixed>
     */
    private function withCleanPredict(array $payload): array
    {
        if (is_array($payload['config'] ?? null) && array_key_exists('predict', $payload['config'])) {
            $payload['config']['predict'] = PredictSpec::normalize(is_array($payload['config']['predict']) ? $payload['config']['predict'] : []);
        }

        return $payload;
    }

    private function predictScene(): ?Scene
    {
        if (! $this->predictDraftSceneId) {
            return null;
        }
        $scene = $this->lesson->scenes()->find($this->predictDraftSceneId);

        return $this->isPredictScene($scene) ? $scene : null;
    }

    /** @return array<string,mixed> */
    private function storedPredict(Scene $scene): array
    {
        $predict = ($scene->config ?? [])['predict'] ?? [];

        return PredictSpec::normalize(is_array($predict) ? $predict : []);
    }

    private function storePredict(Scene $scene, array $predict): void
    {
        $scene->config = array_merge($scene->config ?? [], ['predict' => $predict]);
        $scene->save();

        // saveSelected() writes the whole config from this snapshot; a stale copy would undo us.
        if ($this->selectedSceneId === $scene->id && $this->selectedScene !== null) {
            $this->selectedScene['config'] = $scene->config;
        }
        $this->predictDraft = $predict;
        $this->predictDraftSource = json_encode($predict);
    }
}
