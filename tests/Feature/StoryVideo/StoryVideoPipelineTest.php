<?php

declare(strict_types=1);

namespace Tests\Feature\StoryVideo;

use App\Enums\LessonStatus;
use App\Enums\StoryMediaKind;
use App\Enums\StoryMediaStatus;
use App\Jobs\AssembleSceneFilm;
use App\Jobs\GenerateStoryMedia;
use App\Livewire\Wizard\StoryVideo;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\StoryMediaItem;
use App\Models\User;
use App\Services\OpenAiLlmService;
use App\Services\StoryVideo\StoryVideoPlanner;
use App\Services\StoryVideo\StoryVideoRun;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

class StoryVideoPipelineTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        config(['services.elevenlabs.media_api_key' => 'test-key', 'services.cloudinary.url' => null]);
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'Marco Polo', 'subject' => 'history', 'grade_level' => 'Age 12',
            'image_style' => 'realistic', 'status' => LessonStatus::ScenesReady, 'era' => '13th century', 'region' => 'Venice',
            'outline' => [
                'cast' => [
                    ['name' => 'Marco Polo', 'colour' => 'red', 'look' => 'a boy of 17'],
                    ['name' => 'Niccolò Polo', 'colour' => 'blue', 'look' => 'his bearded father'],
                ],
                'scene_briefs' => [
                    ['order' => 1, 'characters' => ['Marco Polo'], 'location' => 'Venice', 'year' => '1271', 'image_prompt_seed' => 'the quay'],
                ],
            ],
        ]);
        Scene::create(['lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'script_segment' => 'Venice, 1271. A boy stands on the quay. His father has come home after fifteen years. '
                .'Nobody in the city has seen the places he talks about. Tomorrow they will sail east together, further than any Venetian before.']);
        Scene::create(['lesson_id' => $this->lesson->id, 'order' => 2, 'kind' => 'game', 'status' => 'ready', 'script_segment' => 'Quiz']);
    }

    public function test_planning_lists_sheets_world_shots_and_clip_beats_for_narrated_scenes_only(): void
    {
        $counts = (new StoryVideoPlanner)->plan($this->lesson);

        $this->assertSame(2, $counts['character_sheet']);
        $this->assertSame(1, $counts['world_shot']);
        $this->assertGreaterThanOrEqual(1, $counts['clip']);
        foreach ($this->lesson->storyMedia()->where('kind', 'clip')->get() as $clip) {
            $this->assertGreaterThanOrEqual(4, $clip->input['seconds']);
            $this->assertLessThanOrEqual(15, $clip->input['seconds']);
            $this->assertSame(['Marco Polo'], $clip->input['people']);
        }

        // Planning again changes nothing that was made.
        $sheet = $this->lesson->storyMedia()->where('kind', 'character_sheet')->first();
        $sheet->update(['status' => StoryMediaStatus::Approved, 'path' => 'x.png']);
        (new StoryVideoPlanner)->plan($this->lesson);
        $this->assertSame(StoryMediaStatus::Approved, $sheet->fresh()->status);
    }

    public function test_a_step_waits_until_the_one_before_it_is_approved(): void
    {
        Queue::fake();
        (new StoryVideoPlanner)->plan($this->lesson);
        $run = StoryVideoRun::for($this->lesson);

        $this->assertTrue($run->canStart(StoryMediaKind::CharacterSheet));
        $this->assertFalse($run->canStart(StoryMediaKind::WorldShot));
        $this->assertSame(2, $run->start(StoryMediaKind::CharacterSheet));
        Queue::assertPushed(GenerateStoryMedia::class, 2);

        $this->lesson->storyMedia()->where('kind', 'character_sheet')->update(['status' => 'approved', 'path' => 'a.png']);
        $this->assertTrue($run->canStart(StoryMediaKind::WorldShot));
        $this->assertFalse($run->canStart(StoryMediaKind::Clip));
    }

    public function test_a_picture_is_created_polled_style_checked_and_stored(): void
    {
        Queue::fake();
        (new StoryVideoPlanner)->plan($this->lesson);
        $item = $this->lesson->storyMedia()->where('kind', 'character_sheet')->first();
        $item->update(['status' => StoryMediaStatus::Queued, 'started_at' => now()]);

        Http::fake([
            'api.elevenlabs.io/v1/flows/image' => Http::response(['id' => 'gen_1', 'status' => 'pending']),
            'api.elevenlabs.io/v1/flows/image/gen_1' => Http::response(['id' => 'gen_1', 'status' => 'completed', 'content_url' => 'https://cdn.example/out.png', 'content_mime_type' => 'image/png']),
            'cdn.example/*' => Http::response($this->palePng()),
        ]);
        $llm = $this->createMock(OpenAiLlmService::class);

        (new GenerateStoryMedia($item->id))->handle($llm);   // create
        $this->assertSame('gen_1', $item->fresh()->generation_id);
        Http::assertSent(fn ($r) => $r->url() === 'https://api.elevenlabs.io/v1/flows/image'
            && $r['model_id'] === 'gemini-3.1-flash-image' && count($r['images']) === 3 && str_contains($r['prompt'], 'signature colour is red')
            && $r->hasHeader('xi-api-key', 'test-key'));

        (new GenerateStoryMedia($item->id))->handle($llm);   // poll → completed
        $item->refresh();
        $this->assertNotNull($item->path);
        Storage::disk('public')->assertExists($item->path);
        $this->assertArrayHasKey('ink', $item->style);
        // A blank pale picture has too little line: one redo with a correction is queued.
        $this->assertSame(StoryMediaStatus::Queued, $item->status);
        $this->assertSame(1, $item->attempts);
    }

    public function test_a_failed_generation_marks_the_item_failed(): void
    {
        Queue::fake();
        (new StoryVideoPlanner)->plan($this->lesson);
        $item = $this->lesson->storyMedia()->where('kind', 'character_sheet')->first();
        $item->update(['status' => StoryMediaStatus::Generating, 'generation_id' => 'gen_2', 'started_at' => now()]);
        Http::fake(['api.elevenlabs.io/v1/flows/image/gen_2' => Http::response(['id' => 'gen_2', 'status' => 'failed', 'failure_reason' => 'moderated', 'error_message' => 'nope'])]);

        (new GenerateStoryMedia($item->id))->handle($this->createMock(OpenAiLlmService::class));

        $this->assertSame(StoryMediaStatus::Failed, $item->fresh()->status);
        $this->assertStringContainsString('moderated', $item->fresh()->error);
    }

    public function test_a_clip_sends_the_world_shot_and_approved_sheets_as_references_with_no_audio(): void
    {
        Queue::fake();
        (new StoryVideoPlanner)->plan($this->lesson);
        Storage::disk('public')->put('w.png', $this->palePng());
        Storage::disk('public')->put('marco.png', $this->palePng());
        $this->lesson->storyMedia()->where('kind', 'character_sheet')->update(['status' => 'approved', 'path' => 'marco.png']);
        $this->lesson->storyMedia()->where('kind', 'world_shot')->update(['status' => 'approved', 'path' => 'w.png']);
        $clip = $this->lesson->storyMedia()->where('kind', 'clip')->first();
        $clip->update(['status' => StoryMediaStatus::Queued, 'started_at' => now()]);

        $llm = $this->createMock(OpenAiLlmService::class);
        $llm->method('json')->willReturn(['staging' => 'Shot 1, 0-4 s: a wide view of the quay.']);
        Http::fake(['api.elevenlabs.io/v1/flows/video' => Http::response(['id' => 'vid_1', 'status' => 'pending'])]);

        (new GenerateStoryMedia($clip->id))->handle($llm);

        Http::assertSent(fn ($r) => $r->url() === 'https://api.elevenlabs.io/v1/flows/video'
            && $r['model_id'] === 'bytedance-seedance-v2-fast' && $r['generate_audio'] === false && $r['resolution'] === '720p'
            && count($r['images']) === 2 && ! isset($r['start_frame']) && str_contains($r['prompt'], "image 2 = Marco Polo's character sheet"));
        $this->assertSame(StoryMediaStatus::Generating, $clip->fresh()->status);
    }

    public function test_approving_a_world_shot_sets_the_scene_picture_and_the_last_clip_joins_the_film(): void
    {
        Queue::fake();
        (new StoryVideoPlanner)->plan($this->lesson);
        $run = StoryVideoRun::for($this->lesson);
        $world = $this->lesson->storyMedia()->where('kind', 'world_shot')->first();
        $world->update(['status' => 'ready', 'path' => 'lessons/w.png']);
        $run->approve($world->fresh());
        $this->assertSame('lessons/w.png', $world->scene->fresh()->image_path);

        $clips = $this->lesson->storyMedia()->where('kind', 'clip')->get();
        $clips->each(fn (StoryMediaItem $c) => $c->update(['status' => 'ready', 'path' => "c{$c->id}.mp4"]));
        $run->approveAll(StoryMediaKind::Clip);
        Queue::assertPushed(AssembleSceneFilm::class, 1);
    }

    public function test_a_film_attaches_to_the_scene_picture_and_encodes_only_when_not_already_encoded(): void
    {
        Queue::fake();
        $scene = Scene::where('lesson_id', $this->lesson->id)->where('order', 1)->first();
        $scene->update(['image_path' => 'lessons/w.png', 'config' => ['layers' => ['keep me']]]);

        \App\Services\StoryVideo\SceneFilm::attach($scene, 'lessons/x/story-video/film.mp4');
        $this->assertSame(['keep me'], $scene->fresh()->config['layers']);
        $this->assertSame('lessons/x/story-video/film.mp4', $scene->fresh()->config['bg_loop']['src']);
        Queue::assertPushed(\App\Jobs\EncodeSceneLoop::class, 1);

        \App\Services\StoryVideo\SceneFilm::attach($scene, 'lessons/x/story-video/pc.loop.mp4', av1: 'lessons/x/story-video/pc.loop.av1.mp4', encoded: true);
        $this->assertSame('lessons/x/story-video/pc.loop.av1.mp4', $scene->fresh()->config['bg_loop']['av1']);
        Queue::assertPushed(\App\Jobs\EncodeSceneLoop::class, 1);
    }

    public function test_clips_go_through_the_configured_driver(): void
    {
        Queue::fake();
        (new StoryVideoPlanner)->plan($this->lesson);
        $this->lesson->storyMedia()->whereIn('kind', ['character_sheet', 'world_shot'])->update(['status' => 'approved', 'path' => 'a.png']);
        $this->expectException(\InvalidArgumentException::class);
        config(['story_video.clip_driver' => 'nope']);
        StoryVideoRun::for($this->lesson)->start(StoryMediaKind::Clip);
    }

    public function test_replanning_a_busy_item_keeps_its_old_input_so_the_change_is_still_seen_later(): void
    {
        (new StoryVideoPlanner)->plan($this->lesson);
        $sheet = $this->lesson->storyMedia()->where('kind', 'character_sheet')->first();
        $sheet->update(['status' => StoryMediaStatus::Generating, 'generation_id' => 'g']);
        $outline = $this->lesson->outline;
        $outline['cast'][0]['colour'] = 'green';
        $this->lesson->update(['outline' => $outline]);

        (new StoryVideoPlanner)->plan($this->lesson);
        $this->assertSame('red', $sheet->fresh()->input['colour']);

        $sheet->update(['status' => StoryMediaStatus::Ready, 'generation_id' => null]);
        (new StoryVideoPlanner)->plan($this->lesson);
        $this->assertSame('green', $sheet->fresh()->input['colour']);
        $this->assertSame(StoryMediaStatus::Planned, $sheet->fresh()->status);
    }

    public function test_the_video_panel_reads_the_script_and_starts_the_first_step(): void
    {
        Queue::fake();
        Livewire::actingAs($this->teacher)
            ->test(StoryVideo::class, ['lesson' => $this->lesson])
            ->assertSee(__('Read the script'))
            ->call('plan')
            ->assertSee('Marco Polo')
            ->assertSee(__('Make :count pictures', ['count' => 2]))
            ->call('start');

        Queue::assertPushed(GenerateStoryMedia::class, 2);
    }

    public function test_another_teacher_cannot_open_the_panel(): void
    {
        Livewire::actingAs(User::factory()->create())
            ->test(StoryVideo::class, ['lesson' => $this->lesson])
            ->assertForbidden();
    }

    private function palePng(): string
    {
        $im = imagecreatetruecolor(64, 36);
        imagefill($im, 0, 0, imagecolorallocate($im, 250, 248, 240));
        ob_start();
        imagepng($im);

        return (string) ob_get_clean();
    }
}
