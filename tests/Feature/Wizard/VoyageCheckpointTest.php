<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\User;
use App\Services\VoyageLessonBuilder;
use App\Support\VoyageCheckpoints;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Checkpoints along a voyage leg (Bart 2026-11-26): click the route, add pictures and text, and the class sees
 * a card as the traveller passes. Stored on the leg's scene at config.checkpoints.
 */
class VoyageCheckpointTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: \Livewire\Features\SupportTesting\Testable, 1: \App\Models\Scene} */
    private function editor(): array
    {
        $teacher = User::factory()->create();
        $lesson = app(VoyageLessonBuilder::class)->build('columbus-1492', $teacher);
        $scene = $lesson->scenes()->where('kind', 'voyage')->ordered()->get()
            ->first(fn ($s) => empty($s->config['overview']));
        $this->assertNotNull($scene);

        $component = Livewire::actingAs($teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $scene->id);

        return [$component, $scene];
    }

    private function checkpoints($scene): array
    {
        return $scene->fresh()->config['checkpoints'] ?? [];
    }

    public function test_clicking_the_route_adds_a_checkpoint_on_the_leg_scene(): void
    {
        [$component, $scene] = $this->editor();

        $component->dispatch('voyageCheckpointAdded', sceneId: $scene->id, lng: -20.5, lat: 30.25);

        $cps = $this->checkpoints($scene);
        $this->assertCount(1, $cps);
        $this->assertEqualsWithDelta(-20.5, $cps[0]['lng'], 0.0001);
        $this->assertEqualsWithDelta(30.25, $cps[0]['lat'], 0.0001);
        $this->assertFalse($cps[0]['button'], 'a checkpoint shows by itself unless the teacher puts it behind a button');
        $component->assertSet('voyageCheckpointFocus', $cps[0]['id']);
    }

    public function test_a_checkpoint_takes_text_pictures_and_the_button_switch(): void
    {
        [$component, $scene] = $this->editor();
        $component->call('addVoyageCheckpoint', $scene->id, -20.0, 30.0);
        $id = $this->checkpoints($scene)[0]['id'];

        $component->call('setCheckpointText', $id, 'title', 'Canarische Eilanden')
            ->call('setCheckpointText', $id, 'story', 'Water en hout aan boord.')
            ->call('setCheckpointText', $id, 'image_path', 'nope')
            ->call('addCheckpointImage', $id, 'https://example.org/a.webp')
            ->call('addCheckpointImage', $id, 'https://example.org/b.webp', 'Rijksmuseum')
            ->call('moveCheckpointImage', $id, 1, 0)
            ->call('setCheckpointButton', $id, true);

        $cp = $this->checkpoints($scene)[0];
        $this->assertSame('Canarische Eilanden', $cp['title']);
        $this->assertSame('Water en hout aan boord.', $cp['story']);
        $this->assertArrayNotHasKey('image_path', $cp);
        $this->assertSame(['https://example.org/b.webp', 'https://example.org/a.webp'], array_column($cp['images'], 'url'));
        $this->assertSame('Rijksmuseum', $cp['images'][0]['credit']);
        $this->assertTrue($cp['button']);

        $component->call('removeCheckpointImage', $id, 0);
        $this->assertSame(['https://example.org/a.webp'], array_column($this->checkpoints($scene)[0]['images'], 'url'));
    }

    public function test_a_checkpoint_moves_along_the_route_and_can_be_deleted(): void
    {
        [$component, $scene] = $this->editor();
        $component->call('addVoyageCheckpoint', $scene->id, -20.0, 30.0)
            ->call('addVoyageCheckpoint', $scene->id, -40.0, 25.0);
        [$first, $second] = $this->checkpoints($scene);

        $component->dispatch('voyageCheckpointMoved', sceneId: $scene->id, id: $first['id'], lng: -25.0, lat: 29.0);
        $this->assertEqualsWithDelta(-25.0, $this->checkpoints($scene)[0]['lng'], 0.0001);

        $component->call('removeVoyageCheckpoint', $first['id']);
        $this->assertSame([$second['id']], array_column($this->checkpoints($scene), 'id'));
    }

    public function test_a_click_for_another_scene_or_a_bad_point_adds_nothing(): void
    {
        [$component, $scene] = $this->editor();

        $component->call('addVoyageCheckpoint', $scene->id + 999, -20.0, 30.0)
            ->call('addVoyageCheckpoint', $scene->id, -20.0, 95.0)
            ->call('addVoyageCheckpoint', $scene->id, 'abc', 30.0);

        $this->assertSame([], $this->checkpoints($scene));
    }

    public function test_a_leg_holds_at_most_the_maximum(): void
    {
        [$component, $scene] = $this->editor();
        for ($i = 0; $i < VoyageCheckpoints::MAX + 2; $i++) {
            $component->call('addVoyageCheckpoint', $scene->id, -20.0 - $i, 30.0);
        }

        $this->assertCount(VoyageCheckpoints::MAX, $this->checkpoints($scene));
    }

    public function test_the_inspector_lists_the_checkpoints(): void
    {
        [$component, $scene] = $this->editor();
        $component->call('addVoyageCheckpoint', $scene->id, -20.0, 30.0);
        $id = $this->checkpoints($scene)[0]['id'];
        $component->call('setCheckpointText', $id, 'title', 'Kaapverdië');

        $component->assertSee('Kaapverdië')->assertSeeHtml('data-checkpoint-id="'.$id.'"');
    }
}
