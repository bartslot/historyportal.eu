<?php

declare(strict_types=1);

namespace Tests\Feature\Stage25d;

use App\Enums\LessonStatus;
use App\Jobs\Concerns\MarksSceneReady;
use App\Jobs\GenerateLessonScript;
use App\Jobs\GenerateSceneAudio;
use App\Jobs\GenerateSceneImage;
use App\Jobs\GenerateSceneShots;
use App\Livewire\Teacher\LessonChat;
use App\Livewire\Wizard\Step1Settings;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\OpenAiLlmService;
use App\Services\Stage25d\StageSet;
use App\Support\LibraryEra;
use Illuminate\Bus\PendingBatch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/** A teacher makes a 3D (stage25d) lesson in the app: the + menu, the visual style, the chat and the pipeline. */
class TeacherStageLessonTest extends TestCase
{
    use RefreshDatabase;

    private const ERA = 'c. 3400-2850 BCE';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $asset = fn (string $id, string $layer, array $tags, array $more = []) => ['id' => $id, 'layer' => $layer, 'tags' => $tags, 'file' => "{$id}.webp", 'era' => self::ERA] + $more;
        $figure = fn (string $char, string $pose, string $facing) => ['id' => "fig-{$char}-{$pose}-{$facing}", 'layer' => 'figure', 'file' => 'f.webp', 'era' => 'figure-v1',
            'tags' => ['figure', "char:{$char}", "pose:{$pose}", "facing:{$facing}"]];
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            $asset('sky-summer-01', 'sky', ['sky', 'summer']),
            $asset('sky-autumn-01', 'sky', ['sky', 'autumn']),
            $asset('bg-farmland-01', 'bg', ['fields', 'farm']),
            $asset('meadow-band-01', 'mid', ['meadow', 'ground'], ['height_m' => 22.8, 'w' => 1536, 'h' => 599]),
            $asset('hunebed-long-01', 'mid', ['hunebed', 'dolmen', 'stones']),
            $asset('house-trb-01', 'mid', ['house', 'farmhouse']),
            $asset('cow-01', 'prop', ['cow', 'cattle']),
            $asset('tree-oak-01', 'fg', ['tree', 'oak'], ['height_m' => 18]),
            $figure('meisje', 'stand', 'right'), $figure('meisje', 'carry', 'right'),
            $figure('moeder', 'stand', 'left'), $figure('moeder', 'carry', 'left'),
            $figure('holwerda', 'stand', 'right'), $figure('holwerda', 'stand', 'left'),
        ]]));
    }

    private function lesson(array $extra = []): Lesson
    {
        return Lesson::create([
            'teacher_id' => User::factory()->create()->id,
            'topic' => 'Hunebedden', 'subject' => 'history', 'grade_level' => 'Age 10', 'language' => 'nl',
            'era' => 'Tijd van jagers en boeren', 'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
            ...$extra,
        ]);
    }

    public function test_an_era_has_the_stage_bundle_whose_assets_are_mostly_from_it(): void
    {
        $this->assertSame('nl-prehistory', LibraryEra::stageBundle('hunters-farmers'));
        $this->assertNull(LibraryEra::stageBundle('regents-rulers'));
        $this->assertNull(LibraryEra::stageBundle(null));
        $this->assertSame('hunters-farmers', LibraryEra::named('Tijd van jagers en boeren'));
        $this->assertSame('regents-rulers', LibraryEra::named('Tijd van regenten en vorsten (1600-1700)'));
        $this->assertSame('hunters-farmers', LibraryEra::named('hunters-farmers'));
        $this->assertNull(LibraryEra::named('Middle Ages (500–1500)'));
        $this->assertSame('nl-prehistory', LibraryEra::stageBundleFor($this->lesson()));
    }

    public function test_the_starter_set_is_the_backdrop_only_on_the_house_camera(): void
    {
        $stage = StageSet::starter('nl-prehistory', 's3');

        $this->assertSame(['id' => 's3', 'bundle' => 'nl-prehistory', 'set' => [
            'sky' => 'sky-summer-01',
            'layers' => [['asset' => 'bg-farmland-01', 'depth' => 'bg', 'x' => 0.5]],
            'groundBands' => [['asset' => 'meadow-band-01', 'z' => 30]],
        ]], $stage);
    }

    public function test_a_planned_scene_gets_the_pictures_its_words_name_each_at_its_distance(): void
    {
        $stage = StageSet::forScene('nl-prehistory', 's2', 'Farmers carry stones to the hunebed under an autumn sky; cows graze', 0);
        $layers = collect($stage['set']['layers'])->keyBy('asset');

        $this->assertSame('sky-autumn-01', $stage['set']['sky']);
        $this->assertSame(22.0, $layers['hunebed-long-01']['z']);
        $this->assertSame(3.5, $layers['cow-01']['z']);
        $this->assertArrayNotHasKey('z', $layers['bg-farmland-01']);
        $figures = $layers->filter(fn ($l) => isset($l['figure']));
        $this->assertSame(['fig-meisje-carry-right', 'fig-moeder-carry-left'], $figures->keys()->all(), 'two people, in the pose the words ask for, facing each other');
        $this->assertSame([7.0, 7.0], $figures->pluck('z')->all());
        $this->assertSame('sway', $layers['tree-oak-01']['motion']['kind']);
        $this->assertSame(22.0, $layers['tree-oak-01']['z'], 'a tall tree stands back, never in front of the people');
    }

    public function test_people_from_a_later_time_appear_only_when_named(): void
    {
        foreach (range(0, 4) as $seed) {
            $chars = collect(StageSet::forScene('nl-prehistory', 's', 'People in a village', $seed)['set']['layers'])->pluck('figure')->filter();
            $this->assertNotContains('holwerda', $chars->all());
        }
        $named = collect(StageSet::forScene('nl-prehistory', 's', 'holwerda digs at the hunebed', 0)['set']['layers'])->pluck('figure')->filter();
        $this->assertSame(['holwerda'], $named->values()->all());
    }

    public function test_the_plus_menu_adds_a_3d_scene_from_the_era_bundle(): void
    {
        $lesson = $this->lesson();
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'x', 'status' => 'ready']);

        Livewire::actingAs($lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->set('addSceneOpen', true)
            ->assertSeeHtml('data-add-stage25d')
            ->call('addScene', 'stage25d');

        $scene = $lesson->scenes()->where('kind', 'stage25d')->sole();
        $this->assertSame('ready', $scene->status);
        $this->assertSame('nl-prehistory', $scene->config['stage25d']['bundle']);
        $this->assertSame('meadow-band-01', $scene->config['stage25d']['set']['groundBands'][0]['asset']);
    }

    public function test_a_scene_switches_between_2d_and_3d_and_each_side_keeps_its_setup(): void
    {
        $lesson = $this->lesson();
        $scene = Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'Farmers carry stones to the hunebed',
            'status' => 'pending', 'image_path' => 'lessons/1/a.webp', 'scene_view' => 'slideshow']);

        $c = Livewire::actingAs($lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $scene->id)
            ->assertSeeHtml('data-scene-mode')
            ->call('setSceneMode', '3d');

        $scene->refresh();
        $this->assertSame('stage25d', $scene->kind);
        $this->assertSame('ready', $scene->status);
        $this->assertContains('hunebed-long-01', array_column($scene->config['stage25d']['set']['layers'], 'asset'), 'built from the words');
        $stage = $scene->config['stage25d'];

        $c->call('setSceneMode', '2d');
        $scene->refresh();
        $this->assertSame('narration', $scene->kind);
        $this->assertSame('slideshow', $scene->scene_view);
        $this->assertSame('lessons/1/a.webp', $scene->image_path, 'the 2D picture is still there');

        $c->call('setSceneMode', '3d');
        $this->assertSame($stage, $scene->fresh()->config['stage25d'], 'back to the same 3D set');
    }

    public function test_no_switch_to_3d_without_a_bundle_and_only_story_scenes_switch(): void
    {
        $lesson = $this->lesson(['era' => 'Tijd van regenten en vorsten (1600-1700)', 'topic' => 'Tasman']);
        $story = Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'x', 'status' => 'ready']);
        $map = Scene::create(['lesson_id' => $lesson->id, 'order' => 2, 'kind' => 'map', 'status' => 'ready']);

        $c = Livewire::actingAs($lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $story->id)->call('setSceneMode', '3d')
            ->call('selectScene', $map->id)->call('setSceneMode', '3d');

        $this->assertSame('narration', $story->fresh()->kind);
        $this->assertSame('map', $map->fresh()->kind);
    }

    public function test_no_3d_scene_without_a_bundle_for_the_era(): void
    {
        $lesson = $this->lesson(['era' => 'Tijd van regenten en vorsten (1600-1700)', 'topic' => 'Tasman']);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'x', 'status' => 'ready']);

        Livewire::actingAs($lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->set('addSceneOpen', true)
            ->assertDontSeeHtml('data-add-stage25d')
            ->call('addScene', 'stage25d');

        $this->assertSame(0, $lesson->scenes()->where('kind', 'stage25d')->count());
    }

    public function test_3d_is_a_visual_style_only_when_the_era_has_a_bundle(): void
    {
        $lesson = $this->lesson(['topic_id' => null]);
        $step = Livewire::actingAs($lesson->teacher)->test(Step1Settings::class, ['lesson' => $lesson]);

        $this->assertContains('stage25d', array_column($step->instance()->styleOptions(), 'key'));
        $step->set('era', 'Tijd van regenten en vorsten (1600-1700)');
        $this->assertNotContains('stage25d', array_column($step->instance()->styleOptions(), 'key'));
    }

    public function test_step_1_keeps_the_topic_the_chat_made_and_shows_its_era(): void
    {
        $lesson = $this->lesson(['topic' => 'Wat weten wij over hunebedden?', 'topic_id' => null, 'region' => null]);

        Livewire::actingAs($lesson->teacher)->test(Step1Settings::class, ['lesson' => $lesson])
            ->assertDontSee(__('Select an entry from the list to continue.'))
            ->assertSet('era', 'Tijd van jagers en boeren')
            ->assertSeeHtml('value="Tijd van jagers en boeren"')
            ->assertDontSee(__('Pick a region first'));
    }

    public function test_a_3d_lesson_builds_its_story_scenes_on_the_stage_and_still_narrates_them(): void
    {
        Bus::fake();
        $lesson = $this->lesson(['image_style' => 'stage25d']);
        $story = Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'generating',
            'image_prompt' => 'A girl carries stones to a hunebed', 'script_segment' => 'Een meisje sjouwt stenen.']);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 2, 'kind' => 'game', 'game_type' => 'quiz', 'status' => 'generating']);

        $job = new GenerateLessonScript($lesson->id);
        (fn () => $this->dispatchAssetJobs($lesson, $lesson->scenes()->orderBy('order')->get()))->call($job);

        $story->refresh();
        $this->assertSame('stage25d', $story->kind);
        $this->assertSame('nl-prehistory', $story->config['stage25d']['bundle']);
        $this->assertSame('hunebed-long-01', $story->config['stage25d']['set']['layers'][1]['asset']);
        Bus::assertBatched(function (PendingBatch $batch) use ($story) {
            $jobs = collect($batch->jobs);
            $imagesFor = $jobs->filter(fn ($j) => $j instanceof GenerateSceneImage || $j instanceof GenerateSceneShots)->pluck('sceneId');

            return ! $imagesFor->contains($story->id)
                && $jobs->contains(fn ($j) => $j instanceof GenerateSceneAudio && $j->sceneId === $story->id);
        });
    }

    public function test_a_retry_keeps_the_stage_scenes_off_the_image_path(): void
    {
        Bus::fake();
        $lesson = $this->lesson(['image_style' => 'stage25d']);
        $staged = Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'stage25d', 'status' => 'generating', 'script_segment' => 'x',
            'config' => ['stage25d' => StageSet::starter('nl-prehistory', 's1')]]);

        $job = new GenerateLessonScript($lesson->id);
        (fn () => $this->dispatchAssetJobs($lesson, $lesson->scenes()->orderBy('order')->get()))->call($job);

        $this->assertSame(StageSet::starter('nl-prehistory', 's1'), $staged->fresh()->config['stage25d']);
        Bus::assertBatched(fn (PendingBatch $batch) => collect($batch->jobs)
            ->filter(fn ($j) => $j instanceof GenerateSceneImage || $j instanceof GenerateSceneShots)->isEmpty());
    }

    public function test_no_3d_tile_in_a_voyage_lesson(): void
    {
        $lesson = $this->lesson(['game_type' => 'voyage']);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'map', 'status' => 'ready']);

        Livewire::actingAs($lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->set('addSceneOpen', true)
            ->assertDontSeeHtml('data-add-stage25d');
    }

    public function test_step_1_drops_3d_when_the_era_loses_its_bundle(): void
    {
        $lesson = $this->lesson(['image_style' => 'stage25d']);

        Livewire::actingAs($lesson->teacher)->test(Step1Settings::class, ['lesson' => $lesson])
            ->assertSet('image_style', 'stage25d')
            ->set('region', 'netherlands')
            ->assertSet('era', 'Tijd van jagers en boeren')
            ->assertSet('image_style', 'stage25d')
            ->set('era', 'Tijd van regenten en vorsten (1600-1700)')
            ->assertNotSet('image_style', 'stage25d');
    }

    public function test_a_narrated_3d_scene_is_ready_without_a_picture(): void
    {
        $lesson = $this->lesson();
        $scene = Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'stage25d', 'status' => 'generating',
            'script_segment' => 'x', 'audio_path' => 'a.mp3', 'config' => ['stage25d' => StageSet::starter('nl-prehistory', 's1')]]);

        (new class
        {
            use MarksSceneReady;

            public function run(Scene $s): void
            {
                $this->maybeMarkReady($s);
            }
        })->run($scene);

        $this->assertSame('ready', $scene->fresh()->status);
    }

    private function chatToEra(string $goal)
    {
        $this->mock(OpenAiLlmService::class, fn ($mock) => $mock->shouldReceive('json')->once()->andReturn([
            'summary' => 'Hunebedden', 'topic' => 'Wat weten wij?', 'age' => 10, 'preset_key' => 'story',
            'story_query' => null, 'language' => 'nl',
        ]));

        return Livewire::actingAs(User::factory()->create())->test(LessonChat::class)
            ->set('goal', $goal)
            ->call('submitGoal')
            ->call('continueAfterFocus');
    }

    public function test_the_chat_offers_the_tijdvakken_and_asks_for_3d_when_the_era_has_a_bundle(): void
    {
        Bus::fake();
        app()->setLocale('nl');
        $chat = $this->chatToEra('ik wil een 3D les over hunebedden');
        $options = $chat->instance()->eraOptions();

        $this->assertSame('Tijd van jagers en boeren', $options[0]['label']);
        $this->assertCount(10, $options);
        $chat->call('selectEra', 0)
            ->assertSet('state', 'look')
            ->assertSeeHtml('data-chat-look="3d"')
            ->call('selectLook', '3d')
            ->assertSet('lookChoice', '3D')
            ->assertSet('state', 'preset_confirmation')
            ->call('continueWithSuggestedPreset')
            ->call('continueWithSuggestedAge')
            ->assertSet('state', 'confirm')
            ->assertSee('Wat weten wij?')
            ->assertDontSee('Wat weten wij?.')
            ->call('create');

        $lesson = Lesson::latest('id')->first();
        $this->assertSame('stage25d', $lesson->image_style);
        $this->assertSame('Tijd van jagers en boeren', $lesson->era);
    }

    public function test_the_chat_does_not_ask_for_3d_in_an_era_without_a_bundle(): void
    {
        $chat = $this->chatToEra('the age of regents');
        $index = collect($chat->instance()->eraOptions())->search(fn ($o) => str_starts_with($o['label'], 'Regents'));

        $chat->call('selectEra', $index)->assertSet('state', 'preset_confirmation')->assertSet('look', null);
    }

    public function test_the_first_reply_shows_a_typing_bubble_at_once(): void
    {
        Livewire::actingAs(User::factory()->create())->test(LessonChat::class)
            ->assertSeeHtml('data-chat-typing')
            ->assertSeeHtml('wire:target="submitGoal"');
    }
}
