<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Scene;
use App\Models\User;
use App\Services\LessonComposer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Bart's rule for the team games: a teacher can change everything and change it back.
 */
class TeamGameEditorTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private function composeBudget(): Scene
    {
        $this->teacher = User::factory()->create();

        return app(LessonComposer::class)->build([
            'key' => 'Team game editor',
            'scenes' => [[
                'type' => 'team', 'mode' => 'budget', 'title' => 'De lading', 'capacity' => 16, 'minutes' => 5,
                'fixed' => [['name' => 'Watervaten', 'cost' => 3]],
                'items' => [['name' => 'Reservezeilen', 'why' => 'Storm.', 'cost' => 3]],
                'reveal' => 'Een echt VOC-schip.',
            ]],
        ], $this->teacher, narrate: false)->scenes()->firstOrFail();
    }

    private function editor(Scene $scene)
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $scene->lesson])
            ->call('selectScene', $scene->id);
    }

    public function test_the_teacher_edits_texts_items_and_numbers_and_the_server_clamps_them(): void
    {
        $scene = $this->composeBudget();

        $this->editor($scene)
            ->assertSet('teamDraft.title', 'De lading')
            ->assertSeeHtml('data-team-inspector')
            ->assertSeeHtml('data-team-rows="items"')
            ->set('teamDraft.title', '<b>Wat gaat mee?</b>')
            ->set('teamDraft.items.0.cost', 7)
            ->call('saveTeamDraft')
            ->call('addTeamRow', 'items')
            ->set('teamDraft.items.1.name', 'Touw')
            ->set('teamDraft.capacity', 5000)
            ->call('saveTeamDraft');

        $team = $scene->fresh()->config['team'];
        $this->assertSame('Wat gaat mee?', $team['title']);
        $this->assertSame(7, $team['items'][0]['cost']);
        $this->assertSame('Touw', $team['items'][1]['name']);
        $this->assertSame(999, $team['capacity']);
        $this->assertSame('Een echt VOC-schip.', $team['reveal']);   // untouched fields survive
    }

    public function test_switching_mode_keeps_every_field_and_reset_puts_back_the_original(): void
    {
        $scene = $this->composeBudget();
        $original = $scene->config['team'];

        $editor = $this->editor($scene)
            ->call('setTeamMode', 'choose')
            ->call('addTeamRow', 'options')
            ->call('removeTeamRow', 'fixed', 0);
        $this->assertSame('choose', $scene->fresh()->config['team']['mode']);
        $this->assertCount(1, $scene->fresh()->config['team']['items']);   // budget data kept

        $editor->call('resetTeamGame')->assertDispatched('toast');
        $this->assertSame($original, $scene->fresh()->config['team']);
        $this->assertTrue($editor->instance()->teamGameIsDefault());
    }

    public function test_removing_an_option_keeps_the_real_decision_on_the_same_option(): void
    {
        $this->teacher = User::factory()->create();
        $scene = app(LessonComposer::class)->build([
            'key' => 'Team game answer',
            'scenes' => [[
                'type' => 'team', 'mode' => 'choose', 'answer' => 'B',
                'options' => [['text' => 'Zuid'], ['text' => 'Noord'], ['text' => 'Terug']],
            ]],
        ], $this->teacher, narrate: false)->scenes()->firstOrFail();

        $editor = $this->editor($scene)->call('removeTeamRow', 'options', 2);   // a later one
        $this->assertSame(1, $scene->fresh()->config['team']['answer']);

        $editor->call('removeTeamRow', 'options', 0);                           // an earlier one
        $this->assertSame(0, $scene->fresh()->config['team']['answer']);
        $this->assertSame('Noord', $scene->fresh()->config['team']['options'][0]['text']);

        $editor->call('removeTeamRow', 'options', 0);                           // the real one
        $this->assertNull($scene->fresh()->config['team']['answer']);
    }

    public function test_the_whole_scene_save_cleans_the_team_game_and_never_rewrites_its_default(): void
    {
        $scene = $this->composeBudget();
        $default = $scene->config['team_default'];

        $this->editor($scene)
            ->set('selectedScene.config.team.mode', 'poll')
            ->set('selectedScene.config.team.title', '<script>x</script>Lading')
            ->set('selectedScene.config.team.capacity', 100000)
            ->set('selectedScene.config.team.map', 'javascript:alert(1)')
            ->set('selectedScene.config.team_default.title', 'Hacked')
            ->call('saveSelected');

        $config = $scene->fresh()->config;
        $this->assertSame('budget', $config['team']['mode']);
        $this->assertSame('xLading', $config['team']['title']);
        $this->assertSame(999, $config['team']['capacity']);
        $this->assertSame('', $config['team']['map']);
        $this->assertSame($default, $config['team_default']);
    }

    public function test_reset_survives_a_stored_default_with_an_unknown_mode(): void
    {
        $scene = $this->composeBudget();
        $scene->update(['config' => array_merge($scene->config, ['team_default' => ['mode' => 'poll', 'title' => 'Oud']])]);

        $this->editor($scene)->call('resetTeamGame')->assertOk();

        $team = $scene->fresh()->config['team'];
        $this->assertSame('budget', $team['mode']);
        $this->assertSame('Oud', $team['title']);
    }

    public function test_a_game_scene_can_become_a_team_game_and_back_without_losing_it(): void
    {
        $scene = $this->composeBudget();

        $editor = $this->editor($scene)->call('setSceneGameType', $scene->id, 'quiz');
        $this->assertSame('quiz', $scene->fresh()->game_type);

        $editor->call('setSceneGameType', $scene->id, 'team');
        $this->assertSame('team', $scene->fresh()->game_type);
        $this->assertSame('De lading', $scene->fresh()->config['team']['title']);
    }
}
