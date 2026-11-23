<?php

declare(strict_types=1);

namespace Tests\Feature\Collaboration;

use App\Enums\LessonStatus;
use App\Exceptions\SceneClaimTaken;
use App\Livewire\Wizard\LessonEditors;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\LessonClaim;
use App\Models\Scene;
use App\Models\User;
use App\Services\Collaboration\LessonCollaboration;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/** Several accounts in one lesson (Bart, 2026-11-23): editors, who is where, one account per scene, Take over. */
class LessonCollaborationTest extends TestCase
{
    use RefreshDatabase;

    private User $owner;

    private User $joey;

    private Lesson $lesson;

    private Scene $one;

    private Scene $two;

    protected function setUp(): void
    {
        parent::setUp();
        $this->owner = User::factory()->create(['name' => 'Bart Slot']);
        $this->joey = User::factory()->create(['name' => 'Joey']);
        $this->lesson = Lesson::create([
            'teacher_id' => $this->owner->id,
            'topic' => 'Marco Polo', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $this->one = Scene::create(['lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'Venice.', 'status' => 'ready']);
        $this->two = Scene::create(['lesson_id' => $this->lesson->id, 'order' => 2, 'kind' => 'narration', 'script_segment' => 'The galley.', 'status' => 'ready']);
    }

    private function addJoey(): void
    {
        $this->lesson->editors()->attach($this->joey->id);
    }

    private function editorFor(User $user, Scene $scene)
    {
        return Livewire::actingAs($user)->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])->call('selectScene', $scene->id);
    }

    public function test_only_the_owner_and_added_editors_may_open_the_editor(): void
    {
        $this->assertFalse($this->joey->canEdit($this->lesson));
        $this->actingAs($this->joey)->get(route('teacher.lessons.show', $this->lesson))->assertForbidden();

        $this->addJoey();

        $this->assertTrue($this->joey->fresh()->canEdit($this->lesson->fresh()));
        $this->assertFalse($this->joey->canManage($this->lesson));
    }

    public function test_the_owner_adds_and_removes_an_editor_by_email(): void
    {
        Livewire::actingAs($this->owner)->test(LessonEditors::class, ['lessonId' => $this->lesson->id])
            ->set('email', strtoupper($this->joey->email))
            ->call('add')
            ->assertHasNoErrors();
        $this->assertTrue($this->lesson->editors()->whereKey($this->joey->id)->exists());

        Livewire::actingAs($this->owner)->test(LessonEditors::class, ['lessonId' => $this->lesson->id])
            ->call('remove', $this->joey->id);
        $this->assertFalse($this->lesson->editors()->whereKey($this->joey->id)->exists());
    }

    public function test_an_unknown_email_and_the_owner_are_refused(): void
    {
        Livewire::actingAs($this->owner)->test(LessonEditors::class, ['lessonId' => $this->lesson->id])
            ->set('email', 'nobody@example.com')->call('add')->assertHasErrors('email')
            ->set('email', $this->owner->email)->call('add')->assertHasErrors('email');
        $this->assertSame(0, $this->lesson->editors()->count());
    }

    public function test_an_editor_cannot_change_who_else_edits(): void
    {
        $this->addJoey();
        Livewire::actingAs($this->joey)->test(LessonEditors::class, ['lessonId' => $this->lesson->id])
            ->set('email', $this->owner->email)->call('add')->assertForbidden();
    }

    public function test_the_ping_claims_a_free_scene_and_reports_the_room(): void
    {
        $this->addJoey();

        $this->actingAs($this->owner)->postJson(route('teacher.lessons.presence', $this->lesson), ['target' => 'scene:'.$this->one->id])
            ->assertOk()->assertJson(['mine' => true, 'holder' => null]);

        $room = $this->actingAs($this->joey)->postJson(route('teacher.lessons.presence', $this->lesson), ['target' => 'scene:'.$this->one->id])
            ->assertOk()->json();

        $this->assertFalse($room['mine']);
        $this->assertSame('Bart Slot', $room['holder']['name']);
        $this->assertSame('BS', $room['holder']['initials']);
        $this->assertCount(2, $room['people']);
    }

    public function test_moving_to_another_scene_frees_the_first(): void
    {
        $collab = app(LessonCollaboration::class);
        $collab->ping($this->lesson, $this->owner, 'scene:'.$this->one->id);
        $collab->ping($this->lesson, $this->owner, 'scene:'.$this->two->id);

        $this->assertNull($collab->holder($this->lesson, 'scene:'.$this->one->id));
        $this->assertSame($this->owner->id, $collab->holder($this->lesson, 'scene:'.$this->two->id)?->id);
    }

    public function test_a_claim_lapses_when_its_holder_stops_pinging(): void
    {
        $collab = app(LessonCollaboration::class);
        $collab->ping($this->lesson, $this->owner, 'scene:'.$this->one->id);
        LessonClaim::query()->update(['seen_at' => now()->subSeconds(LessonCollaboration::CLAIM_SECONDS + 1)]);

        $this->assertSame($this->joey->id, $collab->claim($this->lesson, $this->joey, 'scene:'.$this->one->id));
    }

    public function test_an_edit_to_a_scene_somebody_else_holds_is_refused_before_it_runs(): void
    {
        $this->addJoey();
        app(LessonCollaboration::class)->ping($this->lesson, $this->owner, 'scene:'.$this->one->id);

        $this->expectException(SceneClaimTaken::class);
        try {
            $this->editorFor($this->joey, $this->one)->call('setSceneBackgroundColor', '#112233');
        } finally {
            $this->assertNotSame('#112233', $this->one->fresh()->background_color);
        }
    }

    public function test_an_edit_naming_another_scene_checks_that_scene(): void
    {
        $this->addJoey();
        app(LessonCollaboration::class)->ping($this->lesson, $this->owner, 'scene:'.$this->two->id);

        $this->expectException(SceneClaimTaken::class);
        // Joey is on scene one, but deleting scene two would change what Bart holds.
        $this->editorFor($this->joey, $this->one)->call('deleteScene', $this->two->id);
    }

    public function test_the_first_edit_to_a_free_scene_claims_it(): void
    {
        $this->addJoey();
        $this->editorFor($this->joey, $this->one)->call('setSceneBackgroundColor', '#112233');

        $this->assertSame('#112233', $this->one->fresh()->background_color);
        $this->assertSame($this->joey->id, app(LessonCollaboration::class)->holder($this->lesson, 'scene:'.$this->one->id)?->id);
    }

    public function test_take_over_hands_the_scene_to_whoever_presses_it(): void
    {
        $this->addJoey();
        app(LessonCollaboration::class)->ping($this->lesson, $this->owner, 'scene:'.$this->one->id);

        $this->actingAs($this->joey)->postJson(route('teacher.lessons.presence.take-over', $this->lesson), ['target' => 'scene:'.$this->one->id])
            ->assertOk()->assertJson(['mine' => true]);

        $owner = $this->actingAs($this->owner)->postJson(route('teacher.lessons.presence', $this->lesson), ['target' => 'scene:'.$this->one->id])->json();
        $this->assertFalse($owner['mine']);
        $this->assertSame('Joey', $owner['holder']['name']);
    }

    public function test_presence_refuses_strangers_and_scenes_of_other_lessons(): void
    {
        $this->actingAs($this->joey)->postJson(route('teacher.lessons.presence', $this->lesson), ['target' => null])->assertForbidden();

        $other = Lesson::create(['teacher_id' => $this->owner->id, 'topic' => 'x', 'subject' => 'history', 'grade_level' => '6', 'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady]);
        $foreign = Scene::create(['lesson_id' => $other->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'x', 'status' => 'ready']);
        $this->actingAs($this->owner)->postJson(route('teacher.lessons.presence', $this->lesson), ['target' => 'scene:'.$foreign->id])->assertStatus(422);
    }

    public function test_leaving_frees_everything_at_once(): void
    {
        app(LessonCollaboration::class)->ping($this->lesson, $this->owner, 'scene:'.$this->one->id);
        $this->actingAs($this->owner)->post(route('teacher.lessons.presence.leave', $this->lesson))->assertNoContent();

        $this->assertNull(app(LessonCollaboration::class)->holder($this->lesson, 'scene:'.$this->one->id));
    }

    public function test_a_refused_edit_reaches_the_browser_as_a_409_it_can_read(): void
    {
        $response = (new SceneClaimTaken('Joey', 'scene:3'))->render();

        $this->assertSame(409, $response->status());
        $this->assertSame(['collab' => 'claim-taken', 'holder' => 'Joey', 'target' => 'scene:3'], $response->getData(true));
    }

    public function test_an_editor_cannot_publish(): void
    {
        $this->addJoey();
        $this->editorFor($this->joey, $this->one)->call('publish')->assertForbidden();
    }

    public function test_the_rail_fingerprint_moves_on_a_reorder_and_not_on_typing(): void
    {
        $collab = app(LessonCollaboration::class);
        $before = $collab->railSignature($this->lesson);

        $this->one->update(['script_segment' => 'Venice, 1271.']);
        $this->assertSame($before, $collab->railSignature($this->lesson));

        $this->one->update(['order' => 3]);
        $this->assertNotSame($before, $collab->railSignature($this->lesson));
    }
}
