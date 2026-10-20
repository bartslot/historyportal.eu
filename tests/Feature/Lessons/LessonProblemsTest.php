<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Jobs\GenerateSceneAudio;
use App\Jobs\GenerateSceneShots;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Support\LessonProblems;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * What is wrong with a lesson, said in a teacher's words, from ONE checker (Bart, 2026-10-17: "it
 * is a bit unclear to me why there is a red dot ... how do I see the error?" and "there should be
 * something that shows it somewhere ... and auto fix all problems button"). The thumbnail dot, the
 * scene's error row, the Problems view and the publish gate all read LessonProblems::for().
 */
class LessonProblemsTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->teacher = User::factory()->create();
    }

    private function lesson(): Lesson
    {
        return Lesson::create([
            'teacher_id' => $this->teacher->id, 'title' => 'Abel Tasman', 'topic' => 'X', 'subject' => 'history',
            'grade_level' => '9th', 'language' => 'nl', 'image_style' => 'cinematic', 'status' => LessonStatus::Configuring,
        ]);
    }

    /** A narrated scene with a picture and a voice that match its script: nothing wrong with it. */
    private function scene(Lesson $lesson, int $order, array $extra = []): Scene
    {
        $script = $extra['script_segment'] ?? "Scene {$order}.";
        Storage::disk('public')->put("lessons/{$lesson->id}/{$order}.webp", 'img');
        Storage::disk('public')->put("lessons/{$lesson->id}/{$order}.m4a", 'aac');

        return Scene::create($extra + [
            'lesson_id' => $lesson->id, 'order' => $order, 'kind' => 'narration', 'script_segment' => $script, 'status' => 'ready',
            'image_path' => "lessons/{$lesson->id}/{$order}.webp", 'audio_path' => "lessons/{$lesson->id}/{$order}.m4a",
            'audio_script_hash' => sha1($script),
        ]);
    }

    private function only(Lesson $lesson, Scene $scene): array
    {
        $problems = array_values(array_filter(LessonProblems::for($lesson), fn (array $p) => $p['scene_id'] === $scene->id));
        $this->assertCount(1, $problems, json_encode(LessonProblems::for($lesson)));

        return $problems[0];
    }

    public function test_a_finished_scene_has_no_problems(): void
    {
        $lesson = $this->lesson();
        $this->scene($lesson, 1);
        $this->assertSame([], LessonProblems::for($lesson));
    }

    public function test_a_failed_narration_says_the_class_hears_the_old_voice_and_offers_re_narrate(): void
    {
        $lesson = $this->lesson();
        $scene = $this->scene($lesson, 1, ['status' => 'failed', 'error_message' => 'TTS service returned no audio.']);

        $p = $this->only($lesson, $scene);
        $this->assertSame(['audio', LessonProblems::BLOCKS, 'audio'], [$p['step'], $p['severity'], $p['fix']]);
        $this->assertSame('Narration failed: this scene still plays the old voice.', $p['message']);
        $this->assertStringNotContainsString('TTS service', $p['message'], 'never the raw exception');
    }

    public function test_each_kind_of_failure_and_gap_in_teacher_words(): void
    {
        $lesson = $this->lesson();
        $cases = [
            [['status' => 'failed', 'error_message' => 'TTS service returned no audio.', 'audio_path' => null], 'Narration failed: this scene has no voice yet.', 'audio'],
            [['status' => 'failed', 'error_message' => 'ComfyUI image render timed out'], 'The picture could not be made.', 'image'],
            [['status' => 'failed', 'error_message' => 'Ollama script request failed'], 'The script could not be written.', 'script'],
            [['status' => 'failed', 'error_message' => 'Something odd: 0xDEAD'], 'Something went wrong while making this scene.', null],
            [['script_segment' => 'A new text the teacher wrote.', 'audio_script_hash' => sha1('The old text.')], 'The voice belongs to an older text.', 'audio'],
            [['image_path' => null], 'This scene has no picture yet.', 'image'],
            [['audio_path' => null], 'This scene has no voice yet.', 'audio'],
            [['image_path' => 'lessons/gone.webp'], 'The picture file is missing.', 'image'],
            [['audio_path' => 'lessons/gone.m4a'], 'The voice file is missing.', 'audio'],
        ];
        foreach ($cases as $i => [$extra, $message, $fix]) {
            $p = $this->only($lesson, $this->scene($lesson, $i + 1, $extra));
            $this->assertSame([$message, $fix], [$p['message'], $p['fix']], $message);
            $this->assertSame($i + 1, $p['order']);
        }
    }

    public function test_an_outdated_voice_is_amber_a_failure_is_red(): void
    {
        $lesson = $this->lesson();
        $stale = $this->scene($lesson, 1, ['script_segment' => 'New.', 'audio_script_hash' => sha1('Old.')]);
        $failed = $this->scene($lesson, 2, ['status' => 'failed', 'error_message' => 'TTS service returned no audio.']);

        $this->assertSame(LessonProblems::OUTDATED, $this->only($lesson, $stale)['severity']);
        $this->assertSame(LessonProblems::BLOCKS, $this->only($lesson, $failed)['severity']);
        $this->assertSame(LessonProblems::BLOCKS, LessonProblems::worst(LessonProblems::for($lesson)));
    }

    public function test_a_scene_of_voice_lines_and_a_map_need_no_single_voice_or_picture(): void
    {
        $lesson = $this->lesson();
        $this->scene($lesson, 1, ['audio_path' => null, 'audio_script_hash' => null, 'config' => ['lines' => [['text' => 'Ja.']]]]);
        $this->scene($lesson, 2, ['kind' => 'map', 'image_path' => null, 'audio_path' => null]);
        $this->assertSame([], LessonProblems::for($lesson));
    }

    public function test_the_thumbnail_dot_explains_itself_and_the_scene_panel_shows_the_row_with_one_fix(): void
    {
        $lesson = $this->lesson();
        $this->scene($lesson, 1);
        $failed = $this->scene($lesson, 2, ['status' => 'failed', 'error_message' => 'TTS service returned no audio.']);
        $stale = $this->scene($lesson, 3, ['script_segment' => 'New.', 'audio_script_hash' => sha1('Old.')]);

        $component = Livewire::actingAs($this->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson]);
        $html = $component->html();
        $this->assertMatchesRegularExpression('#data-problem-dot="blocks"[^>]*data-tooltip="Narration failed: this scene still plays the old voice\.#', $html);
        $this->assertMatchesRegularExpression('#data-problem-dot="outdated"[^>]*data-tooltip="The voice belongs to an older text\.#', $html);
        $this->assertSame(2, substr_count($html, 'data-problem-dot='));

        $component->call('selectScene', $failed->id);
        $row = $component->html();
        $this->assertStringContainsString('data-scene-problem', $row);
        $this->assertMatchesRegularExpression('#data-scene-problem.*Narration failed: this scene still plays the old voice\..*wire:click="fixProblem\('.$failed->id.', \'audio\'\)"#s', $row);
        $this->assertStringNotContainsString('TTS service', substr($row, (int) strpos($row, 'data-scene-problem'), 3000));
        $this->assertNotNull($stale);
    }

    public function test_the_header_counts_the_problems_and_opens_the_problems_view(): void
    {
        $lesson = $this->lesson();
        $this->scene($lesson, 1);
        $component = Livewire::actingAs($this->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson]);
        $this->assertStringNotContainsString('data-problems-count', $component->html(), 'hidden with no problems');

        $this->scene($lesson, 2, ['status' => 'failed', 'error_message' => 'TTS service returned no audio.']);
        $this->scene($lesson, 3, ['script_segment' => 'New.', 'audio_script_hash' => sha1('Old.')]);
        $component = Livewire::actingAs($this->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson]);
        $this->assertMatchesRegularExpression('#data-problems-count="2"[^>]*data-severity="blocks"#', $component->html());

        $component->call('openProblems')->assertSet('panelView', 'problems');
        $html = $component->html();
        $this->assertStringContainsString('data-problems-view', $html);
        $this->assertSame(2, substr_count($html, 'data-problem-row'));
        $this->assertStringContainsString('data-fix-all', $html);
    }

    public function test_fix_one_and_fix_all_queue_the_right_jobs_and_a_success_clears_the_flag(): void
    {
        Queue::fake();
        $lesson = $this->lesson();
        $failed = $this->scene($lesson, 1, ['status' => 'failed', 'error_message' => 'TTS service returned no audio.']);
        $stale = $this->scene($lesson, 2, ['script_segment' => 'New.', 'audio_script_hash' => sha1('Old.')]);
        $noPicture = $this->scene($lesson, 3, ['image_path' => null]);
        $this->scene($lesson, 4, ['status' => 'failed', 'error_message' => 'Something odd']);

        $component = Livewire::actingAs($this->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson]);
        $plan = $component->instance()->fixPlan();
        $this->assertSame(['scenes' => 3, 'narrations' => 2, 'characters' => mb_strlen('Scene 1.') + mb_strlen('New.'), 'pictures' => 1, 'scripts' => 0, 'manual' => 1], $plan);

        $component->call('fixAllProblems');
        Queue::assertPushed(GenerateSceneAudio::class, 2);
        Queue::assertPushed(GenerateSceneShots::class, 1);
        $this->assertSame('generating', $failed->fresh()->status);
        $this->assertNull($failed->fresh()->error_message);

        // The job's success path: the voice matches its script again, the scene is ready, the flag is gone.
        $failed->fresh()->update(['status' => 'ready', 'error_message' => null, 'audio_script_hash' => sha1('Scene 1.')]);
        $this->assertSame([], array_filter(LessonProblems::for($lesson), fn ($p) => $p['scene_id'] === $failed->id));

        $component->call('fixProblem', $stale->id, 'audio');
        Queue::assertPushed(GenerateSceneAudio::class, 3);
        $component->call('fixProblem', $noPicture->id, 'nonsense');
        Queue::assertPushed(GenerateSceneShots::class, 1);
    }

    public function test_a_guest_cannot_spend_on_fixes(): void
    {
        Queue::fake();
        $guest = User::factory()->create(['is_guest_demo' => true]);
        $lesson = $this->lesson();
        $lesson->update(['teacher_id' => $guest->id]);
        $this->scene($lesson, 1, ['status' => 'failed', 'error_message' => 'TTS service returned no audio.']);

        Livewire::actingAs($guest)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])->call('fixAllProblems');
        Queue::assertNothingPushed();
    }

    public function test_the_publish_gate_names_scenes_in_the_checkers_words(): void
    {
        $lesson = $this->lesson();
        $this->scene($lesson, 1, ['status' => 'failed', 'error_message' => 'TTS service returned no audio.']);

        Livewire::actingAs($this->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('publish')
            ->assertSet('publishOk', false)
            ->assertSee('Narration failed: this scene still plays the old voice.');
        $this->assertNotSame(LessonStatus::Published, $lesson->fresh()->status);
    }

    /** A failed re-narration of a scene that still plays its own recording of this text: amber, not red. */
    public function test_a_failed_re_narration_with_its_own_audio_is_amber_and_does_not_block_publishing(): void
    {
        $lesson = $this->lesson();
        $scene = $this->scene($lesson, 1, ['status' => 'ready', 'error_message' => 'TTS service returned no audio.']);

        $p = $this->only($lesson, $scene);
        $this->assertSame([LessonProblems::OUTDATED, 'audio', 'Re-narrating failed: this scene still plays its earlier recording.'], [$p['severity'], $p['fix'], $p['message']]);

        Livewire::actingAs($this->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])->call('publish')->assertSet('publishOk', true);
    }
}
