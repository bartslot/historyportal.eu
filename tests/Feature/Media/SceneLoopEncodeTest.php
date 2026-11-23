<?php

declare(strict_types=1);

namespace Tests\Feature\Media;

use App\Enums\LessonStatus;
use App\Jobs\EncodeSceneLoop;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\Support\SceneLoop;
use App\Services\VideoTranscoder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/**
 * A scene's uploaded moving picture becomes the small class files: a 720p, 12 fps, silent H.264
 * loop and an AV1 copy (render test, 2026-11-23: AV1 1.4 MB and H.264 2.2 MB per 15 s).
 */
class SceneLoopEncodeTest extends TestCase
{
    use RefreshDatabase;

    private Lesson $lesson;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $teacher = User::create([
            'name' => 'Teacher', 'email' => 'teacher@example.com',
            'password' => 'secret-password', 'role' => 'teacher',
        ]);
        $this->lesson = Lesson::create([
            'teacher_id' => $teacher->id, 'title' => 'Loops', 'topic' => 'Loops',
            'subject' => 'history', 'grade_level' => '7', 'status' => LessonStatus::Configuring,
        ]);
    }

    /** A 1080p, 24 fps clip with sound, stored as an upload, like a loop straight from the render PC. */
    private function upload(): string
    {
        $transcoder = VideoTranscoder::make();
        if (! $transcoder->isAvailable() || ! in_array('libx264', $transcoder->encoders(), true)) {
            $this->markTestSkipped('ffmpeg with libx264 is not installed here');
        }
        $path = "lessons/{$this->lesson->id}/uploads/ships.mp4";
        Storage::disk('public')->put($path, '');
        (new Process([
            'ffmpeg', '-y', '-loglevel', 'error',
            '-f', 'lavfi', '-i', 'testsrc=size=1920x1080:rate=24',
            '-f', 'lavfi', '-i', 'sine=frequency=440',
            '-t', '2', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest',
            Storage::disk('public')->path($path),
        ]))->mustRun();

        return $path;
    }

    private function sceneWithLoop(string $src): Scene
    {
        return Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'script' => 'The ships row out.', 'image_path' => 'lessons/1/bg.jpg',
            'config' => SceneLoop::with([], $src, 'lessons/1/bg.jpg'),
        ]);
    }

    /** @return array{codec: string, height: int, fps: string, audio: bool} */
    private function probe(string $path): array
    {
        $abs = Storage::disk('public')->path($path);
        $v = new Process(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,height,r_frame_rate', '-of', 'csv=p=0', $abs]);
        $v->mustRun();
        [$codec, $height, $fps] = explode(',', trim($v->getOutput()));
        $a = new Process(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', $abs]);
        $a->mustRun();

        return ['codec' => $codec, 'height' => (int) $height, 'fps' => $fps, 'audio' => trim($a->getOutput()) !== ''];
    }

    public function test_an_upload_becomes_a_720p_12fps_silent_loop_and_the_upload_goes(): void
    {
        $upload = $this->upload();
        $scene = $this->sceneWithLoop($upload);

        EncodeSceneLoop::dispatchSync($scene->id, $upload);

        $loop = SceneLoop::of($scene->refresh());
        $this->assertSame(VideoTranscoder::loopPathFor($upload), $loop['src']);
        $this->assertSame(['codec' => 'h264', 'height' => 720, 'fps' => '12/1', 'audio' => false], $this->probe($loop['src']));
        Storage::disk('public')->assertMissing($upload);
        $this->assertSame('lessons/1/bg.jpg', $loop['poster']);
    }

    public function test_an_av1_copy_sits_beside_it_and_the_url_says_so(): void
    {
        if (! array_intersect(['libsvtav1', 'libaom-av1'], VideoTranscoder::make()->encoders())) {
            $this->markTestSkipped('ffmpeg has no AV1 encoder here');
        }
        $upload = $this->upload();
        $scene = $this->sceneWithLoop($upload);

        EncodeSceneLoop::dispatchSync($scene->id, $upload);

        $loop = SceneLoop::of($scene->refresh());
        $this->assertSame(VideoTranscoder::av1PathFor($loop['src']), $loop['av1']);
        $this->assertSame('av1', $this->probe($loop['av1'])['codec']);
        $this->assertStringEndsWith('.loop.mp4#av1', SceneLoop::urlForScene($scene));
    }

    public function test_a_scene_that_moved_on_keeps_its_choice_and_no_files_are_left(): void
    {
        $upload = $this->upload();
        $scene = $this->sceneWithLoop('lessons/1/uploads/other.mp4');

        EncodeSceneLoop::dispatchSync($scene->id, $upload);

        $this->assertSame('lessons/1/uploads/other.mp4', SceneLoop::of($scene->refresh())['src']);
        Storage::disk('public')->assertExists($upload);
        Storage::disk('public')->assertMissing(VideoTranscoder::loopPathFor($upload));
    }

    public function test_without_ffmpeg_the_upload_keeps_playing(): void
    {
        config(['services.ffmpeg.path' => '/nonexistent/ffmpeg']);
        Storage::disk('public')->put('lessons/1/uploads/ships.mp4', 'video');
        $scene = $this->sceneWithLoop('lessons/1/uploads/ships.mp4');

        EncodeSceneLoop::dispatchSync($scene->id, 'lessons/1/uploads/ships.mp4');

        $this->assertSame('lessons/1/uploads/ships.mp4', SceneLoop::of($scene->refresh())['src']);
        $this->assertStringEndsNotWith('#av1', (string) SceneLoop::urlForScene($scene));
    }

    public function test_the_av1_marker_needs_the_copy_beside_the_loop(): void
    {
        $scene = $this->sceneWithLoop('lessons/1/uploads/a.loop.mp4');
        $scene->update(['config' => SceneLoop::with([], 'lessons/1/uploads/a.loop.mp4', 'lessons/1/bg.jpg', 'elsewhere/b.mp4')]);

        $this->assertStringEndsNotWith('#av1', (string) SceneLoop::urlForScene($scene->refresh()));
        $this->assertSame('lessons/1/uploads/a.loop.av1.mp4', VideoTranscoder::av1PathFor('lessons/1/uploads/a.loop.mp4'));
        $this->assertSame('lessons/1/uploads/a.loop.mp4', VideoTranscoder::loopPathFor('lessons/1/uploads/a.mp4'));
    }
}
