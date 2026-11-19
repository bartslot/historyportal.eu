<?php

declare(strict_types=1);

namespace Tests\Feature\Stage25d;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\Art\HistoryLineStyle;
use App\Services\Editor\Cutouts;
use App\Services\Local\SparkJobs;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/** Draw with ChatGPT (DrawsWithChatGpt + chatgpt:draw): a new History Lines cut-out that lands where every scene can use it. */
class DrawTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            ['id' => 'stone-chamber-01', 'layer' => 'mid', 'file' => 'a.png'],
        ]]));
        config(['services.chatgpt_local.enabled' => true, 'services.chatgpt_local.bin' => '/bin/echo']);
    }

    /** What ChatGPT sends back: a figure-sized block of colour on #00FF00, with room around it. */
    private static function onGreen(int $w = 300, int $h = 400): string
    {
        $im = imagecreatetruecolor($w, $h);
        imagefilledrectangle($im, 0, 0, $w, $h, imagecolorallocate($im, 0, 255, 0));
        imagefilledellipse($im, 150, 200, 100, 300, imagecolorallocate($im, 160, 90, 40));   // round: the corners of its box are background
        ob_start();
        imagepng($im);

        return (string) ob_get_clean();
    }

    private function scene(?User $teacher = null): Scene
    {
        $lesson = Lesson::create([
            'teacher_id' => ($teacher ?? User::factory()->create())->id,
            'topic' => 'Marco Polo', 'subject' => 'history', 'grade_level' => '6', 'era' => 'c. 1275',
            'image_style' => 'realistic', 'status' => LessonStatus::ScenesReady,
        ]);

        return Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'stage25d', 'script_segment' => 'x', 'status' => 'ready',
            'config' => ['stage25d' => ['bundle' => 'nl-prehistory', 'beat' => 'hook', 'set' => ['layers' => [['asset' => 'stone-chamber-01', 'depth' => 'mid', 'x' => 0.6]]]]],
        ]);
    }

    private function editor(Scene $scene)
    {
        return Livewire::actingAs($scene->lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->set('selectedSceneId', $scene->id);
    }

    public function test_off_or_a_bad_request_starts_nothing(): void
    {
        Process::fake();
        $editor = $this->editor($this->scene())->instance();

        $this->assertFalse($editor->drawPicture('   ')['ok']);
        $this->assertFalse($editor->drawPicture(str_repeat('x', 301))['ok']);
        config(['services.chatgpt_local.enabled' => false]);
        $this->assertFalse($editor->drawPicture('Marco Polo on a camel')['ok']);
        Process::assertNothingRan();
    }

    public function test_a_draw_is_both_history_lines_passes_on_green_and_lands_as_the_teachers_cut_out(): void
    {
        $seen = [];
        Process::fake(function (PendingProcess $p) use (&$seen) {
            if (($p->command[0] ?? '') === 'sh') {
                return Process::result();   // the detached start: the command runs by hand below
            }
            $seen = ['prompt' => $p->input, 'command' => $p->command];
            $dir = $p->command[array_search('-C', $p->command, true) + 1];
            file_put_contents("{$dir}/ink.png", self::onGreen());   // the ink step's file is not the one kept
            file_put_contents("{$dir}/result.png", self::onGreen());

            return Process::result("codex\nDone.\ntokens used: 5");
        });
        $scene = $this->scene();
        $editor = $this->editor($scene);

        $job = $editor->instance()->drawPicture('Marco Polo on a camel');
        $this->assertTrue($job['ok']);
        $this->assertSame('running', $editor->instance()->drawStatus($job['job'])['status']);
        $this->assertSame([], $editor->instance()->sparkPending(), 'a Draw is not a spark: the spark never tries to land it on a layer');

        Artisan::call('chatgpt:draw', ['job' => $job['job']]);

        $this->assertStringContainsString('Marco Polo on a camel', $seen['prompt']);
        $this->assertStringContainsString('c. 1275', $seen['prompt'], 'the lesson era keeps the drawing in its time');
        $this->assertStringContainsString('Step 1, the ink', $seen['prompt']);
        $this->assertStringContainsString(HistoryLineStyle::COLOUR_PROMPT, $seen['prompt'], 'the colour pass is Bart\'s prompt, verbatim');
        $this->assertStringContainsString('#00FF00', $seen['prompt'], 'a cut-out is made on green, never white paper');
        $this->assertSame(5, substr_count(implode(' ', $seen['command']), ' -i '), 'the ink anchors and the colour anchors go along');

        $done = $editor->instance()->drawStatus($job['job']);
        $this->assertSame('done', $done['status']);
        $this->assertSame($scene->id, $done['scene']);
        $asset = SvgAsset::findOrFail($done['id']);
        $this->assertSame(Cutouts::SOURCE, $asset->source, 'in My cut-outs, so every scene can use it');
        $this->assertSame('cut-'.$asset->id, $done['stage']['id'], 'and a row of the 3D library');

        $file = Storage::disk('public')->path($asset->svg_path);
        [$w, $h] = getimagesize($file);
        $this->assertEqualsWithDelta(100, $w, 2, 'cropped to what is painted');
        $this->assertEqualsWithDelta(300, $h, 2, 'its feet are the bottom edge the stage stands it on');
        $im = imagecreatefromstring((string) file_get_contents($file));
        $this->assertSame(127, (imagecolorat($im, 0, 0) >> 24) & 0x7F, 'the green is keyed out');
        $this->assertSame(0, (imagecolorat($im, (int) ($w / 2), (int) ($h / 2)) >> 24) & 0x7F, 'the figure stays');
        $this->assertNull(SparkJobs::read($job['job']), 'the job is cleaned up');
    }

    public function test_a_chatgpt_failure_saves_nothing_and_says_so(): void
    {
        Process::fake(fn (PendingProcess $p) => ($p->command[0] ?? '') === 'sh' ? Process::result() : Process::result('', 'not logged in', 1));
        $editor = $this->editor($this->scene());

        $job = $editor->instance()->drawPicture('Marco Polo on a camel');
        Artisan::call('chatgpt:draw', ['job' => $job['job']]);

        $this->assertSame('failed', $editor->instance()->drawStatus($job['job'])['status']);
        $this->assertSame(0, SvgAsset::query()->where('source', Cutouts::SOURCE)->count());
    }

    public function test_someone_elses_draw_or_a_made_up_job_is_nothing(): void
    {
        $editor = $this->editor($this->scene())->instance();
        $this->assertSame('failed', $editor->drawStatus('../../etc/passwd')['status']);
        $this->assertSame('failed', $editor->drawStatus('spark-000000000000000000000000')['status']);

        $job = SparkJobs::newId();
        SparkJobs::write($job, ['draw' => true, 'status' => SparkJobs::DONE, 'user' => User::factory()->create()->id, 'scene' => 1, 'asset' => 1]);
        $this->assertSame('failed', $editor->drawStatus($job)['status']);
        $this->assertNotNull(SparkJobs::read($job), 'their job is left alone');
        File::deleteDirectory(SparkJobs::dir($job));
    }
}
