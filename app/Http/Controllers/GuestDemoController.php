<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\User;
use App\Services\GuestDemoSession;
use App\Services\LessonCopier;
use App\Support\DemoLesson;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * "Configure" on the landing page. Drops a visitor with no account straight into the real wizard,
 * editing their own private copy of the demo lesson.
 */
final class GuestDemoController extends Controller
{
    public function __construct(private readonly GuestDemoSession $guests) {}

    public function __invoke(Request $request): RedirectResponse
    {
        $demo = DemoLesson::resolve();

        abort_if($demo === null, 404, 'No demo lesson is published yet.');

        // A teacher who is already signed in keeps their own account (a throwaway one would sign
        // them out of it) and gets a copy of the demo in it, at step 4 like everyone else: the demo
        // is configured, never started over from step 1 (Bart, 2026-10-20).
        $user = $request->user();
        $sandbox = $user && ! $user->isGuestDemo()
            ? $this->openCopyOf($demo, $user)
                ?? app(LessonCopier::class)->copy($demo, $user, ['status' => LessonStatus::Configuring, 'wizard_step' => 4])
            : $this->guests->start($demo);

        return redirect()->route('teacher.lessons.wizard', [
            'lesson' => $sandbox->id,
            'step' => 4,
        ]);
    }

    /**
     * The teacher's own unpublished copy of the demo, so a second click reopens it instead of
     * piling up copies. A copy keeps the demo's title and topic.
     * ponytail: matched on those columns, not on a copied_from id; add that column if teachers
     * start keeping unrelated lessons under the demo's exact title.
     */
    private function openCopyOf(Lesson $demo, User $teacher): ?Lesson
    {
        return Lesson::where('teacher_id', $teacher->id)
            ->whereKeyNot($demo->id)
            ->where('title', $demo->title)
            ->where('topic', $demo->topic)
            ->where('status', '!=', LessonStatus::Published->value)
            ->latest('id')
            ->first();
    }
}
