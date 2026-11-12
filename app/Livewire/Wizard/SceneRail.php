<?php

declare(strict_types=1);

namespace App\Livewire\Wizard;

use App\Models\Lesson;
use App\Models\Scene;
use App\Support\LessonProblems;
use Illuminate\Contracts\View\View;
use Illuminate\Support\Collection;
use Livewire\Attributes\Locked;
use Livewire\Attributes\On;
use Livewire\Component;

/**
 * The editor's scene rail, on its own: a click in the editor (a layer, a tab) re-renders the editor, and the rail of a
 * 163-scene lesson was a third of every response (776 KB). It re-renders only when what it shows changed: the editor
 * compares fingerprint() after each render and sends rail-refresh. The selected thumb is marked in the browser
 * (rail-selected), so moving the selection never re-renders it either.
 */
final class SceneRail extends Component
{
    #[Locked]
    public int $lessonId;

    /** The selection at first paint; after that the browser moves the mark. */
    public ?int $selectedSceneId = null;

    public bool $titleSelected = false;

    /** Everything the rail draws, so the editor knows when to refresh it. */
    public static function fingerprint(Lesson $lesson, Collection $scenes, array $problemsByScene): string
    {
        return md5((string) json_encode([
            $lesson->title, $lesson->titleBgUrl(), $problemsByScene,
            $scenes->map(fn (Scene $s) => [
                $s->id, $s->order, $s->status, $s->kind, $s->game_type, $s->year, $s->location, $s->chapter_name,
                $s->image_path, $s->branch_role, $s->config['overview'] ?? null, $s->config['stage25d']['beat'] ?? null,
            ])->all(),
        ]));
    }

    /** The editor saw the rail's content change. */
    #[On('rail-refresh')]
    public function refresh(): void {}

    public function render(): View
    {
        $lesson = Lesson::findOrFail($this->lessonId);
        abort_unless(auth()->user()?->canManage($lesson), 403);
        $problems = [];
        foreach (LessonProblems::for($lesson) as $problem) {
            $problems[$problem['scene_id']][] = $problem;
        }

        return view('livewire.wizard.scene-rail', [
            'scenes' => $lesson->scenes()->ordered()->get(),
            'problems' => $problems,
            'titleScreen' => ['title' => $lesson->title, 'image' => $lesson->titleBgUrl(), 'selected' => $this->titleSelected],
        ]);
    }
}
