<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Jobs\GenerateChoicesAudio;
use App\Models\Scene;
use App\Services\Lessons\ChoicePrompt;
use App\Services\Lessons\SceneLinks;
use App\Support\NarrationBudget;

/**
 * The "Choices" section of Scene details: buttons at the end of a scene that jump to another scene of the
 * lesson, or mark the scene as an ending (App\Services\Lessons\SceneLinks). Scene lookups go through
 * $this->lesson->scenes(), so a teacher only ever links within their own lesson.
 *
 * The narrator reads the choices out when they fade in: a prompt line (App\Services\Lessons\ChoicePrompt),
 * then each choice. Any change to those words is recorded again (GenerateChoicesAudio) and, like a script
 * edit, paid from the lesson's narration allowance (NarrationBudget) by how much changed.
 */
trait EditsSceneLinks
{
    public function addSceneLink(int $sceneId): void
    {
        $scene = $this->lesson->scenes()->findOrFail($sceneId);
        $links = $this->linksOf($scene);
        if (count($links) >= SceneLinks::MAX_LINKS) {
            $this->dispatch('toast', type: 'error', message: __('A scene can show at most :n choices.', ['n' => SceneLinks::MAX_LINKS]));

            return;
        }
        // The next scene in the list is the likeliest target; the teacher changes it in one click.
        $next = $this->lesson->scenes()->where('order', '>', $scene->order)->orderBy('order')->value('id');
        $links[] = ['label' => '', 'to' => $next !== null ? (int) $next : null];
        $this->writeSceneLinks($scene, $links, $this->endsHere($scene));
    }

    /**
     * Add > Choices (and the old "Decision point" entry): the Choices layer with two choices on the scene it was opened at (else the selected or last scene),
     * aimed at the next two scenes, and that scene selected so the teacher sees its Choices section.
     */
    public function addChoicesToScene(?int $sceneId): void
    {
        $scene = ($sceneId ? $this->lesson->scenes()->find($sceneId) : null)
            ?? ($this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null)
            ?? $this->lesson->scenes()->orderByDesc('order')->first();
        if ($scene === null || $scene->kind === 'game' || $scene->branch_role !== null) {
            $this->dispatch('toast', type: 'error', message: __('Choices go on a story scene. Add or select one first.'));

            return;
        }
        $links = $this->linksOf($scene);
        $after = $this->lesson->scenes()->where('order', '>', $scene->order)->orderBy('order')->limit(2)->pluck('id')->all();
        foreach ([0, 1] as $i) {
            if (count($links) < SceneLinks::MAX_LINKS) {
                $links[] = ['label' => '', 'to' => isset($after[$i]) ? (int) $after[$i] : null];
            }
        }
        if (ChoicePrompt::prompt($scene->config) === '') {
            $scene->config = ['links_prompt' => ChoicePrompt::forNewChoices($scene)] + ($scene->config ?? []);
        }
        $this->writeSceneLinks($scene, $links, false);
        if ($this->selectedSceneId !== $scene->id) {
            $this->selectScene($scene->id);
        }
        $this->dispatch('inspector-open');
        $this->dispatch('toast', message: __('Two choices added. Set where each one goes.'));
    }

    public function saveSceneLink(int $sceneId, int $index, string $field, mixed $value): void
    {
        if (! in_array($field, ['label', 'to'], true)) {
            return;
        }
        $scene = $this->lesson->scenes()->findOrFail($sceneId);
        $links = $this->linksOf($scene);
        if (! isset($links[$index])) {
            return;
        }
        $links[$index][$field] = $field === 'label' ? SceneLinks::label($value) : (is_numeric($value) ? (int) $value : null);
        $this->writeSceneLinks($scene, $links, $this->endsHere($scene));
    }

    /**
     * An old Decision point (a question scene and its option scenes, branch_group) becomes the Choices layer
     * (Bart 2026-11-21, on prod: "the ux is missing for the choice"). Nothing is deleted: the question scene
     * gets one choice per option scene, each option scene goes on past the others to the scene after the
     * group (or ends the lesson when there is none), and the scenes are ordinary story scenes again.
     * Class meters and their effects are not carried over: a Choices layer has none.
     */
    public function convertDecisionToChoices(int $sceneId): void
    {
        $scene = $this->lesson->scenes()->findOrFail($sceneId);
        if ($scene->branch_group === null) {
            return;
        }
        $group = $this->lesson->scenes()->where('branch_group', $scene->branch_group)->orderBy('order')->get();
        $options = $group->filter(fn (Scene $s): bool => str_starts_with((string) $s->branch_role, 'option'))->values();
        $question = $group->first(fn (Scene $s): bool => $s->branch_role === 'question')
            ?? $this->lesson->scenes()->where('order', '<', $group->min('order'))->orderByDesc('order')->first();
        if ($options->isEmpty() || $question === null) {
            $this->dispatch('toast', type: 'error', message: __('Choices go on a story scene. Add or select one first.'));

            return;
        }
        $after = $this->lesson->scenes()->where('order', '>', $group->max('order'))->orderBy('order')->value('id');
        // Each option's button text, read before the branch fields are cleared below.
        $links = $options->take(SceneLinks::MAX_LINKS)
            ->map(fn (Scene $o): array => ['label' => SceneLinks::label($o->branch_choice_label ?: $o->chapterName()), 'to' => (int) $o->id])
            ->values()->all();

        foreach ($group as $member) {
            $member->update(['branch_group' => null, 'branch_role' => null, 'branch_choice_label' => null]);
        }
        foreach ($options as $i => $option) {
            // The last option scene runs on into the scene after the group by itself; the others jump there.
            $last = $i === $options->count() - 1;
            if ($after === null) {
                $this->writeSceneLinks($option->fresh(), [], true);
            } elseif (! $last) {
                $this->writeSceneLinks($option->fresh(), [['label' => '', 'to' => (int) $after]], false);
            }
        }
        $question = $question->fresh();
        if (ChoicePrompt::prompt($question->config) === '') {
            $question->config = ['links_prompt' => ChoicePrompt::forNewChoices($question)] + ($question->config ?? []);
        }
        $this->writeSceneLinks($question, $links, false);

        unset($this->selectedSceneModel, $this->scenes);
        $this->selectScene($question->id);
        $this->dispatch('inspector-open');
        $this->dispatch('toast', message: __('This decision point is now a Choices layer on the scene.'));
    }

    /** What the narrator says before reading the choices out. Emptied, the narrator reads only the choices. */
    public function saveChoicesPrompt(int $sceneId, mixed $text): void
    {
        $scene = $this->lesson->scenes()->findOrFail($sceneId);
        if ($this->linksOf($scene) === []) {
            return;
        }
        $scene->config = ['links_prompt' => ChoicePrompt::clean($text)] + ($scene->config ?? []);
        $this->writeSceneLinks($scene, $this->linksOf($scene), $this->endsHere($scene));
    }

    public function removeSceneLink(int $sceneId, int $index): void
    {
        $scene = $this->lesson->scenes()->findOrFail($sceneId);
        $links = $this->linksOf($scene);
        unset($links[$index]);
        $this->writeSceneLinks($scene, array_values($links), $this->endsHere($scene));
    }

    public function setSceneEnding(int $sceneId, bool $ending): void
    {
        $scene = $this->lesson->scenes()->findOrFail($sceneId);
        // An ending has nowhere to go: its choices would never show.
        $this->writeSceneLinks($scene, $ending ? [] : $this->linksOf($scene), $ending);
    }

    /**
     * Every scene a link can lead to, in lesson order, named the way the scene list names them.
     *
     * @return list<array{id: int, label: string}>
     */
    public function sceneLinkTargets(): array
    {
        return $this->lesson->scenes()->orderBy('order')->get(['id', 'order', 'chapter_name', 'location'])
            ->values()
            ->map(fn (Scene $s, int $i): array => [
                'id' => (int) $s->id,
                'label' => ($i + 1).'. '.$s->chapterName(),
            ])
            ->all();
    }

    /**
     * The choice keys of a scene come from the database, never from the inspector's copy: they are written
     * by the methods above and by GenerateChoicesAudio, which the inspector never sees.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function withStoredSceneLinks(array $payload, Scene $scene): array
    {
        if (! array_key_exists('config', $payload) || ! is_array($payload['config'])) {
            return $payload;
        }
        $keys = ['links', 'ending', 'links_prompt', 'links_audio'];
        $stored = array_intersect_key($scene->config ?? [], array_flip($keys));
        $payload['config'] = $stored + array_diff_key($payload['config'], array_flip($keys));

        return $payload;
    }

    /**
     * Have the narrator record the choices again when their words changed. Paid like a script edit: only
     * the change, from the lesson's allowance. Out of allowance, the choices still work, without a voice.
     */
    private function narrateChoices(Scene $scene): void
    {
        $locale = ChoicePrompt::locale($this->lesson);
        $spoken = ChoicePrompt::spoken($scene->config, $locale);
        $recorded = (string) ((($scene->config ?? [])['links_audio'] ?? [])['text'] ?? '');
        if ($spoken === '' || $spoken === $recorded) {
            return;
        }
        if (! NarrationBudget::charge($this->lesson, NarrationBudget::costOfEdit($recorded, $spoken))) {
            $this->warnBudgetSpent();

            return;
        }
        GenerateChoicesAudio::dispatch($scene->id)->onQueue('narrate');
        // Prod's queue runs from a once-a-minute cron: start this one as the request ends (see regenerate()).
        if (config('queue.default') !== 'sync') {
            app()->terminating(fn () => \Illuminate\Support\Facades\Artisan::call('queue:work', ['--once' => true, '--queue' => 'narrate', '--tries' => 2]));
        }
    }

    /** @return list<array{label: string, to: int|null}> */
    private function linksOf(Scene $scene): array
    {
        return SceneLinks::clean(($scene->config ?? [])['links'] ?? [], $this->lesson->scenes()->pluck('id')->all());
    }

    private function endsHere(Scene $scene): bool
    {
        return (($scene->config ?? [])['ending'] ?? false) === true;
    }

    /** @param list<array{label: string, to: int|null}> $links */
    private function writeSceneLinks(Scene $scene, array $links, bool $ending): void
    {
        $scene->config = SceneLinks::into($scene->config, SceneLinks::clean($links, $this->lesson->scenes()->pluck('id')->all()), $ending);
        $scene->save();
        $this->narrateChoices($scene);
        // The inspector and the rail read these per request: let them see the new links.
        unset($this->selectedSceneModel, $this->scenes);
        // The object list shows a Choices row while the scene has the layer.
        $this->dispatch('scene-choices', sceneId: $scene->id, has: $links !== [] || $ending);

        // saveSelected() writes the whole config back from the inspector's copy: keep it in step,
        // or the next edit of anything else in this scene would put the old links back.
        if ($this->selectedSceneId === $scene->id && $this->selectedScene !== null) {
            $this->selectedScene['config'] = $scene->config;
        }
    }
}
