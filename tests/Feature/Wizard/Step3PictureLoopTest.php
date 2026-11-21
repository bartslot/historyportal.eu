<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\Support\SceneLoop;
use App\Services\VideoTranscoder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/**
 * An MP4 dropped on a story scene becomes its moving picture (Bart, 2026-11-21: "make sure our
 * story also accepts mp4"). The still stays the scene's picture; the loop plays over it.
 */
class Step3PictureLoopTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->teacher = User::create([
            'name' => 'Teacher', 'email' => 'teacher@example.com',
            'password' => 'secret-password', 'role' => 'teacher',
        ]);
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id,
            'title' => 'Moving pictures', 'topic' => 'Moving pictures',
            'subject' => 'history', 'grade_level' => '7',
            'status' => LessonStatus::Configuring,
        ]);
    }

    private function scene(array $attributes = []): Scene
    {
        return Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration',
            'status' => 'ready', 'script' => 'The ships row out.', ...$attributes,
        ]);
    }

    private function wizardOn(Scene $scene): \Livewire\Features\SupportTesting\Testable
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $scene->id);
    }

    /** A real two-second MP4, made with ffmpeg; the test is skipped on a machine without it. */
    private function realMp4(): \Illuminate\Http\Testing\File
    {
        if (! VideoTranscoder::make()->isAvailable()) {
            $this->markTestSkipped('ffmpeg is not installed here');
        }
        $path = sys_get_temp_dir().'/loop-'.uniqid().'.mp4';
        (new Process(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=16',
            '-t', '2', '-pix_fmt', 'yuv420p', $path]))->mustRun();

        $bytes = (string) file_get_contents($path);
        @unlink($path);

        return UploadedFile::fake()->createWithContent('ships.mp4', $bytes);
    }

    public function test_an_mp4_dropped_on_a_story_scene_becomes_its_moving_picture(): void
    {
        $scene = $this->scene(['image_path' => 'lessons/1/scenes/1/bg.jpg']);

        $this->wizardOn($scene)->set('droppedImage', $this->realMp4());

        $scene->refresh();
        $loop = SceneLoop::of($scene);
        $this->assertNotNull($loop, 'the scene should have a loop');
        Storage::disk('public')->assertExists($loop['src']);
        // The first frame is the new still, and the loop belongs to it.
        Storage::disk('public')->assertExists($scene->image_path);
        $this->assertSame($scene->image_path, $loop['poster']);
        $this->assertNotNull(SceneLoop::urlForScene($scene));
    }

    public function test_the_background_slot_takes_an_mp4_too(): void
    {
        $scene = $this->scene();

        $this->wizardOn($scene)->set('droppedBackground', $this->realMp4());

        $scene->refresh();
        $this->assertNotNull($scene->image_path, 'the first frame becomes the picture');
        $this->assertNotNull(SceneLoop::urlForScene($scene));
    }

    public function test_without_ffmpeg_the_existing_picture_is_the_still(): void
    {
        config(['services.ffmpeg.path' => '/nonexistent/ffmpeg', 'services.ffmpeg.probe_path' => '/nonexistent/ffprobe']);
        $scene = $this->scene(['image_path' => 'lessons/1/scenes/1/bg.jpg']);

        $this->wizardOn($scene)->set('droppedImage', UploadedFile::fake()->create('ships.mp4', 500, 'video/mp4'));

        $scene->refresh();
        $this->assertSame('lessons/1/scenes/1/bg.jpg', $scene->image_path);
        $this->assertSame('lessons/1/scenes/1/bg.jpg', SceneLoop::of($scene)['poster'] ?? null);
    }

    public function test_without_ffmpeg_and_without_a_picture_the_video_is_refused(): void
    {
        config(['services.ffmpeg.path' => '/nonexistent/ffmpeg', 'services.ffmpeg.probe_path' => '/nonexistent/ffprobe']);
        $scene = $this->scene();

        $this->wizardOn($scene)->set('droppedBackground', UploadedFile::fake()->create('ships.mp4', 500, 'video/mp4'))
            ->assertDispatched('toast');

        $scene->refresh();
        $this->assertNull(SceneLoop::of($scene));
        $this->assertSame([], Storage::disk('public')->allFiles('lessons/'.$this->lesson->id.'/uploads'));
    }

    public function test_a_new_picture_drops_the_old_loop_and_stop_moving_removes_it(): void
    {
        $scene = $this->scene([
            'image_path' => 'lessons/1/a.jpg',
            'config' => SceneLoop::with([], 'lessons/1/a.mp4', 'lessons/1/a.jpg'),
        ]);
        $this->assertNotNull(SceneLoop::urlForScene($scene));

        $scene->update(['image_path' => 'lessons/1/b.jpg']);
        $this->assertNull(SceneLoop::urlForScene($scene->refresh()), 'another picture never gets the old motion');

        $scene->update(['image_path' => 'lessons/1/a.jpg']);
        $this->wizardOn($scene)->call('removeBackgroundLoop');
        $this->assertNull(SceneLoop::of($scene->refresh()));
        $this->assertSame('lessons/1/a.jpg', $scene->image_path, 'the still stays');
    }

    public function test_a_split_scene_refuses_a_video(): void
    {
        $scene = $this->scene(['image_path' => 'lessons/1/a.jpg', 'config' => ['split' => ['layout' => 'cols2']]]);

        $this->wizardOn($scene)->set('droppedImage', UploadedFile::fake()->create('ships.mp4', 500, 'video/mp4'))
            ->assertDispatched('toast');

        $this->assertNull(SceneLoop::of($scene->refresh()));
    }

    public function test_the_class_player_gets_the_loop(): void
    {
        $scene = $this->scene([
            'image_path' => 'lessons/1/a.jpg',
            'config' => SceneLoop::with([], 'lessons/1/a.mp4', '/storage/lessons/1/a.jpg'),
        ]);

        $this->assertSame(Storage::disk('public')->url('lessons/1/a.mp4'), SceneLoop::urlForScene($scene));
        $this->assertSame(Storage::disk('public')->url('lessons/1/a.mp4'), SceneLoop::urlFor($scene, 'lessons/1/a.jpg?v=3'));
        $this->assertNull(SceneLoop::urlFor($scene, null));
    }

    public function test_the_upload_picker_takes_an_mp4_for_the_scene_background(): void
    {
        // Bart, 2026-11-21: "the upload image field must be an image" when choosing a video there.
        $scene = $this->scene(['image_path' => 'lessons/1/scenes/1/bg.jpg']);

        $this->wizardOn($scene)
            ->call('openPaintingPicker')
            ->set('uploadImage', $this->realMp4())
            ->assertHasNoErrors('uploadImage')
            ->assertSet('paintingPickerOpen', false);

        $scene->refresh();
        $this->assertNotNull(SceneLoop::urlForScene($scene));
        $this->assertSame($scene->image_path, SceneLoop::of($scene)['poster']);
    }

    public function test_the_upload_picker_without_ffmpeg_keeps_the_picture_as_the_still(): void
    {
        config(['services.ffmpeg.path' => '/nonexistent/ffmpeg', 'services.ffmpeg.probe_path' => '/nonexistent/ffprobe']);
        $scene = $this->scene(['image_path' => 'lessons/1/scenes/1/bg.jpg']);

        $this->wizardOn($scene)
            ->call('openPaintingPicker')
            ->set('uploadImage', UploadedFile::fake()->create('ships.mp4', 500, 'video/mp4'))
            ->assertHasNoErrors('uploadImage');

        $this->assertSame('lessons/1/scenes/1/bg.jpg', SceneLoop::of($scene->refresh())['poster'] ?? null);
    }

    public function test_a_gallery_image_picker_refuses_a_video_with_a_reason(): void
    {
        $scene = $this->scene(['image_path' => 'lessons/1/scenes/1/bg.jpg']);

        $this->wizardOn($scene)
            ->set('paintingPickerMode', 'gallery_image')
            ->set('uploadImage', UploadedFile::fake()->create('ships.mp4', 500, 'video/mp4'))
            ->assertHasErrors('uploadImage');

        $this->assertNull(SceneLoop::of($scene->refresh()));
    }

    public function test_the_upload_picker_still_refuses_a_video_over_the_limit(): void
    {
        $scene = $this->scene(['image_path' => 'lessons/1/scenes/1/bg.jpg']);

        $this->wizardOn($scene)
            ->call('openPaintingPicker')
            ->set('uploadImage', UploadedFile::fake()->create('ships.mp4', 60 * 1024, 'video/mp4'))
            ->assertDispatched('toast');

        $this->assertNull(SceneLoop::of($scene->refresh()));
    }
}
