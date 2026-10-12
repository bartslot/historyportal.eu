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
