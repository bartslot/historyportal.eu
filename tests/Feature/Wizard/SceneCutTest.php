<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Symfony\Component\Process\Process;
use Tests\TestCase;

/**
 * The timeline's cut tool: one scene becomes two at the playhead, each a whole scene that can take
 * its own background, and one undo makes it one scene again.
 */
class SceneCutTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create(['teacher_id' => $this->teacher->id, 'topic' => 'Marco Polo', 'subject' => 'history', 'grade_level' => '6']);
    }

    private function scene(int $order, array $extra = []): Scene
    {
        return Scene::create(['lesson_id' => $this->lesson->id, 'order' => $order, 'kind' => 'narration', 'status' => 'ready', ...$extra]);
    }

    private function timeline(float $duration, array $tracks = []): array
    {
        return ['duration' => $duration, 'targets' => [], 'tracks' => $tracks];
    }

    public function test_a_cut_makes_two_scenes_in_a_row_and_opens_the_second(): void
    {
        $this->scene(1, ['script_segment' => 'Before.']);
        $scene = $this->scene(2, [
            'script_segment' => 'The ship left Venice. It sailed for weeks.',
            'image_path' => 'lessons/1/venice.webp',
            'config' => ['timeline' => $this->timeline(8.0), 'lines' => [['text' => 'Ahoy', 'start' => 6, 'end' => null]]],
        ]);
        $this->scene(3, ['script_segment' => 'After.']);

        $component = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $scene->id);
        $this->assertTrue($component->instance()->cutPointFor(4.0)['ok']);
        $component->call('cutSceneAt', 4.0,
            $this->timeline(4.0, [['target' => 'text:t1', 'property' => 'opacity', 'keyframes' => [['time' => 0, 'value' => 0], ['time' => 4, 'value' => 0.5]]]]),
            $this->timeline(4.0, [['target' => 'text:t1', 'property' => 'opacity', 'keyframes' => [['time' => 0, 'value' => 0.5], ['time' => 2, 'value' => 1]]]]),
        );

        $scenes = $this->lesson->scenes()->ordered()->get();
        $this->assertSame(['Before.', 'The ship left Venice.', 'It sailed for weeks.', 'After.'], $scenes->pluck('script_segment')->all());
        [, $first, $second] = $scenes->all();
        $this->assertSame($scene->id, $first->id);
        $this->assertSame('lessons/1/venice.webp', $second->image_path, 'the second part starts on the same picture');
        $this->assertSame(4.0, (float) $first->config['timeline']['duration']);
        $this->assertSame(0.5, (float) $second->config['timeline']['tracks'][0]['keyframes'][0]['value']);
        $this->assertSame([], $first->config['lines'], 'the balloon came on after the cut');
        $this->assertSame(2.0, (float) $second->config['lines'][0]['start']);
        $this->assertSame($second->id, $component->get('selectedSceneId'));
    }

    public function test_undo_makes_the_two_parts_one_scene_again(): void
    {
        $scene = $this->scene(1, ['script_segment' => 'The ship left Venice. It sailed for weeks.', 'config' => ['timeline' => $this->timeline(8.0)]]);
        $this->scene(2, ['script_segment' => 'After.']);

        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $scene->id)
            ->call('cutSceneAt', 4.0, $this->timeline(4.0), $this->timeline(4.0))
            ->call('undoLastEdit')
            ->assertSet('selectedSceneId', $scene->id);

        $scenes = $this->lesson->scenes()->ordered()->get();
        $this->assertSame(['The ship left Venice. It sailed for weeks.', 'After.'], $scenes->pluck('script_segment')->all());
        $this->assertSame([1, 2], $scenes->pluck('order')->all());
        $this->assertSame(8.0, (float) $scenes->first()->config['timeline']['duration']);
    }

    public function test_a_cut_near_either_end_or_on_a_game_is_refused(): void
    {
        $scene = $this->scene(1, ['script_segment' => 'Short.', 'config' => ['timeline' => $this->timeline(6.0)]]);
        $game = $this->scene(2, ['kind' => 'game', 'game_type' => 'quiz']);

        $component = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $scene->id);
        $this->assertFalse($component->instance()->cutPointFor(0.2)['ok']);
        $this->assertFalse($component->instance()->cutPointFor(5.9)['ok']);
        $component->call('cutSceneAt', 0.2, $this->timeline(0.2), $this->timeline(5.8));
        $this->assertSame(2, $this->lesson->scenes()->count());

        $component->call('selectScene', $game->id);
        $this->assertFalse($component->instance()->cutPointFor(3.0)['ok']);
    }

    public function test_the_narration_audio_is_cut_on_the_word_gap_and_stays_fresh(): void
    {
        if ((new Process(['ffmpeg', '-version']))->run() !== 0) {
            $this->markTestSkipped('ffmpeg is not installed');
        }
        Storage::fake('public');
        $mp3 = 'lessons/'.$this->lesson->id.'/scenes/x/narration.mp3';
        Storage::disk('public')->makeDirectory(dirname($mp3));
        $make = new Process(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-c:a', 'libmp3lame', Storage::disk('public')->path($mp3)]);
        if ($make->run() !== 0) {
            $this->markTestSkipped('ffmpeg cannot write mp3 here');
        }

        $script = 'Marco sailed east';
        $align = [];
        $t = 0.0;
        foreach (mb_str_split($script) as $c) {
            $len = $c === ' ' ? 0.3 : 0.15;
            $align[] = ['character' => $c, 'start_time' => round($t, 3), 'end_time' => round($t + $len, 3)];
            $t += $len;
        }
        $scene = $this->scene(1, [
            'script_segment' => $script, 'audio_path' => $mp3, 'audio_alignment' => $align,
            'audio_script_hash' => sha1($script), 'config' => ['timeline' => $this->timeline(3.0)],
        ]);

        $component = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $scene->id);
        $point = $component->instance()->cutPointFor(0.6);
        $this->assertSame(0.9, $point['at'], 'the gap between "Marco" (ends 0.75) and "sailed" (starts 1.05)');
        $component->call('cutSceneAt', $point['at'], $this->timeline(0.9), $this->timeline(2.1));

        [$first, $second] = $this->lesson->scenes()->ordered()->get()->all();
        $this->assertSame(['Marco', 'sailed east'], [$first->script_segment, $second->script_segment]);
        $this->assertTrue($first->hasFreshAudio() && $second->hasFreshAudio(), 'no new narration is needed');
        $this->assertNotSame($mp3, $first->audio_path, 'the original file stays for undo');
        Storage::disk('public')->assertExists([$mp3, $first->audio_path, $second->audio_path]);
        $this->assertSame('s', $second->audio_alignment[0]['character']);
        $this->assertSame(0.15, $second->audio_alignment[0]['start_time']);

        $component->call('undoSceneCut');
        $this->assertSame($mp3, $first->fresh()->audio_path);
        Storage::disk('public')->assertExists($mp3);
        Storage::disk('public')->assertMissing([$first->audio_path, $second->audio_path]);   // the cut's own files go with it
    }
}
