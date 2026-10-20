<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Support\LessonProblems;
use Livewire\Attributes\Computed;

/**
 * The editor's side of LessonProblems: the count in the header, the Problems view in the one
 * inspector panel (panelView 'problems'), and fixing one problem or all of them through the
 * editor's own regenerate(), which fences guests and queues the job for that step.
 */
trait FixesLessonProblems
{
    /** @return list<array<string, mixed>> */
    #[Computed]
    public function problems(): array
    {
        return LessonProblems::for($this->lesson);
    }

    /** @return array<int, list<array<string, mixed>>> */
    #[Computed]
    public function problemsByScene(): array
    {
        $by = [];
        foreach ($this->problems as $problem) {
            $by[$problem['scene_id']][] = $problem;
        }

        return $by;
    }

    public function openProblems(): void
    {
        $this->titleSelected = false;
        $this->panelView = 'problems';
        $this->inspectorOpen = true;
    }

    /** A row in the Problems view: that scene, with its error row at the top of its panel. */
    public function showProblemScene(int $sceneId): void
    {
        $this->selectScene($sceneId);
        $this->panelView = 'scene';
    }

    public function fixProblem(int $sceneId, string $step): void
    {
        if (! in_array($step, LessonProblems::FIXABLE, true) || ! $this->lesson->scenes()->whereKey($sceneId)->exists()) {
            return;
        }
        $this->regenerate($sceneId, $step);
        unset($this->problems, $this->problemsByScene);
    }

    /**
     * What "fix all" will do, for its confirm: scenes touched, narrations re-spoken and their
     * characters (narration is billed per character), pictures and scripts made again, and the
     * problems only the teacher can fix.
     *
     * @return array{scenes: int, narrations: int, characters: int, pictures: int, scripts: int, manual: int}
     */
    public function fixPlan(): array
    {
        $fixes = $this->autoFixes();
        $scenes = $this->lesson->scenes()->whereIn('id', array_column($fixes, 'scene_id'))->get()->keyBy('id');
        $narrations = array_filter($fixes, fn (array $f) => $f['fix'] === 'audio');

        return [
            'scenes' => count(array_unique(array_column($fixes, 'scene_id'))),
            'narrations' => count($narrations),
            'characters' => array_sum(array_map(fn (array $f) => mb_strlen((string) $scenes[$f['scene_id']]?->script_segment), $narrations)),
            'pictures' => count(array_filter($fixes, fn (array $f) => $f['fix'] === 'image')),
            'scripts' => count(array_filter($fixes, fn (array $f) => $f['fix'] === 'script')),
            'manual' => count(array_filter($this->problems, fn (array $p) => $p['fix'] === null)),
        ];
    }

    public function fixAllProblems(): void
    {
        if ($this->guestDemoCannotGenerate()) {
            return;
        }
        foreach ($this->autoFixes() as $fix) {
            $this->regenerate($fix['scene_id'], $fix['fix']);
        }
        unset($this->problems, $this->problemsByScene);
    }

    /** One fix per scene and step: a scene with a failed and a missing voice is re-spoken once. */
    private function autoFixes(): array
    {
        $fixes = [];
        foreach ($this->problems as $problem) {
            if ($problem['fix'] !== null) {
                $fixes[$problem['scene_id'].':'.$problem['fix']] = $problem;
            }
        }

        return array_values($fixes);
    }
}
