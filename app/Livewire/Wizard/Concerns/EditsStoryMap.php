<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Services\Lessons\ChoicePrompt;
use App\Services\Lessons\SceneLinks;
use App\Support\MediaUrl;

/**
 * The story map: the lesson's scenes as nodes on a canvas, their choices as nodes of their own, and lines for
 * where the class goes next (Bart, 2026-11-24: "I would like our branching story to be managed like this").
 * It is a second view of the same data as the Choices layer (EditsSceneLinks, scene.config.links): every
 * rewire goes through those methods, so the narrator, the rail and the inspector stay in step.
 *
 * The one thing the map adds is where the teacher put each node: lesson.story_map, editor layout only. It is
 * saved quietly (no content version, no scene undo step, no player cache bust), because moving a card around
 * changes nothing a class sees.
 */
trait EditsStoryMap
{
    /** How far from the origin a node may sit, in map pixels: far beyond any real story, short of a broken number. */
    private const STORY_MAP_LIMIT = 100000;

    /**
     * Everything the map draws, read fresh: the scenes in lesson order with their links, and the saved layout.
     *
     * @return array{scenes: list<array<string, mixed>>, layout: array{scenes: array<string, array{0: int, 1: int}>, choices: array<string, array{0: int, 1: int}>}}
     */
    public function storyMap(): array
    {
        $scenes = $this->lesson->scenes()->ordered()->get();
        $ids = $scenes->pluck('id')->map(fn ($id): int => (int) $id)->all();

        return [
            'scenes' => $scenes->values()->map(fn (Scene $s, int $i): array => [
                'id' => (int) $s->id,
                'number' => $i + 1,
                'name' => $s->chapterName(),
                'kind' => (string) $s->kind,
                'image' => $s->image_path ? MediaUrl::of($s->image_path) : null,
                'ending' => (($s->config ?? [])['ending'] ?? false) === true,
                'links' => SceneLinks::clean(($s->config ?? [])['links'] ?? [], $ids),
                'prompt' => ChoicePrompt::prompt($s->config ?? []),
                // Choices go on a story scene (addChoicesToScene): not on a game, not inside an old decision point.
                'canChoose' => $s->kind !== 'game' && $s->branch_role === null,
            ])->all(),
            'layout' => $this->storyMapLayout($ids),
        ];
    }

    /**
     * Where the teacher dragged the nodes. Unknown scenes and nonsense numbers are dropped; a scene left out
     * keeps its place, so the map can send only what moved.
     *
     * @param  mixed  $layout  {scenes: {id: [x, y]}, choices: {id: [x, y]}}
     */
    public function saveStoryMapLayout(mixed $layout): void
    {
        if (! is_array($layout)) {
            return;
        }
        $ids = $this->lesson->scenes()->pluck('id')->map(fn ($id): int => (int) $id)->all();
        $stored = $this->storyMapLayout($ids);
        foreach (['scenes', 'choices'] as $group) {
            foreach ((array) ($layout[$group] ?? []) as $id => $point) {
                $p = $this->storyMapPoint($point);
                if ($p !== null && in_array((int) $id, $ids, true)) {
                    $stored[$group][(string) (int) $id] = $p;
                }
            }
        }
        $this->lesson->forceFill(['story_map' => $stored])->saveQuietly();
    }

    /**
     * Where a scene without choices goes when it is over: 'next' (the next scene in the list, as always), 'end'
     * (the lesson ends here) or a scene id (straight on to that scene, a link without words: SceneLinks).
     */
    public function setSceneNext(int $sceneId, mixed $to): void
    {
        $scene = $this->lesson->scenes()->findOrFail($sceneId);
        if ($this->hasChoiceButtons($this->linksOf($scene))) {
            // Its choices decide where it goes: the map rewires those one by one.
            return;
        }
        match (true) {
            $to === 'end' => $this->writeSceneLinks($scene, [], true),
            is_numeric($to) && (int) $to !== $scene->id => $this->writeSceneLinks($scene, [['label' => '', 'to' => (int) $to]], false),
            default => $this->writeSceneLinks($scene, [], false),
        };
    }

    /**
     * A new option dragged out of a scene onto another (Bart, 2026-11-26: "when I drag an option I expect there to be a
     * choice at the end of the scene that I am dragging the option of"): one more choice on the scene's Choices
     * layer, going to that scene and named after it until the teacher writes the words. A straight jump the scene
     * had becomes a choice too, so the new one is not the only way on; an ending stops being one.
     */
    public function addSceneChoiceTo(int $sceneId, int $to): void
    {
        $scene = $this->lesson->scenes()->findOrFail($sceneId);
        $target = $this->lesson->scenes()->find($to);
        if ($target === null || $target->id === $scene->id) {
            return;
        }
        if ($scene->kind === 'game' || $scene->branch_role !== null) {
            // Choices go on a story scene: from anything else the line is its one way on.
            $this->setSceneNext($sceneId, $to);

            return;
        }
        $links = $this->linksOf($scene);
        if (count($links) >= SceneLinks::MAX_LINKS) {
            $this->dispatch('toast', type: 'error', message: __('A scene can show at most :n choices.', ['n' => SceneLinks::MAX_LINKS]));

            return;
        }
        $named = fn (?int $id): string => $id === null ? '' : SceneLinks::label($this->lesson->scenes()->find($id)?->chapterName() ?? '');
        $links = array_map(fn (array $l): array => $l['label'] === '' ? ['label' => $named($l['to']), 'to' => $l['to']] : $l, $links);
        $links[] = ['label' => $named($target->id), 'to' => (int) $target->id];
        if (count($links) >= 2 && ChoicePrompt::prompt($scene->config) === '') {
            $scene->config = ['links_prompt' => ChoicePrompt::forNewChoices($scene)] + ($scene->config ?? []);
        }
        $this->writeSceneLinks($scene, $links, false);
    }

    /**
     * The map's undo: a scene's links and ending put back as they were before a change made on the map. Cleaned
     * like every write (SceneLinks), so it can only link within this lesson.
     */
    public function restoreSceneLinks(int $sceneId, mixed $links, bool $ending): void
    {
        $scene = $this->lesson->scenes()->findOrFail($sceneId);
        $this->writeSceneLinks($scene, is_array($links) ? $links : [], $ending);
    }

    /** The Choices layer off this scene: it goes on to the next scene again. */
    public function removeSceneChoices(int $sceneId): void
    {
        $scene = $this->lesson->scenes()->findOrFail($sceneId);
        $this->writeSceneLinks($scene, [], false);
    }

    /**
     * A scene shows choice buttons unless its only link has no words, which is a straight jump.
     *
     * @param  list<array{label: string, to: int|null}>  $links
     */
    private function hasChoiceButtons(array $links): bool
    {
        return count($links) > 1 || (count($links) === 1 && $links[0]['label'] !== '');
    }

    /**
     * @param  list<int>  $ids
     * @return array{scenes: array<string, array{0: int, 1: int}>, choices: array<string, array{0: int, 1: int}>}
     */
    private function storyMapLayout(array $ids): array
    {
        $saved = is_array($this->lesson->story_map) ? $this->lesson->story_map : [];
        $out = ['scenes' => [], 'choices' => []];
        foreach (['scenes', 'choices'] as $group) {
            foreach ((array) ($saved[$group] ?? []) as $id => $point) {
                $p = $this->storyMapPoint($point);
                if ($p !== null && in_array((int) $id, $ids, true)) {
                    $out[$group][(string) (int) $id] = $p;
                }
            }
        }

        return $out;
    }

    /** @return array{0: int, 1: int}|null */
    private function storyMapPoint(mixed $point): ?array
    {
        if (! is_array($point) || ! is_numeric($point[0] ?? null) || ! is_numeric($point[1] ?? null)) {
            return null;
        }
        $x = (float) $point[0];
        $y = (float) $point[1];
        if (! is_finite($x) || ! is_finite($y) || abs($x) > self::STORY_MAP_LIMIT || abs($y) > self::STORY_MAP_LIMIT) {
            return null;
        }

        return [(int) round($x), (int) round($y)];
    }
}
