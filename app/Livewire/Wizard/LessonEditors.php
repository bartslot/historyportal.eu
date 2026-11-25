<?php

declare(strict_types=1);

namespace App\Livewire\Wizard;

use App\Models\Lesson;
use App\Models\User;
use App\Services\Collaboration\LessonCollaboration;
use Illuminate\Contracts\View\View;
use Livewire\Attributes\Locked;
use Livewire\Attributes\Validate;
use Livewire\Component;

/**
 * Who may edit this lesson besides its owner (lesson_editors). The owner adds an account by its email
 * and removes it again; everyone else in the editor only sees the list.
 */
final class LessonEditors extends Component
{
    #[Locked]
    public int $lessonId;

    #[Validate('required|email|max:255')]
    public string $email = '';

    public function mount(int $lessonId): void
    {
        $this->lessonId = $lessonId;
        abort_unless((bool) auth()->user()?->canEdit($this->lesson()), 403);
    }

    public function add(): void
    {
        $lesson = $this->ownLesson();
        $this->validate();

        $user = User::query()
            ->whereRaw('lower(email) = ?', [mb_strtolower(trim($this->email))])
            ->where('is_guest_demo', false)
            ->whereIn('role', ['teacher', 'admin'])
            ->first();

        if ($user === null) {
            $this->addError('email', __('No teacher account uses this email address.'));

            return;
        }
        if ((int) $user->id === (int) $lesson->teacher_id) {
            $this->addError('email', __('This is the lesson\'s owner.'));

            return;
        }

        $lesson->editors()->syncWithoutDetaching([$user->id]);
        $this->reset('email');
    }

    public function remove(int $userId): void
    {
        $lesson = $this->ownLesson();
        $lesson->editors()->detach($userId);
        // Out of the lesson now: whatever they held is free at once.
        app(LessonCollaboration::class)->leave($lesson, User::query()->findOrFail($userId));
    }

    public function render(): View
    {
        $lesson = $this->lesson();

        return view('livewire.wizard.lesson-editors', [
            'owner' => LessonCollaboration::person($lesson->teacher),
            'editors' => $lesson->editors()->orderBy('name')->get(['users.id', 'users.name', 'users.email'])
                ->map(fn (User $u) => [...LessonCollaboration::person($u), 'email' => $u->email])->all(),
            'isOwner' => (bool) auth()->user()?->canManage($lesson),
        ]);
    }

    private function lesson(): Lesson
    {
        return Lesson::query()->findOrFail($this->lessonId);
    }

    /** Only the owner (or an admin) decides who else edits. */
    private function ownLesson(): Lesson
    {
        $lesson = $this->lesson();
        abort_unless((bool) auth()->user()?->canManage($lesson), 403);

        return $lesson;
    }
}
