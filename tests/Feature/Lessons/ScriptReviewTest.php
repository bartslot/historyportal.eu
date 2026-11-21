<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Jobs\GenerateLessonAssets;
use App\Jobs\GenerateLessonScript;
use App\Jobs\ReviseLessonScript;
use App\Livewire\Wizard\Step2Generate;
use App\Models\Lesson;
use App\Models\LessonSource;
use App\Models\Scene;
use App\Models\User;
use App\Services\OpenAiLlmService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Livewire\Livewire;
use Tests\TestCase;

/** The teacher reads the script before pictures and narration are made (Bart, 2026-11-21). */
class ScriptReviewTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id,
            'topic' => 'Marco Polo',
            'subject' => 'history',
            'grade_level' => '9th grade',
            'status' => LessonStatus::ScenesGenerating,
            'script_review' => ['state' => 'writing', 'messages' => []],
            'outline' => ['scene_briefs' => [
                ['order' => 1, 'kind' => 'narration', 'beat' => 'Venice'],
                ['order' => 2, 'kind' => 'narration', 'beat' => 'Hormuz'],
            ]],
        ]);
        LessonSource::create(['lesson_id' => $this->lesson->id, 'kind' => 'wikipedia', 'extracted_text' => 'Marco Polo was a Venetian merchant.']);
        Scene::create(['lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'pending']);
        Scene::create(['lesson_id' => $this->lesson->id, 'order' => 2, 'kind' => 'narration', 'status' => 'pending']);
    }

    public function test_the_script_job_stops_for_the_teacher_instead_of_making_pictures(): void
    {
        $this->mock(OpenAiLlmService::class, fn ($mock) => $mock->shouldReceive('json')->twice()->andReturn(
            ['scenes' => [['order' => 1, 'script' => 'Marco leaves Venice.'], ['order' => 2, 'script' => 'He reaches Hormuz.']]],
            ['causality' => 4, 'character_agency' => 4, 'objective_coverage' => 4, 'grade_fit' => 4, 'variety' => 4, 'issues' => []],
        ));
        Bus::fake();

        (new GenerateLessonScript($this->lesson->id))->handle(app(OpenAiLlmService::class));

        $lesson = $this->lesson->fresh();
        $this->assertSame(LessonStatus::ScriptReview, $lesson->status);
        $this->assertSame('ready', $lesson->script_review['state']);
        $this->assertSame('Marco leaves Venice.', Scene::where('order', 1)->value('script_segment'));
        Bus::assertNothingBatched();
    }

    public function test_a_lesson_without_review_still_runs_straight_through(): void
    {
        $this->lesson->update(['script_review' => null]);
        $this->mock(OpenAiLlmService::class, fn ($mock) => $mock->shouldReceive('json')->twice()->andReturn(
            ['scenes' => [['order' => 1, 'script' => 'A.'], ['order' => 2, 'script' => 'B.']]],
            ['causality' => 4, 'character_agency' => 4, 'objective_coverage' => 4, 'grade_fit' => 4, 'variety' => 4, 'issues' => []],
        ));
        Bus::fake();

        (new GenerateLessonScript($this->lesson->id))->handle(app(OpenAiLlmService::class));

        $this->assertSame(LessonStatus::ScenesGenerating, $this->lesson->fresh()->status);
        Bus::assertBatched(fn ($batch) => count($batch->jobs) > 0);
    }

    public function test_the_teacher_approves_and_pictures_and_narration_start(): void
    {
        $this->readyForReview();
        Bus::fake();

        Livewire::actingAs($this->teacher)
            ->test(Step2Generate::class, ['lesson' => $this->lesson])
            ->assertSee('Marco leaves Venice.')
            ->call('approveScript');

        $lesson = $this->lesson->fresh();
        $this->assertSame(LessonStatus::ScenesGenerating, $lesson->status);
        $this->assertSame('approved', $lesson->script_review['state']);
        Bus::assertDispatched(GenerateLessonAssets::class, fn ($job) => $job->lessonId === $this->lesson->id);
    }

    public function test_the_teacher_edits_a_scene_by_hand(): void
    {
        $this->readyForReview();
        $scene = Scene::where('order', 2)->first();

        Livewire::actingAs($this->teacher)
            ->test(Step2Generate::class, ['lesson' => $this->lesson])
            ->call('saveSceneScript', $scene->id, '  He sails into Hormuz.  ');

        $this->assertSame('He sails into Hormuz.', $scene->fresh()->script_segment);
    }

    public function test_the_assistant_rewrites_on_request_and_the_teacher_reads_its_answer(): void
    {
        $this->readyForReview();
        Bus::fake();

        Livewire::actingAs($this->teacher)
            ->test(Step2Generate::class, ['lesson' => $this->lesson])
            ->set('changeRequest', 'Make scene 2 more exciting')
            ->call('requestScriptChanges')
            ->assertSet('changeRequest', '');

        $this->assertSame('revising', $this->lesson->fresh()->script_review['state']);
        Bus::assertDispatched(ReviseLessonScript::class);

        $this->mock(OpenAiLlmService::class, fn ($mock) => $mock->shouldReceive('json')->once()->andReturn([
            'scenes' => [['order' => 2, 'script' => 'A storm. Marco clings to the mast as Hormuz appears.']],
            'reply' => 'I made scene 2 more exciting.',
        ]));

        (new ReviseLessonScript($this->lesson->id, 'Make scene 2 more exciting'))->handle(app(OpenAiLlmService::class));

        $lesson = $this->lesson->fresh();
        $this->assertSame('ready', $lesson->script_review['state']);
        $this->assertSame('I made scene 2 more exciting.', collect($lesson->script_review['messages'])->last()['text']);
        $this->assertStringContainsString('storm', Scene::where('order', 2)->value('script_segment'));
        $this->assertSame('Marco leaves Venice.', Scene::where('order', 1)->value('script_segment'), 'Untouched scenes stay word for word');
    }

    public function test_a_failed_rewrite_leaves_the_script_and_says_so(): void
    {
        $this->readyForReview();
        $this->lesson->update(['script_review' => [...$this->lesson->script_review, 'state' => 'revising']]);
        $this->mock(OpenAiLlmService::class, fn ($mock) => $mock->shouldReceive('json')->andThrow(new \RuntimeException('timed out')));

        (new ReviseLessonScript($this->lesson->id, 'shorter'))->handle(app(OpenAiLlmService::class));

        $lesson = $this->lesson->fresh();
        $this->assertSame('ready', $lesson->script_review['state']);
        $this->assertSame('He reaches Hormuz.', Scene::where('order', 2)->value('script_segment'));
    }

    public function test_nothing_can_be_approved_while_the_assistant_is_rewriting(): void
    {
        $this->readyForReview();
        $this->lesson->update(['script_review' => [...$this->lesson->script_review, 'state' => 'revising']]);
        Bus::fake();

        Livewire::actingAs($this->teacher)
            ->test(Step2Generate::class, ['lesson' => $this->lesson])
            ->call('approveScript');

        $this->assertSame(LessonStatus::ScriptReview, $this->lesson->fresh()->status);
        Bus::assertNotDispatched(GenerateLessonAssets::class);
    }

    private function readyForReview(): void
    {
        Scene::where('order', 1)->update(['script_segment' => 'Marco leaves Venice.']);
        Scene::where('order', 2)->update(['script_segment' => 'He reaches Hormuz.']);
        $this->lesson->update(['status' => LessonStatus::ScriptReview, 'script_review' => ['state' => 'ready', 'messages' => []]]);
    }
}
