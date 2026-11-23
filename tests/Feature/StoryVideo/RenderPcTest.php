<?php

declare(strict_types=1);

namespace Tests\Feature\StoryVideo;

use App\Enums\LessonStatus;
use App\Enums\StoryMediaKind;
use App\Enums\StoryMediaStatus;
use App\Jobs\EncodeSceneLoop;
use App\Jobs\GenerateStoryMedia;
use App\Jobs\PrepareRenderPcClip;
use App\Livewire\Wizard\StoryVideo;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\StoryMediaItem;
use App\Models\User;
use App\Services\StoryVideo\RenderPcQueue;
use App\Services\StoryVideo\StoryVideoPlanner;
use App\Services\StoryVideo\StoryVideoRun;
use App\Services\Support\SceneLoop;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

class RenderPcTest extends TestCase
{
    use RefreshDatabase;

    private Lesson $lesson;

    private Scene $scene;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Queue::fake();
        config(['story_video.clip_driver' => 'render_pc', 'story_video.render_pc.token' => 'pc-secret', 'services.cloudinary.url' => null]);

        $this->lesson = Lesson::create([
            'teacher_id' => User::factory()->create()->id, 'topic' => 'Marco Polo', 'subject' => 'history', 'grade_level' => 'Age 12',
            'image_style' => 'realistic', 'status' => LessonStatus::ScenesReady, 'era' => '13th century', 'region' => 'Venice',
            'outline' => [
                'cast' => [['name' => 'Marco Polo', 'colour' => 'red', 'look' => 'a boy of 17']],
                'scene_briefs' => [['order' => 1, 'characters' => ['Marco Polo'], 'location' => 'Venice', 'year' => '1271', 'image_prompt_seed' => 'the quay']],
            ],
        ]);
        $this->scene = Scene::create(['lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'script_segment' => 'Venice, 1271. A boy stands on the quay. His father has come home after fifteen years.']);

        (new StoryVideoPlanner)->plan($this->lesson);
        // Characters and places are approved: the sheet and the world shot exist as files.
        Storage::disk('public')->put('sheets/marco.png', 'sheet');
        Storage::disk('public')->put('worlds/quay.png', 'world');
        $this->lesson->storyMedia()->where('kind', 'character_sheet')->update(['status' => 'approved', 'path' => 'sheets/marco.png']);
        $this->lesson->storyMedia()->where('kind', 'world_shot')->update(['status' => 'approved', 'path' => 'worlds/quay.png']);
        $this->scene->update(['image_path' => 'worlds/quay.png']);
    }

    /** A clip that is queued for the PC with its prompt written, as after PrepareRenderPcClip. */
    private function waitingClip(): StoryMediaItem
    {
        StoryVideoRun::for($this->lesson)->start(StoryMediaKind::Clip);
        $clip = $this->lesson->storyMedia()->where('kind', 'clip')->orderBy('position')->firstOrFail();
        $clip->update(['prompt' => 'Marco waits on the quay.']);

        return $clip->fresh();
    }

    private function pc(): static
    {
        return $this->withToken('pc-secret')->withHeader('Accept', 'application/json');
    }

    public function test_the_route_does_not_exist_without_the_token(): void
    {
        $this->postJson(route('api.render-pc.next'))->assertNotFound();
        $this->withToken('wrong')->postJson(route('api.render-pc.next'))->assertNotFound();

        config(['story_video.render_pc.token' => null]);
        $this->withToken('')->postJson(route('api.render-pc.next'))->assertNotFound();
    }

    public function test_starting_the_video_step_leaves_clips_waiting_for_the_pc(): void
    {
        $queued = StoryVideoRun::for($this->lesson)->start(StoryMediaKind::Clip);

        $this->assertGreaterThanOrEqual(1, $queued);
        Queue::assertPushed(PrepareRenderPcClip::class, $queued);
        Queue::assertNotPushed(GenerateStoryMedia::class);
        $clip = $this->lesson->storyMedia()->where('kind', 'clip')->first();
        $this->assertSame('render_pc', $clip->model);
        $this->assertSame(StoryMediaStatus::Queued, $clip->status);

        // No prompt yet: the PC gets nothing.
        $this->pc()->postJson(route('api.render-pc.next'))->assertNoContent();
    }

    public function test_the_pc_claims_a_clip_and_downloads_its_pictures(): void
    {
        $clip = $this->waitingClip();

        $job = $this->pc()->postJson(route('api.render-pc.next'))->assertOk()
            ->assertJsonPath('id', $clip->id)->assertJsonPath('prompt', 'Marco waits on the quay.')
            ->assertJsonPath('scene_id', $this->scene->id)->json();

        $this->assertCount(2, $job['inputs']);   // the world shot, then Marco's sheet
        $this->assertSame(StoryMediaStatus::Generating, $clip->fresh()->status);
        $this->assertSame($job['claim'], $clip->fresh()->generation_id);
        $this->assertNotNull(app(RenderPcQueue::class)->lastSeen());

        $world = $this->pc()->get($job['inputs'][0].'?claim='.$job['claim'])->assertOk();
        $this->assertSame('world', $world->streamedContent());
        $this->pc()->get($job['inputs'][1].'?claim=someone-else')->assertStatus(409);
    }

    public function test_a_finished_clip_waits_for_the_teacher(): void
    {
        $clip = $this->waitingClip();
        $claim = $this->pc()->postJson(route('api.render-pc.next'))->json('claim');

        $this->pc()->post(route('api.render-pc.finish', $clip), ['claim' => $claim, 'video' => UploadedFile::fake()->create('clip.mp4', 200, 'video/mp4')])
            ->assertOk()->assertJsonPath('status', 'ready');

        $clip->refresh();
        $this->assertSame(StoryMediaStatus::Ready, $clip->status);
        $this->assertStringContainsString("scenes/{$this->scene->id}/story-video/", $clip->path);
        Storage::disk('public')->assertExists($clip->path);

        // The same claim cannot deliver twice.
        $this->pc()->post(route('api.render-pc.finish', $clip), ['claim' => $claim, 'video' => UploadedFile::fake()->create('again.mp4', 200, 'video/mp4')])
            ->assertStatus(409);
    }

    public function test_a_failed_render_is_reported_with_its_reason(): void
    {
        $clip = $this->waitingClip();
        $claim = $this->pc()->postJson(route('api.render-pc.next'))->json('claim');

        $this->pc()->postJson(route('api.render-pc.finish', $clip), ['claim' => $claim, 'error' => 'out of memory'])
            ->assertOk()->assertJsonPath('status', 'failed');

        $this->assertSame(StoryMediaStatus::Failed, $clip->fresh()->status);
        $this->assertStringContainsString('out of memory', $clip->fresh()->error);
        $this->pc()->postJson(route('api.render-pc.finish', $clip), ['claim' => $claim])->assertStatus(422);
    }

    public function test_a_clip_the_pc_never_returned_waits_again_and_the_old_claim_is_refused(): void
    {
        $clip = $this->waitingClip();
        $old = $this->pc()->postJson(route('api.render-pc.next'))->json('claim');
        $clip->update(['started_at' => now()->subMinutes(91)]);

        $new = $this->pc()->postJson(route('api.render-pc.next'))->assertOk()->assertJsonPath('id', $clip->id)->json('claim');

        $this->assertNotSame($old, $new);
        $this->pc()->post(route('api.render-pc.finish', $clip), ['claim' => $old, 'video' => UploadedFile::fake()->create('late.mp4', 200, 'video/mp4')])
            ->assertStatus(409);
        $this->assertSame(StoryMediaStatus::Generating, $clip->fresh()->status);
    }

    public function test_waiting_clips_can_be_handed_to_elevenlabs(): void
    {
        $clip = $this->waitingClip();

        $this->artisan('story-video:render-pc', ['--hand-over' => 'elevenlabs', '--lesson' => $this->lesson->id])->assertSuccessful();

        Queue::assertPushed(GenerateStoryMedia::class, fn (GenerateStoryMedia $job) => $job->itemId === $clip->id);
        $this->assertSame(config('story_video.video_model'), $clip->fresh()->model);
        $this->pc()->postJson(route('api.render-pc.next'))->assertNoContent();
    }

    public function test_a_film_made_by_hand_goes_straight_onto_its_scene(): void
    {
        $this->pc()->post(route('api.render-pc.film', $this->scene), ['film' => UploadedFile::fake()->create('scene.mp4', 500, 'video/mp4')])
            ->assertOk()->assertJsonPath('status', 'attached');

        $loop = SceneLoop::of($this->scene->fresh());
        $this->assertNotNull($loop);
        $this->assertSame('worlds/quay.png', $loop['poster']);
        Storage::disk('public')->assertExists($loop['src']);
        Queue::assertPushed(EncodeSceneLoop::class, fn (EncodeSceneLoop $job) => $job->sceneId === $this->scene->id && $job->upload === $loop['src']);
        // Only the moving picture changed.
        $this->assertSame('worlds/quay.png', $this->scene->fresh()->image_path);
    }

    public function test_the_video_step_says_how_the_render_pc_stands(): void
    {
        $this->waitingClip();
        $teacher = User::findOrFail($this->lesson->teacher_id);

        $panel = Livewire::actingAs($teacher)->test(StoryVideo::class, ['lesson' => $this->lesson])->set('step', 'clip');
        $panel->assertSee(__('The render PC has not asked for work yet.'));

        $this->pc()->postJson(route('api.render-pc.next'))->assertOk();
        $panel->call('$refresh')->assertSee(__('The render PC is on.'))->assertDontSee(__('No clip maker is set up for this step yet.'));
    }
}
