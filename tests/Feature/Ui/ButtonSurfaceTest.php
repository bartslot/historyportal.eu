<?php

declare(strict_types=1);

namespace Tests\Feature\Ui;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Which surface a page is on, asserted on the rendered html.
 *
 * Bart: "Make sure Amber buttons would be used only on frontend, not on backend. Backend uses
 * solid white, fully rounded." The whole colour split hangs off one attribute — data-surface on
 * <html> — so it is worth a test that names both sides rather than only the one that changed.
 *
 * These are absolutes in both directions on purpose. A test that only asserted the teacher shell
 * carries the marker would still pass if the marker leaked onto the landing shell too, and a white
 * primary action on the marketing home page is precisely the regression Bart's instruction forbids.
 * So every case asserts the marker is present AND that the other surface does not have it.
 */
class ButtonSurfaceTest extends TestCase
{
    use RefreshDatabase;

    private const MARKER = 'data-surface="teacher"';

    private function teacher(): User
    {
        return User::factory()->create(['role' => 'teacher']);
    }

    public function test_the_marketing_home_page_is_not_a_teacher_surface(): void
    {
        $this->get('/')->assertOk()->assertDontSee(self::MARKER, false);
    }

    public function test_the_public_lesson_catalogue_is_not_a_teacher_surface(): void
    {
        $this->get('/history-lessons')->assertOk()->assertDontSee(self::MARKER, false);
    }

    /**
     * The sign-in page is the door to the workspace, not part of it: a visitor who has never had an
     * account sees it, it wears the marketing shell, and it is not behind auth. Amber.
     */
    public function test_the_sign_in_page_is_not_a_teacher_surface(): void
    {
        $this->get('/login')->assertOk()->assertDontSee(self::MARKER, false);
    }

    public function test_the_teacher_dashboard_is_a_teacher_surface(): void
    {
        $this->actingAs($this->teacher())->get('/teacher')->assertOk()->assertSee(self::MARKER, false);
    }

    public function test_the_settings_page_is_a_teacher_surface(): void
    {
        $this->actingAs($this->teacher())->get('/settings')->assertOk()->assertSee(self::MARKER, false);
    }

    /**
     * /help is PUBLIC — it was made reachable without an account earlier today, deliberately — and
     * it still renders the workspace shell, nav and all. The surface follows the chrome rather than
     * the auth middleware because the chrome is the thing a reader can see. Signed out or signed
     * in, the help centre looks like the app, so its buttons are the app's white pill.
     */
    public function test_the_help_centre_is_a_teacher_surface_even_when_signed_out(): void
    {
        $this->get('/help')->assertOk()->assertSee(self::MARKER, false);
    }

    /**
     * The lesson player is its own shell and it is what a class watches. It must never pick up the
     * workspace's white pill: that surface belongs to the teacher, not to the room.
     */
    public function test_the_lesson_player_is_not_a_teacher_surface(): void
    {
        $lesson = \App\Models\Lesson::factory()->create(['status' => 'published']);
        // The player 404s on a lesson with no scenes, by design: "no scenes, nothing to play".
        \App\Models\Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration']);

        $this->get('/lesson/'.$lesson->lesson_code)->assertOk()->assertDontSee(self::MARKER, false);
    }
}
