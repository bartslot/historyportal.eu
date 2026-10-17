<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\Support\SpeechBalloons;
use App\Support\LayerEntrances;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Bart, 2026-10-17: "can we add timing functions next to appear: fast / Slow ... als add a delay
 * (just like keynote)". One control for every layer that has Appear: the entrance, its speed
 * (relative to the entrance's own length, so Normal is what plays today) and its delay.
 */
class AppearSpeedDelayTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private Scene $scene;

    private SvgAsset $asset;

    protected function setUp(): void
    {
        parent::setUp();

        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id,
            'topic' => 'Tasman', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $this->asset = SvgAsset::create([
            'user_id' => $this->teacher->id, 'source' => 'commons', 'source_ref' => 'tasman-1',
            'source_url' => 'https://example.com/tasman.png', 'title' => 'Tasman', 'license' => 'CC0',
            'svg_path' => 'assets/tasman.png',
        ]);
        $this->scene = Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'image_path' => 'bay.png',
            'config' => ['lines' => [['text' => 'Tasman waits.', 'start' => 1.5, 'end' => 3] + SpeechBalloons::make('speech', null)]],
            'shots' => [['order' => 0, 'image_path' => 'bay.png', 'layers' => [
                ['path' => 'bay.png', 'kind' => 'cover', 'depth' => 1.0],
                ['asset_id' => $this->asset->id, 'path' => 'assets/tasman.png', 'kind' => 'figure', 'x' => 30.0, 'y' => 70.0,
                    'scale' => 1.0, 'height' => 40, 'anim' => 'fade', 'anim_duration' => 1200, 'anim_delay' => 0.5],
            ]]],
        ]);
    }

    private function wizard()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scene->id);
    }

    public function test_speed_is_relative_to_the_entrances_own_length(): void
    {
        // A balloon pops in 260 ms and fades in 600; a figure's entrance takes 600 ms.
        $this->assertSame(260, LayerEntrances::naturalMs('pop', 'balloon'));
        $this->assertSame(600, LayerEntrances::naturalMs('fade', 'balloon'));
        $this->assertSame(600, LayerEntrances::naturalMs('pop', 'art'));

        $this->assertSame('normal', LayerEntrances::speedOf(null, 600));
        $this->assertSame('normal', LayerEntrances::speedOf(600, 600));
        $this->assertSame('fast', LayerEntrances::speedOf(300, 600));
        $this->assertSame('slow', LayerEntrances::speedOf(520, 260));
        $this->assertNull(LayerEntrances::speedOf(450, 600), 'a duration typed by hand is no preset');

        $this->assertSame(130, LayerEntrances::durationFor('fast', 260));
        $this->assertSame(1200, LayerEntrances::durationFor('slow', 600));
        $this->assertNull(LayerEntrances::durationFor('normal', 600), 'normal is the entrance as it plays today');
    }

    public function test_a_balloon_keeps_its_speed_and_an_old_one_plays_as_before(): void
    {
        $line = SpeechBalloons::make('speech', null);
        $this->assertArrayNotHasKey('anim_duration', $line);

        $this->assertSame(520, SpeechBalloons::patch($line, ['anim_duration' => '520'])['anim_duration']);
        $this->assertSame(5000, SpeechBalloons::patch($line, ['anim_duration' => 99999])['anim_duration']);
        $this->assertSame(100, SpeechBalloons::patch($line, ['anim_duration' => 1])['anim_duration']);
        $this->assertArrayNotHasKey('anim_duration', SpeechBalloons::patch(['anim_duration' => 520] + $line, ['anim_duration' => null]));
    }

    public function test_the_balloon_inspector_offers_speed_and_delay_and_the_delay_is_its_start(): void
    {
        $wizard = $this->wizard()->call('selectInspectorTarget', 'bal_0');
        $html = $wizard->html();
        $this->assertMatchesRegularExpression('#data-segment="normal"[^>]*>\s*<input[^>]*checked#', $html);
        $this->assertMatchesRegularExpression('#<input[^>]*value="1.5"[^>]*data-appear-delay#', $html);

        $wizard->call('setBalloonSpeed', 'bal_0', 'slow');
        $this->assertSame(520, $this->scene->fresh()->config['lines'][0]['anim_duration']);   // pop: 260 × 2
        $this->assertMatchesRegularExpression('#data-segment="slow"[^>]*>\s*<input[^>]*checked#', $wizard->html());

        $wizard->call('updateBalloon', 'bal_0', 'start', '2.3');
        $this->assertEquals(2.3, $this->scene->fresh()->config['lines'][0]['start']);

        $wizard->call('setBalloonSpeed', 'bal_0', 'normal');
        $this->assertArrayNotHasKey('anim_duration', $this->scene->fresh()->config['lines'][0]);
    }

    public function test_a_figures_animate_tab_offers_the_same_control(): void
    {
        $wizard = $this->wizard()->call('selectInspectorTarget', 'art_'.$this->asset->id);
        $html = $wizard->html();
        $this->assertMatchesRegularExpression('#data-segment="slow"[^>]*>\s*<input[^>]*checked#', $html);
        $this->assertMatchesRegularExpression('#<input[^>]*value="0.5"[^>]*data-appear-delay#', $html);

        $wizard->call('setLayerSpeed', $this->asset->id, 'fast');
        $layer = collect($this->scene->fresh()->shots[0]['layers'])->firstWhere('asset_id', $this->asset->id);
        $this->assertSame(300, (int) $layer['anim_duration']);
    }

    public function test_the_timeline_moves_a_figures_entrance_in_one_save(): void
    {
        // The entrance bar dragged to 2 s and stretched to 0.9 s long.
        $this->wizard()->call('setLayerEntrance', $this->asset->id, 2.04, 900);
        $layer = collect($this->scene->fresh()->shots[0]['layers'])->firstWhere('asset_id', $this->asset->id);
        $this->assertEquals([2.0, 900], [round((float) $layer['anim_delay'], 1), (int) $layer['anim_duration']]);
    }

    /**
     * The player plays the entrance the teacher set. Its scene payload dropped every anim field,
     * so a figure's Appear, delay and speed only ever played in the editor's preview.
     */
    public function test_the_player_receives_a_figures_entrance_and_an_old_layer_none(): void
    {
        $this->lesson->update(['status' => LessonStatus::Published]);
        $shots = $this->scene->shots;
        $shots[0]['layers'][] = ['asset_id' => 99, 'path' => 'assets/old.png', 'kind' => 'figure', 'x' => 60.0, 'y' => 70.0];
        $this->scene->update(['shots' => $shots]);

        $html = $this->get(route('lesson.play', ['lessonCode' => $this->lesson->fresh()->lesson_code]))->assertOk()->getContent();

        $this->assertStringContainsString('"asset_id":'.$this->asset->id, $html);
        $this->assertMatchesRegularExpression('#"asset_id":'.$this->asset->id.'[^}]*"anim":"fade"[^}]*"anim_delay":0.5[^}]*"anim_duration":1200#', $html);
        // A layer saved before any of this: no entrance, so it is simply there, as it always was.
        $this->assertMatchesRegularExpression('#"asset_id":99[^}]*"anim":null[^}]*"anim_delay":null[^}]*"anim_duration":null#', $html);
    }
}
