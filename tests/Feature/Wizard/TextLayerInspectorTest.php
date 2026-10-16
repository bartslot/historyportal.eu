<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Bart, 2026-10-16 (Figma 1674:4695): a text layer gets the same inspector as a picture layer:
 * Typography, Appearance (colour, position, size, scale, rotate, blur) and Layer (blend,
 * opacity, grayscale, pin to map). Every control writes the real text item, clamped, undoable.
 */
class TextLayerInspectorTest extends TestCase
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
            'config' => ['texts' => [
                ['id' => 'txt_a', 'text' => 'Batavia, 1642', 'x' => 40, 'y' => 40, 'font' => 'sans', 'size' => 'md'],
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

    private function text(string $id = 'txt_a'): array
    {
        return collect($this->scene->fresh()->config['texts'])->firstWhere('id', $id);
    }

    public function test_every_appearance_and_layer_control_writes_the_text_clamped(): void
    {
        $this->wizard()
            ->call('updateSceneText', 'txt_a', 'color', '#FFAA00')
            ->call('updateSceneText', 'txt_a', 'colorOpacity', 0.4)
            ->call('updateSceneText', 'txt_a', 'scale', 9)
            ->call('updateSceneText', 'txt_a', 'rotation', -400)
            ->call('updateSceneText', 'txt_a', 'blur', 1.5)
            ->call('updateSceneText', 'txt_a', 'blend', 'multiply')
            ->call('updateSceneText', 'txt_a', 'opacity', 1)
            ->call('updateSceneText', 'txt_a', 'grayscale', true);

        $t = $this->text();
        $this->assertSame('#ffaa00', $t['color']);
        $this->assertEquals(0.4, $t['colorOpacity']);
        $this->assertEquals(4.0, $t['scale']);
        $this->assertEquals(-180.0, $t['rotation']);
        $this->assertEquals(1.5, $t['blur']);
        $this->assertSame('multiply', $t['blend']);
        $this->assertEquals(1.0, $t['opacity']);
        $this->assertTrue($t['grayscale']);
    }

    public function test_garbage_leaves_the_value_as_it_was(): void
    {
        $this->wizard()
            ->call('updateSceneText', 'txt_a', 'blend', 'multiply')
            ->call('updateSceneText', 'txt_a', 'blend', 'explode')
            ->call('updateSceneText', 'txt_a', 'color', 'red');

        $this->assertSame('multiply', $this->text()['blend']);
        $this->assertArrayNotHasKey('color', $this->text());
    }

    public function test_a_backing_panel_keeps_its_own_opacity_range(): void
    {
        $this->wizard()->call('updateSceneText', 'rect_a', 'opacity', 1);

        $this->assertEquals(0.95, $this->text('rect_a')['opacity']);
    }

    // The canvas saves every text through sceneTextsChanged on each drag and edit. A field it did
    // not know about would be wiped the moment the teacher moved the text.
    public function test_a_canvas_save_keeps_the_style(): void
    {
        $wizard = $this->wizard()->call('updateSceneText', 'txt_a', 'rotation', 12)
            ->call('updateSceneText', 'txt_a', 'color', '#ffaa00');
        $moved = array_merge($this->text(), ['x' => 55]);

        $wizard->dispatch('sceneTextsChanged', sceneId: $this->scene->id, texts: [$moved, $this->text('rect_a')]);

        $t = $this->text();
        $this->assertSame(55.0, (float) $t['x']);
        $this->assertEquals(12.0, $t['rotation']);
        $this->assertSame('#ffaa00', $t['color']);
    }

    public function test_a_style_edit_is_undone(): void
    {
        $wizard = $this->wizard();
        $this->travel(2)->seconds();
        $wizard->call('updateSceneText', 'txt_a', 'blend', 'screen');
        $wizard->call('undoLastEdit');

        $this->assertArrayNotHasKey('blend', $this->text());
    }

    public function test_the_inspector_is_the_layer_shell(): void
    {
        $this->wizard()->set('activeTextId', 'txt_a')
            ->assertSeeHtml('data-text-inspector')
            ->assertSee('Batavia, 1642')
            ->assertSee(__('Text layer'))
            ->assertSee(__('Typography'))
            ->assertSee(__('Appearance'))
            ->assertSee(__('Font type'))
            ->assertSeeHtml('data-key-target="text:txt_a"')
            // How-to prose stays out of the editor; the pin explains itself in a tooltip.
            ->assertDontSee(__('Edit content directly on the canvas. Adjust its appearance here.'));
    }
}
