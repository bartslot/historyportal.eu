<?php

declare(strict_types=1);

namespace Tests\Feature\Editor;

use App\Enums\LessonStatus;
use App\Jobs\GenerateChoicesAudio;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\TtsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Mockery;
use Tests\TestCase;

/** Choices that link a scene to any other scene, Twine-style (Bart 2026-11-21: "links to other scenes is not yet added"). */
class SceneLinksTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    /** @var list<Scene> */
    private array $scenes = [];

    protected function setUp(): void
    {
        parent::setUp();
        // The narrator reading choices out is a TTS call: these tests only see that it is asked for.
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

    private function editor(Scene $scene)
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])
            ->call('selectScene', $scene->id);
    }

    public function test_a_teacher_adds_two_choices_that_jump_to_other_scenes(): void
    {
        [$venice, $destination, $cargo] = $this->scenes;

        $this->editor($venice)
            ->assertDontSeeHtml('data-scene-links-inspector')   // no layer until one is added
            ->call('addSceneLink', $venice->id)
            ->call('saveSceneLink', $venice->id, 0, 'label', '  Ask <b>Niccolò</b>  where you are headed ')
            ->call('addSceneLink', $venice->id)
            ->call('saveSceneLink', $venice->id, 1, 'to', (string) $cargo->id)
            ->call('saveSceneLink', $venice->id, 1, 'label', 'Watch the sailors')
            ->assertSeeHtml('data-scene-links-inspector')
            ->assertSee('Ask Niccolò where you are headed');

        $config = $venice->fresh()->config;
        $this->assertSame([
            ['label' => 'Ask Niccolò where you are headed', 'to' => $destination->id],   // a new choice starts at the next scene
            ['label' => 'Watch the sailors', 'to' => $cargo->id],
        ], $config['links']);
        $this->assertTrue($config['show_caption']);   // the rest of the scene is left alone
    }

    public function test_editing_the_scene_afterwards_keeps_its_choices(): void
    {
        [$venice] = $this->scenes;
        $editor = $this->editor($venice)->call('addSceneLink', $venice->id);
        $editor->set('selectedScene.script_segment', 'New words.')->call('saveSelected');

        $this->assertCount(1, $venice->fresh()->config['links']);
        $this->assertSame('New words.', $venice->fresh()->script_segment);
    }

    public function test_a_choice_cannot_point_outside_the_lesson_and_can_be_removed(): void
    {
        [$venice] = $this->scenes;
        $other = Scene::create(['lesson_id' => Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'Other', 'subject' => 'history', 'grade_level' => '9th', 'image_style' => 'cinematic',
        ])->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready']);

        $editor = $this->editor($venice)
            ->call('addSceneLink', $venice->id)
            ->call('saveSceneLink', $venice->id, 0, 'to', (string) $other->id);
        $this->assertNull($venice->fresh()->config['links'][0]['to']);

        $editor->call('removeSceneLink', $venice->id, 0);
        $this->assertArrayNotHasKey('links', $venice->fresh()->config);
    }

    public function test_an_ending_has_no_choices(): void
    {
        [, , $cargo] = $this->scenes;
        $this->editor($cargo)
            ->call('addSceneLink', $cargo->id)
            ->call('setSceneEnding', $cargo->id, true)
            ->assertDontSee('Add choice');

        $config = $cargo->fresh()->config;
        $this->assertTrue($config['ending']);
        $this->assertArrayNotHasKey('links', $config);
    }

    public function test_add_choices_puts_the_layer_on_the_current_scene_instead_of_adding_scenes(): void
    {
        [$venice, $destination, $cargo] = $this->scenes;

        // Add > Choices, and the old Decision point entry, both land here (Bart 2026-11-21: "it should become a layer")
        $this->editor($venice)->call('addScene', 'branch')->assertSeeHtml('data-scene-links-inspector');

        $this->assertSame(4, $this->lesson->scenes()->count());
        $this->assertSame(0, $this->lesson->scenes()->whereNotNull('branch_role')->count());
        $this->assertSame([['label' => '', 'to' => $destination->id], ['label' => '', 'to' => $cargo->id]], $venice->fresh()->config['links']);
    }

    public function test_the_scene_picker_no_longer_offers_a_decision_point_and_add_offers_choices(): void
    {
        $this->editor($this->scenes[0])
            ->assertDontSeeHtml("addScene('branch')")
            ->assertSeeHtml('data-add-choices');
    }

    public function test_a_copied_lesson_links_to_its_own_scenes(): void
    {
        [$venice, , $cargo] = $this->scenes;
        $venice->update(['config' => ['links' => [['label' => 'Watch the sailors', 'to' => $cargo->id]]]]);

        $copy = app(\App\Services\LessonCopier::class)->copy($this->lesson->fresh(), $this->teacher);
        $scenes = $copy->scenes()->orderBy('order')->get();

        $this->assertSame([['to' => $scenes[2]->id, 'label' => 'Watch the sailors']], $scenes[0]->config['links']);
    }

    public function test_the_player_gets_the_links(): void
    {
        [$venice, , $cargo] = $this->scenes;
        $venice->update(['config' => ['links' => [['label' => 'Watch the sailors', 'to' => $cargo->id]]]]);

        $html = $this->actingAs($this->teacher)->get(route('lesson.play', ['lessonCode' => $this->lesson->fresh()->lesson_code]))->assertOk()->getContent();
        preg_match('/window\.LESSON = (\{.*?\});\n/s', $html, $m);
        $first = json_decode($m[1], true)['scenes'][0];

        $this->assertSame([['label' => 'Watch the sailors', 'to' => $cargo->id]], $first['config']['links']);
    }

    public function test_new_choices_get_a_narrator_line_that_takes_turns(): void
    {
        [$venice, $destination, $cargo] = $this->scenes;
        $this->lesson->update(['import_report' => ['cast' => [['name' => 'Marco Polo', 'description' => 'Curious']]]]);

        $this->editor($venice)->call('addChoicesToScene', $venice->id)
            ->assertSeeHtml('data-choices-prompt')
            ->assertSee('So now Marco is doubtful... but what would you choose?');
        $this->editor($cargo)->call('addChoicesToScene', $cargo->id);

        $this->assertSame('So now Marco is doubtful... but what would you choose?', $venice->fresh()->config['links_prompt']);
        $this->assertSame('What should Marco do now? Think it over, then choose.', $cargo->fresh()->config['links_prompt']);
    }

    public function test_without_a_main_character_the_line_names_nobody(): void
    {
        [$venice] = $this->scenes;
        $this->editor($venice)->call('addChoicesToScene', $venice->id);

        $this->assertSame('So now the choice is yours... what would you choose?', $venice->fresh()->config['links_prompt']);
    }

    public function test_changing_the_words_records_them_again_and_is_paid_from_the_allowance(): void
    {
        [$venice] = $this->scenes;
        $this->editor($venice)
            ->call('addChoicesToScene', $venice->id)
            ->call('saveSceneLink', $venice->id, 0, 'label', 'Ask Niccolò')
            ->call('saveChoicesPrompt', $venice->id, 'Where to, <i>Marco</i>?');

        $this->assertSame('Where to, Marco?', $venice->fresh()->config['links_prompt']);
        Bus::assertDispatched(GenerateChoicesAudio::class, fn (GenerateChoicesAudio $job) => $job->sceneId === $venice->id);
        $this->assertGreaterThan(0, \App\Support\NarrationBudget::spentOn($this->lesson->fresh()));
    }

    public function test_the_narrator_records_the_choices_and_the_player_plays_them(): void
    {
        Storage::fake('public');
        [$venice, $destination, $cargo] = $this->scenes;
        $venice->update(['config' => [
            'links_prompt' => 'So now Marco is doubtful... but what would you choose?',
            'links' => [['label' => 'Ask Niccolò where you are headed', 'to' => $destination->id], ['label' => 'Watch the sailors.', 'to' => $cargo->id]],
        ]]);
        $said = null;
        $tts = Mockery::mock(TtsService::class)->makePartial();
        $tts->shouldReceive('generateAudioRaw')->once()->andReturnUsing(function (string $text) use (&$said): string {
            $said = $text;

            return 'mp3-bytes';
        });
        $tts->shouldReceive('lastExtension')->andReturn('mp3');
        $this->app->instance(TtsService::class, $tts);

        (new GenerateChoicesAudio($venice->id))->handle($tts);
        (new GenerateChoicesAudio($venice->id))->handle($tts);   // the same words in the same voice: not bought twice

        $this->assertSame('So now Marco is doubtful... but what would you choose? Ask Niccolò where you are headed? Or Watch the sailors?', $said);
        $audio = $venice->fresh()->config['links_audio'];
        Storage::disk('public')->assertExists($audio['path']);

        // Editing anything else in the scene keeps the recording.
        $this->editor($venice->fresh())->set('selectedScene.script_segment', 'New words.')->call('saveSelected');
        $this->assertSame($audio, $venice->fresh()->config['links_audio']);

        $this->lesson->update(['status' => LessonStatus::Previewable]);
        $html = $this->actingAs($this->teacher)->get(route('lesson.play', ['lessonCode' => $this->lesson->fresh()->lesson_code]))->assertOk()->getContent();
        preg_match('/window\.LESSON = (\{.*?\});\n/s', $html, $m);
        $this->assertStringContainsString('choices.mp3', (string) json_decode($m[1], true)['scenes'][0]['choices_audio_url']);

        // New words: the old recording is not played over them.
        $this->editor($venice->fresh())->call('saveSceneLink', $venice->id, 1, 'label', 'Help the sailors');
        $this->assertNull(\App\Services\Lessons\ChoicePrompt::audioUrl($venice->fresh()));
    }

    public function test_an_old_decision_point_becomes_the_choices_layer(): void
    {
        [$venice, $question, $first, $second] = $this->scenes;
        $question->update(['branch_group' => 1, 'branch_role' => 'question']);
        $first->update(['branch_group' => 1, 'branch_role' => 'option_a', 'branch_choice_label' => 'Eerste keuze']);
        $second->update(['branch_group' => 1, 'branch_role' => 'option_b', 'branch_choice_label' => '']);
        $after = Scene::create(['lesson_id' => $this->lesson->id, 'order' => 5, 'kind' => 'narration', 'chapter_name' => 'Hormuz', 'script_segment' => 'On.', 'status' => 'ready']);

        $this->editor($first)
            ->assertSeeHtml('data-convert-decision')
            ->call('convertDecisionToChoices', $first->id)
            ->assertSeeHtml('data-scene-links-inspector');

        $this->assertSame([['label' => 'Eerste keuze', 'to' => $first->id], ['label' => 'Embark', 'to' => $second->id]], $question->fresh()->config['links']);
        $this->assertSame([['label' => '', 'to' => $after->id]], $first->fresh()->config['links']);   // past the other option
        $this->assertArrayNotHasKey('links', $second->fresh()->config ?? []);                           // runs on into Hormuz
        $this->assertSame(0, $this->lesson->scenes()->whereNotNull('branch_group')->count());
        $this->assertSame(5, $this->lesson->scenes()->count());                                         // nothing deleted
    }

    public function test_an_option_of_several_scenes_plays_as_one_run(): void
    {
        [$venice, $a1, $a2, $b1] = $this->scenes;
        $venice->update(['branch_group' => 2, 'branch_role' => 'question']);
        $a1->update(['branch_group' => 2, 'branch_role' => 'option_a', 'branch_choice_label' => 'Sail']);
        $a2->update(['branch_group' => 2, 'branch_role' => 'option_a']);
        $b1->update(['branch_group' => 2, 'branch_role' => 'option_b', 'branch_choice_label' => 'Stay']);
        $after = Scene::create(['lesson_id' => $this->lesson->id, 'order' => 5, 'kind' => 'narration', 'chapter_name' => 'Hormuz', 'script_segment' => 'On.', 'status' => 'ready']);

        $this->editor($venice)->call('convertDecisionToChoices', $venice->id);

        $this->assertSame([['label' => 'Sail', 'to' => $a1->id], ['label' => 'Stay', 'to' => $b1->id]], $venice->fresh()->config['links']);
        $this->assertArrayNotHasKey('links', $a1->fresh()->config ?? []);                 // on into its own next scene
        $this->assertSame([['label' => '', 'to' => $after->id]], $a2->fresh()->config['links']);   // the run's end skips Stay
        $this->assertArrayNotHasKey('links', $b1->fresh()->config ?? []);
    }
}
