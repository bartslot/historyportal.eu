<?php

declare(strict_types=1);

namespace Tests\Feature\StoryVideo;

use App\Enums\LessonStatus;
use App\Enums\StoryMediaKind;
use App\Enums\StoryMediaStatus;
use App\Jobs\GenerateStoryMedia;
use App\Jobs\GenerateStoryPicture;
use App\Jobs\PrepareStudioItem;
use App\Livewire\Wizard\StoryVideo;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\StoryMediaItem;
use App\Models\User;
use App\Services\StoryVideo\StoryVideoPlanner;
use App\Services\StoryVideo\StoryVideoRun;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/** The ElevenLabs studio route: bart's Mac pulls batches, Claude makes them in the studio, the Mac sends them back. */
class StudioTest extends TestCase
{
    use RefreshDatabase;

    private Lesson $lesson;

    private Scene $scene;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Queue::fake();
        config(['story_video.picture_driver' => 'studio', 'story_video.clip_driver' => 'studio', 'story_video.studio.token' => 'mac-secret',
            'services.cloudinary.url' => null]);

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
    }

    private function mac(): static
    {
        return $this->withToken('mac-secret')->withHeader('Accept', 'application/json');
    }

    /** The character sheet, queued for the studio with its prompt written (as after PrepareStudioItem). */
    private function waitingSheet(): StoryMediaItem
    {
        StoryVideoRun::for($this->lesson)->start(StoryMediaKind::CharacterSheet);
        $sheet = $this->lesson->storyMedia()->where('kind', 'character_sheet')->firstOrFail();
        $sheet->update(['prompt' => 'A character sheet of Marco Polo.']);

        return $sheet->fresh();
    }

    /** Characters and places approved, the clip queued for the studio with its prompt. */
    private function waitingClip(): StoryMediaItem
    {
        Storage::disk('public')->put('sheets/marco.png', 'sheet');
        Storage::disk('public')->put('worlds/quay.png', 'world');
        $this->lesson->storyMedia()->where('kind', 'character_sheet')->update(['status' => 'approved', 'path' => 'sheets/marco.png']);
        $this->lesson->storyMedia()->where('kind', 'world_shot')->update(['status' => 'approved', 'path' => 'worlds/quay.png']);
        StoryVideoRun::for($this->lesson)->start(StoryMediaKind::Clip);
        $clip = $this->lesson->storyMedia()->where('kind', 'clip')->orderBy('position')->firstOrFail();
        $clip->update(['prompt' => 'Marco waits on the quay.']);

        return $clip->fresh();
    }

    public function test_the_route_does_not_exist_without_the_token(): void
    {
        $this->postJson(route('api.studio.next'))->assertNotFound();
        $this->withToken('wrong')->postJson(route('api.studio.next'))->assertNotFound();

        config(['story_video.studio.token' => null]);
        $this->withToken('')->postJson(route('api.studio.next'))->assertNotFound();
    }

    public function test_starting_a_step_leaves_items_waiting_for_the_studio(): void
    {
        $queued = StoryVideoRun::for($this->lesson)->start(StoryMediaKind::CharacterSheet);

        $this->assertGreaterThanOrEqual(1, $queued);
        Queue::assertPushed(PrepareStudioItem::class, $queued);
        Queue::assertNotPushed(GenerateStoryPicture::class);
        Queue::assertNotPushed(GenerateStoryMedia::class);
        $sheet = $this->lesson->storyMedia()->where('kind', 'character_sheet')->first();
        $this->assertSame('studio', $sheet->model);
        $this->assertSame(StoryMediaStatus::Queued, $sheet->status);

        // No prompt yet: the Mac gets nothing.
        $this->mac()->postJson(route('api.studio.next'))->assertNoContent();
    }

    public function test_the_mac_pulls_a_batch_with_settings_and_references(): void
    {
        $sheet = $this->waitingSheet();

        $batch = $this->mac()->postJson(route('api.studio.next'), ['max' => 5])->assertOk()
            ->assertJsonPath('items.0.id', $sheet->id)->assertJsonPath('items.0.prompt', 'A character sheet of Marco Polo.')
            ->assertJsonPath('items.0.settings.model', config('story_video.studio.image_model'))
            ->assertJsonPath('items.0.settings.aspect_ratio', '16:9')->assertJsonPath('items.0.settings.seconds', null)
            ->json();

        $this->assertSame(StoryMediaStatus::Generating, $sheet->fresh()->status);
        $this->assertSame($batch['claim'], $sheet->fresh()->generation_id);
        $this->assertStringStartsWith('01-', $batch['items'][0]['references'][0]['name'] ?? '01-');
        // Nothing else waits now.
        $this->mac()->postJson(route('api.studio.next'))->assertNoContent();
        $this->mac()->getJson(route('api.studio.status'))->assertOk()->assertJsonPath('in_batch', 1)->assertJsonPath('waiting', 0);
    }

    public function test_a_clip_batch_carries_the_world_shot_and_sheet_in_order(): void
    {
        $clip = $this->waitingClip();

        $batch = $this->mac()->postJson(route('api.studio.next'))->assertOk()
            ->assertJsonPath('items.0.id', $clip->id)->assertJsonPath('items.0.settings.model', config('story_video.studio.video_model'))
            ->assertJsonPath('items.0.settings.audio', false)->json();

        $refs = $batch['items'][0]['references'];
        $this->assertCount(2, $refs);
        $this->assertSame('01-quay.png', $refs[0]['name']);
        $this->assertSame('world', $this->mac()->get($refs[0]['url'].'?claim='.$batch['claim'])->assertOk()->getContent());
        $this->assertSame('sheet', $this->mac()->get($refs[1]['url'].'?claim='.$batch['claim'])->assertOk()->getContent());
        $this->mac()->get($refs[0]['url'].'?claim=someone-else')->assertStatus(409);
        $this->assertGreaterThanOrEqual(4, $batch['items'][0]['settings']['seconds']);
    }

    public function test_a_delivered_picture_is_style_checked_and_waits_for_the_teacher(): void
    {
        $sheet = $this->waitingSheet();
        $claim = $this->mac()->postJson(route('api.studio.next'))->json('claim');

        $this->mac()->post(route('api.studio.finish', $sheet), ['claim' => $claim, 'file' => UploadedFile::fake()->image('sheet.png', 96, 64)])
            ->assertOk()->assertJsonPath('status', 'ready');

        $sheet->refresh();
        $this->assertSame(StoryMediaStatus::Ready, $sheet->status);
        $this->assertNull($sheet->generation_id);
        $this->assertIsArray($sheet->style);
        $this->assertArrayHasKey('problems', $sheet->style);
        Storage::disk('public')->assertExists($sheet->path);

        // The same claim cannot deliver twice.
        $this->mac()->post(route('api.studio.finish', $sheet), ['claim' => $claim, 'file' => UploadedFile::fake()->image('again.png', 96, 64)])
            ->assertStatus(409);
    }

    public function test_a_delivered_clip_waits_for_the_teacher(): void
    {
        $clip = $this->waitingClip();
        $claim = $this->mac()->postJson(route('api.studio.next'))->json('claim');

        $this->mac()->post(route('api.studio.finish', $clip), ['claim' => $claim, 'file' => UploadedFile::fake()->create('clip.mp4', 200, 'video/mp4')])
            ->assertOk()->assertJsonPath('status', 'ready');

        $clip->refresh();
        $this->assertSame(StoryMediaStatus::Ready, $clip->status);
        $this->assertStringContainsString("scenes/{$this->scene->id}/story-video/", $clip->path);
    }

    public function test_a_job_the_studio_could_not_make_is_reported(): void
    {
        $sheet = $this->waitingSheet();
        $claim = $this->mac()->postJson(route('api.studio.next'))->json('claim');

        $this->mac()->postJson(route('api.studio.finish', $sheet), ['claim' => $claim, 'error' => 'the studio showed a check'])
            ->assertOk()->assertJsonPath('status', 'failed');

        $this->assertSame(StoryMediaStatus::Failed, $sheet->fresh()->status);
        $this->assertStringContainsString('the studio showed a check', $sheet->fresh()->error);
    }

    public function test_a_released_or_stale_batch_waits_again_and_its_claim_is_refused(): void
    {
        $sheet = $this->waitingSheet();
        $first = $this->mac()->postJson(route('api.studio.next'))->json('claim');

        $this->mac()->postJson(route('api.studio.release'), ['claim' => $first])->assertOk()->assertJsonPath('released', 1);
        $this->assertSame(StoryMediaStatus::Queued, $sheet->fresh()->status);

        $second = $this->mac()->postJson(route('api.studio.next'))->json('claim');
        $sheet->update(['started_at' => now()->subMinutes(721)]);
        $third = $this->mac()->postJson(route('api.studio.next'))->assertOk()->json('claim');

        $this->assertNotSame($second, $third);
        $this->mac()->post(route('api.studio.finish', $sheet), ['claim' => $second, 'file' => UploadedFile::fake()->image('late.png', 96, 64)])
            ->assertStatus(409);
        $this->assertSame(StoryMediaStatus::Generating, $sheet->fresh()->status);
    }

    public function test_the_step_says_how_much_waits_for_the_studio(): void
    {
        $this->waitingSheet();
        $teacher = User::findOrFail($this->lesson->teacher_id);

        Livewire::actingAs($teacher)->test(StoryVideo::class, ['lesson' => $this->lesson])->set('step', 'character_sheet')
            ->assertSee(__('Made in the ElevenLabs studio from your Mac: :waiting waiting, :batch in a batch.', ['waiting' => 1, 'batch' => 0]))
            ->assertDontSee(__('No picture maker is set up yet (the ChatGPT route).'));
    }
    public function test_a_world_shot_without_an_outline_brief_still_names_its_place(): void
    {
        // A Twine import: no scene_briefs, the place lives in the scene's shot line.
        $this->lesson->update(['outline' => ['cast' => []]]);
        $this->scene->update(['config' => ['shot_note' => 'The Venice quay at dawn, galleys moored, the lagoon behind.']]);
        (new StoryVideoPlanner)->plan($this->lesson->fresh());

        $shot = $this->lesson->storyMedia()->where('kind', 'world_shot')->firstOrFail();
        $prompt = StoryVideoRun::for($this->lesson->fresh())->prompt($shot);

        $this->assertStringContainsString('The Venice quay at dawn', $prompt);

        // No shot line either: the narration says where we are.
        $this->scene->update(['config' => []]);
        $this->assertStringContainsString('Venice, 1271', StoryVideoPlanner::placeHint($this->scene->fresh()));
    }
}
