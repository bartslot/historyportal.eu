<?php

declare(strict_types=1);

namespace Tests\Feature\Editor;

use App\Enums\LessonStatus;
use App\Jobs\GenerateChoicesAudio;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\LessonCopier;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Livewire\Livewire;
use Tests\TestCase;

/** The story map: the lesson's scenes and choices as cards with lines, a second view of the Choices layer (Bart, 2026-11-24). */
class StoryMapTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    /** @var list<Scene> */
    private array $scenes = [];

    protected function setUp(): void
    {
        parent::setUp();
        Bus::fake([GenerateChoicesAudio::class]);
        $this->teacher = User::factory()->create();
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'Marco Polo', 'subject' => 'history', 'grade_level' => '9th',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        foreach (['Venice', 'Destination', 'Cargo', 'Embark'] as $i => $name) {
            $this->scenes[] = Scene::create([
                'lesson_id' => $this->lesson->id, 'order' => $i + 1, 'kind' => 'narration', 'chapter_name' => $name,
                'script_segment' => $name.'.', 'status' => 'ready', 'config' => ['show_caption' => true],
            ]);
        }
    }

    private function editor()
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $this->scenes[0]->id);
    }

    public function test_the_map_lists_every_scene_in_order_with_its_links(): void
    {
        [$venice, $destination, $cargo] = $this->scenes;
        $venice->update(['config' => ['links' => [['label' => 'Sail', 'to' => $cargo->id], ['label' => 'Stay', 'to' => 999999]]]]);

        $map = $this->editor()->instance()->storyMap();

        $this->assertSame([1, 2, 3, 4], array_column($map['scenes'], 'number'));
        $this->assertSame('Venice', $map['scenes'][0]['name']);
        // A link to a scene outside the lesson is never shown as one.
        $this->assertSame([['label' => 'Sail', 'to' => $cargo->id], ['label' => 'Stay', 'to' => null]], $map['scenes'][0]['links']);
        $this->assertTrue($map['scenes'][0]['canChoose']);
        $this->assertSame(['scenes' => [], 'choices' => []], $map['layout']);
    }

    public function test_moving_cards_saves_the_layout_quietly(): void
    {
        [$venice, $destination] = $this->scenes;
        $version = (int) $this->lesson->fresh()->content_version;

        $this->editor()->call('saveStoryMapLayout', [
            'scenes' => [(string) $venice->id => [10.4, -20], (string) $destination->id => [300, 0], '999999' => [1, 1]],
            'choices' => [(string) $venice->id => ['x', 2], (string) $destination->id => [5e9, 0]],
        ]);

        $map = $this->lesson->fresh()->story_map;
        $this->assertSame([(string) $venice->id => [10, -20], (string) $destination->id => [300, 0]], $map['scenes']);
        $this->assertSame([], $map['choices']);
        // Layout is not content: the lesson's version stays where it was.
        $this->assertSame($version, (int) $this->lesson->fresh()->content_version);

        // A second save of one card keeps the others.
        $this->editor()->call('saveStoryMapLayout', ['scenes' => [(string) $destination->id => [400, 40]]]);
        $this->assertSame([10, -20], $this->lesson->fresh()->story_map['scenes'][(string) $venice->id]);
        $this->assertSame([400, 40], $this->lesson->fresh()->story_map['scenes'][(string) $destination->id]);
    }

    public function test_a_scene_without_choices_goes_on_to_a_scene_ends_or_follows_the_list(): void
    {
        [$venice, , $cargo] = $this->scenes;
        $editor = $this->editor();

        $editor->call('setSceneNext', $venice->id, $cargo->id);
        $this->assertSame([['label' => '', 'to' => $cargo->id]], $venice->fresh()->config['links']);

        $editor->call('setSceneNext', $venice->id, 'end');
        $this->assertTrue($venice->fresh()->config['ending']);
        $this->assertArrayNotHasKey('links', $venice->fresh()->config);

        $editor->call('setSceneNext', $venice->id, 'next');
        $this->assertArrayNotHasKey('ending', $venice->fresh()->config);
        $this->assertArrayNotHasKey('links', $venice->fresh()->config);
        $this->assertTrue($venice->fresh()->config['show_caption']);
    }

    public function test_a_scene_never_goes_on_to_itself_and_its_choices_are_not_overwritten(): void
    {
        [$venice, $destination, $cargo] = $this->scenes;
        $editor = $this->editor();

        $editor->call('setSceneNext', $venice->id, $venice->id);
        $this->assertArrayNotHasKey('links', $venice->fresh()->config);

        $links = [['label' => 'Sail', 'to' => $destination->id], ['label' => 'Stay', 'to' => $cargo->id]];
        $venice->update(['config' => ['links' => $links]]);
        $editor->call('setSceneNext', $venice->id, 'end');
        $this->assertSame($links, $venice->fresh()->config['links']);
    }

    public function test_removing_the_choices_sends_the_scene_on_to_the_next_one(): void
    {
        [$venice, $destination, $cargo] = $this->scenes;
        $venice->update(['config' => ['links' => [['label' => 'Sail', 'to' => $destination->id], ['label' => 'Stay', 'to' => $cargo->id]], 'links_prompt' => 'Well?']]);

        $this->editor()->call('removeSceneChoices', $venice->id);

        $this->assertArrayNotHasKey('links', $venice->fresh()->config);
        $this->assertArrayNotHasKey('links_prompt', $venice->fresh()->config);
    }

    public function test_only_scenes_of_this_lesson_can_be_changed(): void
    {
        $other = Lesson::create([
            'teacher_id' => User::factory()->create()->id, 'topic' => 'Other', 'subject' => 'history', 'grade_level' => '9th',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $foreign = Scene::create(['lesson_id' => $other->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready']);

        try {
            $this->editor()->call('setSceneNext', $foreign->id, 'end');
        } catch (ModelNotFoundException) {
            // A scene of another lesson is not found from this editor.
        }
        $this->assertNull($foreign->fresh()->config);
    }

    public function test_a_copied_lesson_keeps_its_map_on_its_own_scenes(): void
    {
        [$venice] = $this->scenes;
        $this->lesson->forceFill(['story_map' => ['scenes' => [(string) $venice->id => [10, 20]], 'choices' => []]])->saveQuietly();

        $copy = app(LessonCopier::class)->copy($this->lesson->fresh(), $this->teacher);

        $copiedVenice = $copy->scenes()->where('chapter_name', 'Venice')->value('id');
        $this->assertSame(['scenes' => [(string) $copiedVenice => [10, 20]]], $copy->fresh()->story_map);
    }

    public function test_dragging_a_new_option_out_of_a_scene_adds_a_choice_at_its_end(): void
    {
        [$venice, $destination, $cargo, $embark] = $this->scenes;
        $editor = $this->editor();

        // A scene that just went on to the next one: the first option is a choice named after where it goes.
        $editor->call('addSceneChoiceTo', $venice->id, $cargo->id);
        $this->assertSame([['label' => 'Cargo', 'to' => $cargo->id]], $venice->fresh()->config['links']);

        // A second one, and the narrator gets a question to ask over them.
        $editor->call('addSceneChoiceTo', $venice->id, $embark->id);
        $config = $venice->fresh()->config;
        $this->assertSame([['label' => 'Cargo', 'to' => $cargo->id], ['label' => 'Embark', 'to' => $embark->id]], $config['links']);
        $this->assertNotSame('', (string) ($config['links_prompt'] ?? ''));
        Bus::assertDispatched(GenerateChoicesAudio::class);
    }

    public function test_a_straight_jump_or_an_ending_becomes_part_of_the_choices(): void
    {
        [$venice, $destination, $cargo, $embark] = $this->scenes;
        $destination->update(['config' => ['links' => [['label' => '', 'to' => $embark->id]]]]);
        $cargo->update(['config' => ['ending' => true]]);
        $editor = $this->editor();

        $editor->call('addSceneChoiceTo', $destination->id, $venice->id);
        $this->assertSame([['label' => 'Embark', 'to' => $embark->id], ['label' => 'Venice', 'to' => $venice->id]], $destination->fresh()->config['links']);

        $editor->call('addSceneChoiceTo', $cargo->id, $embark->id);
        $this->assertArrayNotHasKey('ending', $cargo->fresh()->config);
        $this->assertSame([['label' => 'Embark', 'to' => $embark->id]], $cargo->fresh()->config['links']);

        // Never onto itself.
        $editor->call('addSceneChoiceTo', $embark->id, $embark->id);
        $this->assertArrayNotHasKey('links', $embark->fresh()->config ?? []);
    }

    public function test_an_emptied_question_stays_empty_when_another_option_is_dragged_out(): void
    {
        [$venice, $destination, $cargo, $embark] = $this->scenes;
        $venice->update(['config' => ['links' => [['label' => 'A', 'to' => $destination->id], ['label' => 'B', 'to' => $cargo->id]], 'links_prompt' => '']]);
        $editor = $this->editor();

        $editor->call('addSceneChoiceTo', $venice->id, $embark->id);
        $this->assertSame('', (string) ($venice->fresh()->config['links_prompt'] ?? ''));

        // Undo puts the question back as it was too.
        $venice->update(['config' => array_merge($venice->fresh()->config, ['links_prompt' => 'Generated?'])]);
        $editor->call('restoreSceneLinks', $venice->id, [['label' => 'A', 'to' => $destination->id], ['label' => 'B', 'to' => $cargo->id]], false, '');
        $this->assertSame('', (string) ($venice->fresh()->config['links_prompt'] ?? ''));
        $this->assertCount(2, $venice->fresh()->config['links']);
    }

    public function test_undo_puts_a_scenes_links_back(): void
    {
        [$venice, , $cargo] = $this->scenes;
        $editor = $this->editor();
        $editor->call('addSceneChoiceTo', $venice->id, $cargo->id);

        $editor->call('restoreSceneLinks', $venice->id, [], true);
        $this->assertArrayNotHasKey('links', $venice->fresh()->config);
        $this->assertTrue($venice->fresh()->config['ending']);
    }

    public function test_the_editor_has_the_story_map(): void
    {
        $this->editor()
            ->assertSeeHtml('data-story-map-open')
            ->assertSeeHtml('x-data="storyMap()"');
    }
}
