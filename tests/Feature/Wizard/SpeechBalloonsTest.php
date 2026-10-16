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
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Bart, 2026-10-16: "where do I add these text bubbles? can we add them to the + ?" Add ▸ Speech
 * balloon puts a silent balloon in config.lines (the list the player draws), in the active panel
 * of a split scene; the stage and the inspector edit it, Backspace deletes it, Cmd-Z undoes.
 */
class SpeechBalloonsTest extends TestCase
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
            'user_id' => $this->teacher->id,
            'source' => 'commons', 'source_ref' => 'tasman-1',
            'source_url' => 'https://example.com/tasman.png',
            'title' => 'Tasman', 'license' => 'CC0', 'svg_path' => 'assets/tasman.png',
        ]);
        $this->scene = Scene::create([
            'lesson_id' => $this->lesson->id,
            'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'image_path' => 'bay.png',
            'config' => ['lines' => [['speaker' => 'narrator', 'text' => 'Tasman waits.', 'start' => 0, 'end' => 3]]],
            'shots' => [['order' => 0, 'image_path' => 'bay.png', 'layers' => [
                ['path' => 'bay.png', 'kind' => 'cover', 'depth' => 1.0],
                ['asset_id' => $this->asset->id, 'path' => 'assets/tasman.png', 'kind' => 'figure', 'x' => 30.0, 'y' => 70.0, 'scale' => 1.0, 'height' => 40],
            ]]],
        ]);
    }

    private function wizard()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scene->id);
    }

    /** @return list<array<string, mixed>> */
    private function lines(): array
    {
        return $this->scene->fresh()->config['lines'] ?? [];
    }

    public function test_add_puts_a_silent_balloon_after_the_existing_lines_and_opens_it_for_typing(): void
    {
        $this->wizard()
            ->call('addBalloon')
            ->assertSet('activeBalloonId', 'bal_1')
            ->assertDispatched('balloon:added', id: 'bal_1')
            ->assertSeeHtml('balloon-inspector-bal_1');

        $line = $this->lines()[1];
        $this->assertSame(SpeechBalloons::SPEAKER, $line['speaker']);
        $this->assertSame('speech', $line['kind']);
        $this->assertSame(0, $line['start']);
        $this->assertNull($line['end']);
        $this->assertNull($line['figure']);
        $this->assertArrayNotHasKey('panel', $line);
        // The narrator's line is untouched.
        $this->assertSame('Tasman waits.', $this->lines()[0]['text']);
    }

    public function test_the_stage_and_the_inspector_edit_text_place_tail_and_type(): void
    {
        $wizard = $this->wizard()->call('addBalloon');

        $wizard->dispatch('balloon:change', id: 'bal_1', patch: ['text' => '  Moet ik  daarboven klimmen? ', 'at' => [0.3, 2]])
            ->dispatch('balloon:change', id: 'bal_1', patch: ['tail' => ['tip' => [0.4, 0.8], 'bend' => 9]])
            ->call('updateBalloon', 'bal_1', 'kind', 'thought');

        $line = $this->lines()[1];
        $this->assertSame('Moet ik daarboven klimmen?', $line['text']);
        $this->assertEquals([0.3, 1.0], $line['at']);   // JSON stores 1.0 as 1
        $this->assertSame(['tip' => [0.4, 0.8], 'bend' => SpeechBalloons::MAX_BEND], $line['tail']);
        $this->assertSame('thought', $line['kind']);

        // Empty words keep the old ones; a narrator line is never edited as a balloon.
        $wizard->dispatch('balloon:change', id: 'bal_1', patch: ['text' => '   '])
            ->dispatch('balloon:change', id: 'bal_0', patch: ['text' => 'Hacked']);
        $this->assertSame('Moet ik daarboven klimmen?', $this->lines()[1]['text']);
        $this->assertSame('Tasman waits.', $this->lines()[0]['text']);
    }

    public function test_a_speaker_is_a_figure_on_the_panel_and_takes_the_tail_back(): void
    {
        $wizard = $this->wizard()->call('addBalloon')
            ->dispatch('balloon:change', id: 'bal_1', patch: ['tail' => ['tip' => [0.4, 0.8]]])
            ->call('updateBalloon', 'bal_1', 'speaker', (string) $this->asset->id);

        $line = $this->lines()[1];
        $this->assertSame($this->asset->id, $line['figure']['asset_id']);
        $this->assertSame(SpeechBalloons::DEFAULT_MOUTH, $line['figure']['mouth']);
        $this->assertArrayNotHasKey('tail', $line);

        $wizard->call('updateBalloon', 'bal_1', 'speaker', '999999');   // not a figure here
        $this->assertSame($this->asset->id, $this->lines()[1]['figure']['asset_id']);

        $wizard->call('updateBalloon', 'bal_1', 'speaker', '');
        $this->assertNull($this->lines()[1]['figure']);
    }

    public function test_on_a_split_scene_the_balloon_goes_in_the_active_panel(): void
    {
        $this->wizard()
            ->call('setSplitLayout', 'rows2')
            ->dispatch('split:panel', panel: 1)
            ->call('addBalloon');

        $this->assertSame(1, $this->lines()[1]['panel']);
    }

    public function test_delete_routes_through_the_object_router_and_undo_brings_it_back(): void
    {
        $wizard = $this->wizard()->call('addBalloon');
        $this->travel(2)->seconds();   // past the history's merge window: the delete is its own step

        $wizard->dispatch('scene:delete-object', objectId: 'bal_1')
            ->assertSet('activeBalloonId', null);
        $this->assertCount(1, $this->lines());

        $wizard->call('undoLastEdit');
        $this->assertCount(2, $this->lines());
        $this->assertSame(SpeechBalloons::SPEAKER, $this->lines()[1]['speaker']);

        $wizard->call('undoLastEdit');   // and the add itself
        $this->assertCount(1, $this->lines());
    }

    public function test_scale_opacity_entrance_and_span_are_stored_and_clamped(): void
    {
        $this->wizard()->call('addBalloon')
            ->call('updateBalloon', 'bal_1', 'scale', '9')
            ->call('updateBalloon', 'bal_1', 'opacity', '0.4')
            ->call('updateBalloon', 'bal_1', 'anim', 'fade')
            ->dispatch('balloon:change', id: 'bal_1', patch: ['start' => 2.5, 'end' => 6])
            ->call('updateBalloon', 'bal_1', 'anim', 'explode');   // not an entrance: ignored

        $line = $this->lines()[1];
        $this->assertEquals(SpeechBalloons::MAX_SCALE, $line['scale']);
        $this->assertEquals(0.4, $line['opacity']);
        $this->assertSame('fade', $line['anim']);
        $this->assertEquals(2.5, $line['start']);
        $this->assertEquals(6, $line['end']);

        // An end before the start, or none at all, is up to the scene's end.
        $wizard = $this->wizard()->dispatch('balloon:change', id: 'bal_1', patch: ['end' => 1]);
        $this->assertNull($this->lines()[1]['end']);
        $wizard->dispatch('balloon:change', id: 'bal_1', patch: ['end' => 5])
            ->dispatch('balloon:change', id: 'bal_1', patch: ['end' => null]);
        $this->assertNull($this->lines()[1]['end']);
    }

    public function test_the_tail_root_is_pinned_merged_with_the_tip_and_set_back_to_auto(): void
    {
        $wizard = $this->wizard()->call('addBalloon')
            ->dispatch('balloon:change', id: 'bal_1', patch: ['tail' => ['tip' => [0.4, 0.8], 'bend' => 0.2]])
            ->dispatch('balloon:change', id: 'bal_1', patch: ['tail' => ['root' => 1.25]]);

        // The root joins the tail without taking its tip or bend, wrapped onto the outline (0..1).
        $this->assertEquals(['tip' => [0.4, 0.8], 'bend' => 0.2, 'root' => 0.25], $this->lines()[1]['tail']);

        $wizard->dispatch('balloon:change', id: 'bal_1', patch: ['tail' => ['root' => null]]);
        $this->assertEquals(['tip' => [0.4, 0.8], 'bend' => 0.2], $this->lines()[1]['tail']);
    }

    public function test_the_timeline_keys_a_balloon_and_its_tracks_follow_a_delete(): void
    {
        // Two balloons: bal_1 and bal_2. Each gets a scale track; bal_2 a tail root track too.
        $wizard = $this->wizard()->call('addBalloon')->call('addBalloon');
        $keys = [['time' => 0, 'value' => 1], ['time' => 2, 'value' => 1.5]];
        $wizard->call('setTimeline', ['duration' => 10, 'tracks' => [
            ['target' => 'bal:1', 'property' => 'scale', 'keyframes' => $keys],
            ['target' => 'bal:2', 'property' => 'scale', 'keyframes' => $keys],
            ['target' => 'bal:2', 'property' => 'root', 'keyframes' => $keys],
            ['target' => 'bal:2', 'property' => 'text', 'keyframes' => $keys],   // not a balloon property
        ]]);
        $tracks = $this->scene->fresh()->config['timeline']['tracks'];
        $this->assertSame(['bal:1|scale', 'bal:2|scale', 'bal:2|root'], array_map(fn ($t) => $t['target'].'|'.$t['property'], $tracks));

        $this->travel(2)->seconds();
        $wizard->dispatch('scene:delete-object', objectId: 'bal_1')
            ->assertDispatched('timeline-restored');

        // bal_1's tracks went with it; bal_2 is bal_1 now, and so are its tracks.
        $tracks = $this->scene->fresh()->config['timeline']['tracks'];
        $this->assertSame(['bal:1|scale', 'bal:1|root'], array_map(fn ($t) => $t['target'].'|'.$t['property'], $tracks));

        $wizard->call('undoLastEdit');
        $this->assertCount(3, $this->scene->fresh()->config['timeline']['tracks']);
        $this->assertCount(3, $this->lines());
    }

    public function test_a_quiz_scene_takes_no_balloon(): void
    {
        $this->scene->update(['kind' => 'game', 'game_type' => 'quiz']);

        $this->wizard()->call('addBalloon');

        $this->assertCount(1, $this->lines());
    }
}
