<?php

declare(strict_types=1);

namespace Tests\Feature\Stage25d;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\Stage25d\LibraryBundle;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/** A character's pictures are one series; a balloon added to a character is grouped with it. */
class SeriesAndGroupsTest extends TestCase
{
    use RefreshDatabase;

    private static function fig(string $char, string $pose, string $facing = 'right'): array
    {
        $id = "fig-{$char}-{$pose}-01".($facing === 'left' ? '-l' : '');

        return ['id' => $id, 'layer' => 'figure', 'file' => "{$id}.webp", 'tags' => ['figure', "char:{$char}", "pose:{$pose}", "facing:{$facing}"]];
    }

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            ['id' => 'tree-birch-01', 'layer' => 'mid', 'file' => 'b.webp'],
            self::fig('dorpeling-a', 'stand'), self::fig('dorpeling-a', 'walk', 'left'), self::fig('dorpeling-b', 'stand'),
        ]]));
    }

    private function scene(array $layers): Scene
    {
        $lesson = Lesson::create([
            'teacher_id' => User::factory()->create()->id,
            'topic' => 'Hunebedden', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);

        return Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'stage25d', 'script_segment' => 'x', 'status' => 'ready',
            'config' => ['stage25d' => ['bundle' => 'nl-prehistory', 'set' => ['layers' => $layers]]],
        ]);
    }

    private function editor(Scene $scene)
    {
        return Livewire::actingAs($scene->lesson->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])->call('selectScene', $scene->id);
    }

    public function test_a_figure_belongs_to_the_series_of_its_character(): void
    {
        $this->assertSame('dorpeling-a', LibraryBundle::seriesOf(self::fig('dorpeling-a', 'walk')));
        $this->assertSame('meisje', LibraryBundle::seriesOf(['id' => 'fig-meisje-sit-01-l', 'layer' => 'figure']));
        $this->assertNull(LibraryBundle::seriesOf(['id' => 'tree-birch-01', 'layer' => 'mid']));
        $this->assertSame('left', LibraryBundle::facingOf(self::fig('x', 'walk', 'left')));
        $this->assertSame('right', LibraryBundle::facingOf(['id' => 'fig-x-walk-01']));
    }

    public function test_a_balloon_on_a_character_is_grouped_with_it_and_one_undo_takes_it_back(): void
    {
        $scene = $this->scene([
            ['asset' => 'fig-dorpeling-a-walk-01-l', 'depth' => 'mid', 'x' => 0.4, 'figure' => 'dorpeling-a'],
            ['asset' => 'fig-dorpeling-a-stand-01', 'depth' => 'mid', 'x' => 0.6],
        ]);
        $editor = $this->editor($scene);

        $editor->call('addStage25dBalloon', 1)->assertSet('activeBalloonId', 'bal_0')->assertDispatched('balloon:added');

        $config = $scene->fresh()->config;
        $this->assertSame('dorpeling-a-2', $config['stage25d']['set']['layers'][1]['figure'], 'a handle no other layer has');
        $line = $config['lines'][0];
        $this->assertTrue($line['group']);
        $this->assertSame('stage25d:dorpeling-a-2', $line['figure']['asset_id']);
        $this->assertSame(1, $line['figure']['facing']);
        $this->assertGreaterThan(0, $line['at'][0], 'in front of a face that looks right');
        $this->assertLessThan(0, $line['at'][1], 'above the mouth');

        // the layer that already speaks keeps its handle; facing left puts the balloon on the left
        $this->travel(2)->seconds();   // edits closer together are one undo step (SceneHistory::MERGE_SECONDS)
        $editor->call('addStage25dBalloon', 0);
        $config = $scene->fresh()->config;
        $this->assertSame('dorpeling-a', $config['stage25d']['set']['layers'][0]['figure']);
        $this->assertSame(-1, $config['lines'][1]['figure']['facing']);
        $this->assertLessThan(0, $config['lines'][1]['at'][0]);

        $editor->call('undoLastEdit');
        $this->assertCount(1, $scene->fresh()->config['lines']);
        $editor->call('undoLastEdit');
        $config = $scene->fresh()->config;
        $this->assertArrayNotHasKey('lines', $config, 'one undo takes the balloon and the handle back');
        $this->assertArrayNotHasKey('figure', $config['stage25d']['set']['layers'][1]);
    }

    public function test_a_second_balloon_on_a_character_does_not_cover_the_first(): void
    {
        $scene = $this->scene([['asset' => 'fig-dorpeling-a-stand-01', 'depth' => 'mid', 'x' => 0.4]]);
        $this->editor($scene)->call('addStage25dBalloon', 0)->call('addStage25dBalloon', 0);

        [$first, $second] = $scene->fresh()->config['lines'];
        $this->assertEqualsWithDelta($first['at'][1] - 0.1, $second['at'][1], 0.001, 'a step further above the mouth');
        $this->assertNotEquals($first['at'][0], $second['at'][0]);
    }

    public function test_only_a_character_takes_a_grouped_balloon(): void
    {
        $scene = $this->scene([['asset' => 'tree-birch-01', 'depth' => 'mid']]);
        $this->editor($scene)->call('addStage25dBalloon', 0)->call('addStage25dBalloon', 7);

        $this->assertArrayNotHasKey('lines', $scene->fresh()->config);
    }

    public function test_a_grouped_balloon_moves_from_its_speaker_and_goes_when_the_character_is_deleted(): void
    {
        $scene = $this->scene([
            ['asset' => 'fig-dorpeling-a-stand-01', 'depth' => 'mid', 'x' => 0.4],
            ['asset' => 'tree-birch-01', 'depth' => 'mid'],
        ]);
        $config = $scene->config;
        $config['lines'] = [['speaker' => 'balloon', 'text' => 'Hallo', 'at' => [0.2, 0.2]]];   // a loose balloon stays
        $scene->update(['config' => $config]);
        $editor = $this->editor($scene);
        $editor->call('addStage25dBalloon', 0);

        $this->travel(2)->seconds();
        $editor->call('changeBalloon', 'bal_1', ['at' => [-0.2, -0.3]]);
        $this->assertEquals([-0.2, -0.3], $scene->fresh()->config['lines'][1]['at'], 'counted from the mouth: may be negative');
        $this->assertTrue($scene->fresh()->config['lines'][1]['group']);

        // a character switch keeps the handle, so the balloon stays grouped
        $this->travel(2)->seconds();
        $editor->call('saveStage25dLayer', 0, ['asset' => 'fig-dorpeling-b-stand-01'], $scene->id);
        $this->assertSame('dorpeling-a', $scene->fresh()->config['stage25d']['set']['layers'][0]['figure']);

        $this->travel(2)->seconds();
        $editor->call('removeStage25dLayer', 0);
        $config = $scene->fresh()->config;
        $this->assertSame(['tree-birch-01'], array_column($config['stage25d']['set']['layers'], 'asset'));
        $this->assertSame(['Hallo'], array_column($config['lines'], 'text'), 'the group goes as one; the loose balloon stays');

        $editor->call('undoLastEdit');
        $this->assertCount(2, $scene->fresh()->config['lines'], 'and comes back as one');
    }
}
