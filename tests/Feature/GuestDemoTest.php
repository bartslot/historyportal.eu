<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Console\Commands\PruneGuestDemos;
use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Support\DemoLesson;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * "Configure" on the landing page hands a visitor with no account a throwaway teacher account and
 * a private copy of the demo lesson (App\Services\GuestDemoSession). That is a real account on the
 * public internet, so most of what is asserted here is the fence around it.
 */
class GuestDemoTest extends TestCase
{
    use RefreshDatabase;

    private function publishedDemoLesson(string $title = 'The Silk Road'): Lesson
    {
        $teacher = User::create([
            'name' => 'Owner',
            'email' => 'owner@example.com',
            'password' => 'secret-password',
            'role' => 'teacher',
        ]);

        $lesson = Lesson::create([
            'teacher_id' => $teacher->id,
            'title' => $title,
            'topic' => $title,
            'subject' => 'history',
            'grade_level' => '7',
            'status' => LessonStatus::Published,
            // Load-bearing. The real demo lesson is public, and the bug was that a sandbox copy
            // inherited that. With a private source the visibility assertion below passes whether
            // the copier is fixed or not, which is a test that proves nothing.
            'is_public' => true,
        ]);

        Scene::create([
            'lesson_id' => $lesson->id,
            'order' => 1,
            'kind' => 'narration',
            'status' => 'ready',
            'script' => 'Once upon a road.',
            'audio_path' => 'lessons/1/scenes/1.mp3',
        ]);

        DemoLesson::forget();

        return $lesson->refresh();
    }

    public function test_a_visitor_with_no_account_gets_their_own_copy_of_the_demo_lesson(): void
    {
        $demo = $this->publishedDemoLesson();

        $response = $this->get(route('demo.configure'));

        $guest = User::where('is_guest_demo', true)->sole();
        $copy = Lesson::where('teacher_id', $guest->id)->sole();

        $response->assertRedirect(route('teacher.lessons.wizard', ['lesson' => $copy->id, 'step' => 4]));
        $this->assertAuthenticatedAs($guest);
        $this->assertTrue($guest->isTeacher());
        $this->assertSame($demo->title, $copy->title);
        $this->assertSame(1, $copy->scenes()->count());
        // A copy is never a second published lesson in the public catalogue. This asserted only the
        // STATUS, and the demo lesson is public, so `is_public` was replicated straight onto every
        // sandbox: four anonymous visits to /try on production put four copies of "The Punic Wars"
        // in the public catalogue, side by side under the same name, one linked from the home page.
        $this->assertSame(LessonStatus::Configuring, $copy->status);
        $this->assertFalse((bool) $copy->is_public, 'a sandbox copy must never reach the public catalogue');
        $this->assertNotSame($demo->lesson_code, $copy->lesson_code);
    }

    public function test_a_guest_copy_never_joins_the_originals_language_switch(): void
    {
        $demo = $this->publishedDemoLesson();
        $demo->update(['language' => 'en', 'translation_group' => 'dante']);
        DemoLesson::forget();

        $this->get(route('demo.configure'));

        $copy = Lesson::where('teacher_id', User::where('is_guest_demo', true)->sole()->id)->sole();
        // A sandbox reaches Previewable the moment its guest presses Play; that is the state in
        // which the group would have listed a stranger's edited copy as another language of Dante.
        $copy->update(['status' => LessonStatus::Previewable, 'language' => 'it']);

        $this->assertNull($copy->refresh()->translation_group);
        $this->assertFalse($demo->refresh()->translations()->contains('id', $copy->id));
    }

    /** Bart 2026-10-21: "everything has to have a Figma title poster". A copy keeps the original's. */
    public function test_a_copy_keeps_the_originals_title_poster(): void
    {
        $demo = $this->publishedDemoLesson();
        $demo->update(['translation_group' => 'tasman-standard']);
        DemoLesson::forget();

        $this->get(route('demo.configure'));

        $copy = Lesson::where('teacher_id', User::where('is_guest_demo', true)->sole()->id)->sole();
        $this->assertNull($copy->translation_group, 'still not another language of the original');
        $this->assertNotNull($demo->refresh()->titlePosterStillUrl());
        $this->assertSame($demo->titlePosterStillUrl(), $copy->titlePosterStillUrl());
        $this->assertSame($demo->titleChoices(), $copy->titleChoices());
    }

    public function test_editing_the_copy_leaves_the_original_lesson_alone(): void
    {
        $demo = $this->publishedDemoLesson();

        $this->get(route('demo.configure'));

        $copy = Lesson::where('teacher_id', User::where('is_guest_demo', true)->sole()->id)->sole();
        $copy->update(['title' => 'Something a stranger typed']);
        $copy->scenes()->delete();

        $demo->refresh();
        $this->assertSame('The Silk Road', $demo->title);
        $this->assertSame(1, $demo->scenes()->count());
    }

    public function test_a_second_visit_reuses_the_same_sandbox(): void
    {
        $this->publishedDemoLesson();

        $this->get(route('demo.configure'));
        $this->get(route('demo.configure'));

        $this->assertSame(1, User::where('is_guest_demo', true)->count());
        $this->assertSame(2, Lesson::count(), 'the demo lesson plus exactly one copy');
    }

    public function test_a_guest_cannot_reach_the_rest_of_the_workspace(): void
    {
        $this->publishedDemoLesson();
        $this->get(route('demo.configure'));

        $this->get(route('teacher.dashboard'))->assertForbidden();
        $this->get(route('teacher.lessons.index'))->assertForbidden();
        $this->get(route('settings.index'))->assertForbidden();

        // The help centre is DELIBERATELY not in that list any more. The Help icon sits in the
        // editor's own chrome, so a visitor trying the product pressed the one control offering to
        // explain it and was told "this demo can only open the lesson it was given". Reading the
        // help spends nothing and reveals nothing about another teacher's work.
        $this->get(route('help.index'))->assertOk();
    }

    public function test_a_guest_is_shown_no_control_that_would_bounce_them_back(): void
    {
        $this->publishedDemoLesson();
        $this->get(route('demo.configure'));

        $copy = Lesson::where('teacher_id', User::where('is_guest_demo', true)->sole()->id)->sole();
        $wizard = $this->get(route('teacher.lessons.wizard', ['lesson' => $copy->id, 'step' => 4]));

        // "Edit story" goes to step 2, which clampForGuestDemo() pins straight back to step 4 —
        // the guest would click it and appear to land nowhere. The minimal workflow shows only
        // controls that do something.
        $wizard->assertOk()->assertDontSee(__('Edit story'));

        // The way out leads to the public site, not to a workspace page that would 403.
        $wizard->assertSee(route('home'), false)
            ->assertDontSee(route('teacher.lessons.index'), false);
        // ...and says so: "Back to lessons" on an arrow that goes home misleads (pair test 10-24).
        $wizard->assertSee(__('Back to the home page'))
            ->assertDontSee(__('Back to lessons'));
    }

    public function test_a_guest_can_open_the_wizard_on_their_own_copy_but_not_on_anybody_elses(): void
    {
        $demo = $this->publishedDemoLesson();
        $this->get(route('demo.configure'));

        $copy = Lesson::where('teacher_id', User::where('is_guest_demo', true)->sole()->id)->sole();

        $this->get(route('teacher.lessons.wizard', ['lesson' => $copy->id, 'step' => 4]))->assertOk();
        $this->get(route('teacher.lessons.wizard', ['lesson' => $demo->id, 'step' => 4]))->assertForbidden();
    }

    public function test_a_guest_is_kept_off_the_generation_steps(): void
    {
        $this->publishedDemoLesson();
        $this->get(route('demo.configure'));

        $copy = Lesson::where('teacher_id', User::where('is_guest_demo', true)->sole()->id)->sole();

        // Step 3 is the Generate screen: reaching it would let an anonymous visitor spend real
        // money on AI credits. Asking for it lands on the Configure canvas instead, which is the
        // only screen that draws the rulers.
        $this->get(route('teacher.lessons.wizard', ['lesson' => $copy->id, 'step' => 3]))
            ->assertOk()
            ->assertSee('id="ruler-top"', false);
    }

    public function test_a_guest_can_neither_publish_nor_spend_ai_credits(): void
    {
        Queue::fake();
        $this->publishedDemoLesson();
        $this->get(route('demo.configure'));

        $guest = User::where('is_guest_demo', true)->sole();
        $copy = Lesson::where('teacher_id', $guest->id)->sole();
        $scene = $copy->scenes()->sole();

        $component = Livewire::actingAs($guest)->test(Step3SceneConfigurator::class, ['lesson' => $copy]);

        $component->call('publish')
            ->assertSet('publishOk', false)
            ->assertSet('publishNotice', 'Create an account to publish a lesson.');

        $component->call('regenerate', $scene->id, 'audio');

        $this->assertSame(LessonStatus::Configuring, $copy->refresh()->status);
        Queue::assertNothingPushed();
    }

    /**
     * Bart 2026-10-20: "you can only configure the demo from step 4". A signed-in teacher was sent to
     * step 1 to build a new lesson; they get their own copy of the demo instead, opened in the editor.
     */
    public function test_a_signed_in_teacher_gets_their_own_copy_opened_at_step_4(): void
    {
        $demo = $this->publishedDemoLesson();

        $teacher = User::create([
            'name' => 'Real',
            'email' => 'real@example.com',
            'password' => 'secret-password',
            'role' => 'teacher',
        ]);

        $response = $this->actingAs($teacher)->get(route('demo.configure'));

        $copy = Lesson::where('teacher_id', $teacher->id)->sole();
        $response->assertRedirect(route('teacher.lessons.wizard', ['lesson' => $copy->id, 'step' => 4]));
        $this->assertNotSame($demo->id, $copy->id);
        $this->assertSame(0, User::where('is_guest_demo', true)->count());
        $this->assertAuthenticatedAs($teacher);
    }

    /** Every click on Configureren used to make yet another copy; the teacher's open copy is reused. */
    public function test_a_signed_in_teacher_clicking_configure_again_reopens_their_unpublished_copy(): void
    {
        $this->publishedDemoLesson();
        $teacher = User::create([
            'name' => 'Real', 'email' => 'real@example.com',
            'password' => 'secret-password', 'role' => 'teacher',
        ]);

        $this->actingAs($teacher)->get(route('demo.configure'));
        $copy = Lesson::where('teacher_id', $teacher->id)->sole();

        $this->actingAs($teacher)->get(route('demo.configure'))
            ->assertRedirect(route('teacher.lessons.wizard', ['lesson' => $copy->id, 'step' => 4]));
        $this->assertSame(1, Lesson::where('teacher_id', $teacher->id)->count());

        // Once they publish it, it is their lesson; the next click starts a fresh copy.
        $copy->update(['status' => LessonStatus::Published->value]);
        $this->actingAs($teacher)->get(route('demo.configure'));
        $this->assertSame(2, Lesson::where('teacher_id', $teacher->id)->count());
    }

    public function test_the_demo_route_404s_when_no_lesson_is_playable(): void
    {
        DemoLesson::forget();

        $this->get(route('demo.configure'))->assertNotFound();
    }

    public function test_a_voyage_lesson_with_no_narration_still_counts_as_playable(): void
    {
        // Voyage lessons built by `lessons:make-voyage` are map tours: every scene is ready and
        // none is narrated. Demanding narration rejected a lesson that plays perfectly.
        $lesson = $this->publishedDemoLesson('De reis van Abel Tasman');
        $lesson->scenes()->update(['audio_path' => null, 'kind' => 'voyage']);

        DemoLesson::forget();
        config(['demo.lesson_title' => 'De reis van Abel Tasman']);

        $this->assertSame($lesson->id, DemoLesson::resolve()?->id);
    }

    public function test_a_lesson_still_waiting_on_the_pipeline_is_not_offered(): void
    {
        $lesson = $this->publishedDemoLesson();
        $lesson->scenes()->update(['status' => 'pending']);

        DemoLesson::forget();

        $this->assertNull(DemoLesson::resolve());
    }

    public function test_the_configured_demo_lesson_survives_being_opened_in_the_editor(): void
    {
        // Opening the hand-picked demo in the editor must not make it vanish from the landing page.
        // It used to be kept even once `configuring`, but a configuring lesson 404s for visitors
        // (pair test round 5), so the homepage now only links a public lesson; what keeps the demo
        // there is that the editor no longer unpublishes a playable lesson.
        $lesson = $this->publishedDemoLesson('The Demo Lesson');
        Livewire::actingAs($lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson]);
        $this->assertSame(LessonStatus::Published, $lesson->fresh()->status);

        config(['demo.lesson_title' => 'The Demo Lesson']);
        DemoLesson::forget();

        $this->assertSame($lesson->id, DemoLesson::resolve()?->id);
    }

    public function test_the_demo_lesson_falls_back_to_the_newest_playable_lesson(): void
    {
        $this->publishedDemoLesson('A Lesson With Another Name');

        config(['demo.lesson_title' => 'The Silk Road']);
        DemoLesson::forget();

        $this->assertSame('A Lesson With Another Name', DemoLesson::resolve()?->title);
    }

    public function test_pruning_removes_stale_guests_and_their_copies_only(): void
    {
        $this->publishedDemoLesson();
        $this->get(route('demo.configure'));

        $guest = User::where('is_guest_demo', true)->sole();
        $guest->forceFill(['created_at' => now()->subDays(3)])->save();

        $this->artisan('demo:prune-guests')->assertSuccessful();

        $this->assertSame(0, User::where('is_guest_demo', true)->count());
        $this->assertSame(1, Lesson::withTrashed()->count(), 'only the original demo lesson survives');
        $this->assertDatabaseHas('users', ['email' => 'owner@example.com']);
    }

    public function test_pruning_leaves_a_guest_who_is_still_looking_around(): void
    {
        $this->publishedDemoLesson();
        $this->get(route('demo.configure'));

        $this->artisan(PruneGuestDemos::class)->assertSuccessful();

        $this->assertSame(1, User::where('is_guest_demo', true)->count());
    }

    /** A guest's database session, as SESSION_DRIVER=database writes it. */
    private function sessionFor(User $guest, \Carbon\CarbonInterface $lastActivity): void
    {
        config(['session.driver' => 'database']);   // prod's driver; the suite runs on array
        \Illuminate\Support\Facades\DB::table(config('session.table') ?: 'sessions')->insert([
            'id' => \Illuminate\Support\Str::random(40), 'user_id' => $guest->id, 'ip_address' => '127.0.0.1',
            'user_agent' => 'test', 'payload' => '', 'last_activity' => $lastActivity->getTimestamp(),
        ]);
    }

    /**
     * Bart 2026-10-20: the copy "gets discarded when the user goes away". Gone = no session that is
     * still alive (session.lifetime); the 24-hour cap stays as the backstop.
     */
    public function test_pruning_discards_a_guest_who_went_away(): void
    {
        $this->publishedDemoLesson();
        $this->get(route('demo.configure'));
        $guest = User::where('is_guest_demo', true)->sole();
        $guest->forceFill(['created_at' => now()->subHours(3)])->save();
        $this->sessionFor($guest, now()->subMinutes((int) config('session.lifetime') + 5));

        $this->artisan(PruneGuestDemos::class)->assertSuccessful();

        $this->assertSame(0, User::where('is_guest_demo', true)->count());
        $this->assertSame(1, Lesson::withTrashed()->count(), 'only the original demo lesson survives');
    }

    public function test_pruning_keeps_a_guest_whose_session_is_alive(): void
    {
        $this->publishedDemoLesson();
        $this->get(route('demo.configure'));
        $guest = User::where('is_guest_demo', true)->sole();
        $guest->forceFill(['created_at' => now()->subHours(3)])->save();
        $this->sessionFor($guest, now()->subMinutes(5));

        $this->artisan(PruneGuestDemos::class)->assertSuccessful();

        $this->assertSame(1, User::where('is_guest_demo', true)->count());
    }
}
