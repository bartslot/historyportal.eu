<?php

declare(strict_types=1);

namespace Tests\Feature\Stage25d;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\Local\LocalChatGpt;
use App\Services\Local\SparkJobs;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

class SparkTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            ['id' => 'stone-chamber-01', 'layer' => 'mid', 'file' => 'a.png'],
        ]]));
        Storage::disk('public')->put('library/nl-prehistory/a.png', self::png(40, 80, true));
        config(['services.chatgpt_local.enabled' => true, 'services.chatgpt_local.bin' => '/bin/echo']);
    }

    /** A picture: a block of colour, on see-through or filling the frame. */
    private static function png(int $w, int $h, bool $cutOut): string
    {
        $im = imagecreatetruecolor($w, $h);
        imagealphablending($im, false);
        imagesavealpha($im, true);
        imagefilledrectangle($im, 0, 0, $w, $h, imagecolorallocatealpha($im, 0, 0, 0, $cutOut ? 127 : 0));
        imagefilledrectangle($im, (int) ($w * 0.25), (int) ($h * 0.1), (int) ($w * 0.75), $h - 1, imagecolorallocatealpha($im, 200, 90, 40, 0));
        ob_start();
        imagepng($im);

        return (string) ob_get_clean();
    }

    private function scene(): Scene
    {
        $lesson = Lesson::create([
            'teacher_id' => User::factory()->create()->id,
            'topic' => 'Hunebedden', 'subject' => 'history', 'grade_level' => '6',
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

    public function test_off_means_refused_and_nothing_starts(): void
    {
        config(['services.chatgpt_local.enabled' => false]);
        Process::fake();
        $scene = $this->scene();

        $this->assertFalse(LocalChatGpt::available());
        $this->assertSame(['ok' => false], $this->editor($scene)->instance()->sparkEdit('s25_layer-0', 'make it red'));
        Process::assertNothingRan();
    }

    public function test_a_bad_request_is_refused(): void
    {
        Process::fake();
        $editor = $this->editor($this->scene())->instance();

        $this->assertFalse($editor->sparkEdit('s25_layer-0', '   ')['ok']);
        $this->assertFalse($editor->sparkEdit('s25_layer-0', str_repeat('x', 501))['ok']);
        $this->assertFalse($editor->sparkEdit('s25_layer-9', 'make it red')['ok']);
        $this->assertFalse($editor->sparkEdit('nonsense', 'make it red')['ok']);
        Process::assertNothingRan();
    }

    public function test_an_edit_runs_detached_keeps_the_frame_and_lands_as_the_layers_own_copy(): void
    {
        $seen = [];
        Process::fake(function (PendingProcess $p) use (&$seen) {
            if (($p->command[0] ?? '') === 'sh') {
                return Process::result();   // the detached start: the command runs by hand below
            }
            $seen = ['prompt' => $p->input, 'command' => $p->command];
            $dir = $p->command[array_search('-C', $p->command, true) + 1];
            file_put_contents("{$dir}/result.png", self::png(200, 300, true));   // another size than the picture

            return Process::result("codex\nDone.\ntokens used: 5");
        });
        $scene = $this->scene();
        $editor = $this->editor($scene);

        $job = $editor->instance()->sparkEdit('s25_layer-0', 'give him a hat');
        $this->assertTrue($job['ok']);
        $this->assertSame('running', $editor->instance()->sparkStatus($job['job'])['status']);

        Artisan::call('chatgpt:edit-image', ['job' => $job['job']]);

        $this->assertStringContainsString('give him a hat', $seen['prompt']);
        $this->assertStringContainsString('History Lines', $seen['prompt'], 'a 3D scene is History Lines, whatever image_style says');
        $this->assertStringContainsString('Transparent background', $seen['prompt']);

        $this->assertSame('done', $editor->instance()->sparkStatus($job['job'])['status']);
        $src = $scene->fresh()->config['stage25d']['set']['layers'][0]['src'];
        $file = Storage::disk('public')->path(preg_replace('#^.*/storage/#', '', $src));
        $this->assertSame([40, 80], array_slice(getimagesize($file), 0, 2), 'the same pixel size: a figure keeps its size on stage');
        Storage::disk('public')->assertExists('library/nl-prehistory/a.png');
        $this->assertNull(SparkJobs::read($job['job']), 'the job is cleaned up');
    }

    public function test_a_chatgpt_failure_leaves_the_picture_and_says_so(): void
    {
        Process::fake(fn (PendingProcess $p) => ($p->command[0] ?? '') === 'sh' ? Process::result() : Process::result('', 'not logged in', 1));
        $scene = $this->scene();
        $editor = $this->editor($scene);

        $job = $editor->instance()->sparkEdit('s25_layer-0', 'give him a hat');
        Artisan::call('chatgpt:edit-image', ['job' => $job['job']]);

        $this->assertSame('failed', $editor->instance()->sparkStatus($job['job'])['status']);
        $this->assertArrayNotHasKey('src', $scene->fresh()->config['stage25d']['set']['layers'][0]);
    }

    public function test_another_teachers_lesson_or_a_made_up_job_is_nothing(): void
    {
        $editor = $this->editor($this->scene())->instance();
        $this->assertSame('failed', $editor->sparkStatus('../../etc/passwd')['status']);
        $this->assertSame('failed', $editor->sparkStatus('spark-000000000000000000000000')['status']);

        $other = $this->scene();
        $job = SparkJobs::newId();
        SparkJobs::write($job, ['status' => SparkJobs::DONE, 'scene' => $other->id, 'target' => 's25_layer-0', 'source' => 'x']);
        $this->assertSame('failed', $editor->sparkStatus($job)['status']);
        SparkJobs::forget($job);
        File::deleteDirectory(SparkJobs::dir($job));
    }

    public function test_the_text_role_goes_to_chatgpt_here_and_only_when_asked(): void
    {
        Process::fake(fn () => Process::result("codex\nA better sentence.\ntokens used: 5"));
        config(['llm.roles.improve' => 'chatgpt_local']);

        $this->assertSame('A better sentence.', app(\App\Services\Llm\LlmRouter::class)->for('improve')->text('Rewrite.', 'A sentence.'));
    }

    private function finishedJob(Scene $scene, string $target, string $picture): string
    {
        $job = SparkJobs::newId();
        SparkJobs::write($job, ['status' => SparkJobs::DONE, 'scene' => $scene->id, 'target' => $target, 'source' => $picture, 'picture' => $picture, 'started' => time()]);
        file_put_contents(SparkJobs::dir($job).'/result.png', self::png(40, 80, true));

        return $job;
    }

    private function twoLayers(): Scene
    {
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            ['id' => 'stone-chamber-01', 'layer' => 'mid', 'file' => 'a.png'], ['id' => 'tree-birch-01', 'layer' => 'mid', 'file' => 'b.png'],
        ]]));
        Storage::disk('public')->put('library/nl-prehistory/b.png', self::png(40, 80, true));
        $scene = $this->scene();
        $config = $scene->config;
        $config['stage25d']['set']['layers'][] = ['asset' => 'tree-birch-01', 'depth' => 'mid', 'x' => 0.2];
        $scene->update(['config' => $config]);

        return $scene;
    }

    public function test_a_result_follows_its_picture_when_a_layer_above_it_was_deleted(): void
    {
        $scene = $this->twoLayers();
        $editor = $this->editor($scene);
        $job = $this->finishedJob($scene, 's25_layer-1', Storage::disk('public')->path('library/nl-prehistory/b.png'));

        $config = $scene->fresh()->config;
        array_shift($config['stage25d']['set']['layers']);   // the first layer goes: the birch is row 0 now
        $scene->update(['config' => $config]);
        $editor->instance()->lesson->refresh();

        $this->assertSame('done', $editor->instance()->sparkStatus($job)['status']);
        $layers = $scene->fresh()->config['stage25d']['set']['layers'];
        $this->assertSame('tree-birch-01', $layers[0]['asset']);
        $this->assertArrayHasKey('src', $layers[0]);
    }

    public function test_a_result_never_lands_on_a_picture_that_changed_meanwhile(): void
    {
        $scene = $this->twoLayers();
        $editor = $this->editor($scene);
        $job = $this->finishedJob($scene, 's25_layer-0', Storage::disk('public')->path('library/nl-prehistory/a.png'));

        $config = $scene->fresh()->config;
        $config['stage25d']['set']['layers'][0]['asset'] = 'tree-birch-01';   // saved another picture in the editor, or swapped it
        $config['stage25d']['set']['layers'][1]['asset'] = 'tree-birch-01';
        $scene->update(['config' => $config]);

        $this->assertSame('failed', $editor->instance()->sparkStatus($job)['status']);
        $this->assertArrayNotHasKey('src', $scene->fresh()->config['stage25d']['set']['layers'][0]);
    }

    public function test_after_a_reload_the_page_finds_this_lessons_edits_and_no_one_elses(): void
    {
        $scene = $this->scene();
        $mine = $this->finishedJob($scene, 's25_layer-0', 'x');
        $theirs = $this->finishedJob($this->scene(), 's25_layer-0', 'x');

        $found = $this->editor($scene)->instance()->sparkPending();

        $this->assertContains(['job' => $mine, 'key' => $scene->id.':s25_layer-0'], $found);
        $this->assertNotContains($theirs, array_column($found, 'job'));
        SparkJobs::forget($mine);
        SparkJobs::forget($theirs);
    }

    public function test_an_edit_whose_command_died_ends_instead_of_staying_busy(): void
    {
        $scene = $this->scene();
        $job = SparkJobs::newId();
        SparkJobs::write($job, ['status' => SparkJobs::RUNNING, 'scene' => $scene->id, 'target' => 's25_layer-0', 'source' => 'x', 'picture' => 'x', 'started' => time() - 3600]);

        $this->assertSame('failed', $this->editor($scene)->instance()->sparkStatus($job)['status']);
        $this->assertNull(SparkJobs::read($job));
    }

    public function test_a_result_landing_in_another_scene_leaves_the_teacher_where_they_are(): void
    {
        $here = $this->scene();
        $there = Scene::create(['lesson_id' => $here->lesson_id, 'order' => 2, 'kind' => 'stage25d', 'script_segment' => 'y', 'status' => 'ready', 'config' => $here->config]);
        $editor = $this->editor($here);
        $job = $this->finishedJob($there, 's25_layer-0', Storage::disk('public')->path('library/nl-prehistory/a.png'));

        $this->assertSame('done', $editor->instance()->sparkStatus($job)['status']);
        $this->assertSame($here->id, (int) $editor->instance()->selectedSceneId);
        $this->assertArrayHasKey('src', $there->fresh()->config['stage25d']['set']['layers'][0]);
        $this->assertArrayNotHasKey('src', $here->fresh()->config['stage25d']['set']['layers'][0]);
    }

    public function test_the_local_text_role_refuses_where_chatgpt_is_not_available(): void
    {
        config(['services.chatgpt_local.enabled' => false, 'llm.roles.improve' => 'chatgpt_local']);
        Process::fake();

        $this->expectExceptionMessage('not available here');
        try {
            app(\App\Services\Llm\LlmRouter::class)->for('improve')->text('a', 'b');
        } finally {
            Process::assertNothingRan();
        }
    }
}
