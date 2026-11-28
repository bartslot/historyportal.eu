<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\Support\BackingPanel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Bart, 2026-11-28: a backing panel (the box behind a scene's text) sits full screen, as a half
 * or along the top or bottom, and is filled with a colour, a zoomed crop of one of the scene's
 * pictures, or the scene's own colours, with a watercolour edge; presets set it in one click.
 */
class BackingPanelTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private Scene $scene;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id,
            'topic' => 'X', 'subject' => 'history', 'grade_level' => '9th',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $this->scene = Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'image_path' => 'lessons/1/scenes/1/court.webp',
            'shots' => [['layers' => [['url' => '/storage/library/kublai.webp', 'kind' => 'clipart']]]],
            'config' => ['texts' => [
                ['id' => 'rect_a', 'kind' => 'rect', 'side' => 'left', 'color' => '#0f172a', 'opacity' => 0.5],
            ]],
        ]);
    }

    private function wizard()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scene->id);
    }

    private function panel(): array
    {
        return collect($this->scene->fresh()->config['texts'])->firstWhere('id', 'rect_a');
    }

    public function test_an_older_panel_reads_as_it_did(): void
    {
        $clean = BackingPanel::clean(['side' => 'right', 'color' => '#ABCDEF', 'opacity' => 0.4], 'rect_x');

        $this->assertSame(['id' => 'rect_x', 'kind' => 'rect', 'side' => 'right', 'color' => '#abcdef', 'opacity' => 0.4, 'z' => null], $clean);
    }

    public function test_the_panel_sits_full_screen_or_along_any_edge_at_a_size(): void
    {
        $wizard = $this->wizard()
            ->call('updateSceneText', 'rect_a', 'side', 'top')
            ->call('updateSceneText', 'rect_a', 'size', 35);
        $this->assertSame('top', $this->panel()['side']);
        $this->assertEquals(35.0, $this->panel()['size']);

        $wizard->call('updateSceneText', 'rect_a', 'side', 'full')
            ->call('updateSceneText', 'rect_a', 'size', 99);
        $this->assertSame('full', $this->panel()['side']);
        $this->assertEquals(80.0, $this->panel()['size']);

        $wizard->call('updateSceneText', 'rect_a', 'side', 'sideways');
        $this->assertSame('left', $this->panel()['side']);
    }

    public function test_a_preset_sets_several_fields_in_one_save(): void
    {
        $this->wizard()->call('patchBackingPanel', 'rect_a', [
            'color' => '#F6F1E7', 'opacity' => 1, 'blur' => 0, 'wash' => 'blot-005', 'font' => 'cinzel',
        ]);

        $p = $this->panel();
        $this->assertSame('#f6f1e7', $p['color']);
        $this->assertEquals(1.0, $p['opacity']);
        $this->assertEquals(0.0, $p['blur']);
        $this->assertSame('blot-005', $p['wash']);
        $this->assertArrayNotHasKey('font', $p);
    }

    public function test_the_watercolour_edge_is_one_of_the_paper_masks_and_comes_off_again(): void
    {
        $wizard = $this->wizard()->call('updateSceneText', 'rect_a', 'wash', 'spray-paint');
        $this->assertArrayNotHasKey('wash', $this->panel());

        $wizard->call('updateSceneText', 'rect_a', 'wash', 'book');
        $this->assertSame('book', $this->panel()['wash']);

        $wizard->call('updateSceneText', 'rect_a', 'wash', null);
        $this->assertArrayNotHasKey('wash', $this->panel());
    }

    public function test_the_picture_is_one_of_the_scenes_own_and_keeps_its_crop(): void
    {
        $wizard = $this->wizard();
        $images = $wizard->get('backingPanelImages');
        $this->assertContains('/storage/library/kublai.webp', $images);
        $this->assertStringEndsWith('lessons/1/scenes/1/court.webp', $images[0]);

        $wizard->call('updateSceneText', 'rect_a', 'image', 'https://evil.example/x.png');
        $this->assertArrayNotHasKey('image', $this->panel());

        $wizard->call('patchBackingPanel', 'rect_a', ['image' => '/storage/library/kublai.webp'])
            ->call('updateSceneText', 'rect_a', 'focus', ['x' => 30, 'y' => 120, 'zoom' => 2.5]);
        $p = $this->panel();
        $this->assertSame('/storage/library/kublai.webp', $p['image']);
        $this->assertEquals(['x' => 30.0, 'y' => 100.0, 'zoom' => 2.5], $p['focus']);

        // A canvas save (a drag, a restack) keeps all of it.
        $wizard->dispatch('sceneTextsChanged', sceneId: $this->scene->id, texts: [$p]);
        $this->assertSame('/storage/library/kublai.webp', $this->panel()['image']);
        $this->assertEquals(2.5, $this->panel()['focus']['zoom']);

        $wizard->call('updateSceneText', 'rect_a', 'image', null);
        $this->assertArrayNotHasKey('image', $this->panel());
        $this->assertArrayNotHasKey('focus', $this->panel());
    }

    public function test_a_picture_url_that_could_break_out_of_css_is_refused(): void
    {
        $this->assertNull(BackingPanel::imageUrl('/storage/a.webp) , url(javascript:x'));
        $this->assertNull(BackingPanel::imageUrl('//evil.example/a.webp'));
        $this->assertNull(BackingPanel::imageUrl('javascript:alert(1)'));
        $this->assertSame('/storage/a.webp', BackingPanel::imageUrl('/storage/a.webp'));
    }

    public function test_the_inspector_offers_layout_presets_and_the_scenes_pictures(): void
    {
        $this->wizard()->set('activeTextId', 'rect_a')
            ->assertSeeHtml('data-panel-inspector')
            ->assertSeeHtml('data-panel-side="full"')
            ->assertSeeHtml('data-panel-side="bottom"')
            ->assertSeeHtml('data-panel-preset')
            ->assertSeeHtml('data-panel-image="/storage/library/kublai.webp"')
            ->assertSeeHtml('data-panel-wash="blot-004"')
            // The readouts keep their whole numbers: size 50 %, frosted glass 10 px.
            ->assertSeeHtml('>50<')
            ->assertSeeHtml('>10<');
    }
}
