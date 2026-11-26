<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\User;
use App\Services\VoyageLessonBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * The editor draws a lesson's ship stretches round the land (resources/js/timemap/sea-route.js) and
 * saves what it drew. Bends may be added and moved; a stop never moves and a leg keeps its fields.
 */
class VoyageRouteKeptAtSeaTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0: \Livewire\Features\SupportTesting\Testable, 1: \App\Models\Lesson, 2: int, 3: array, 4: array} */
    private function editor(): array
    {
        $teacher = User::factory()->create();
        $lesson = app(VoyageLessonBuilder::class)->build('columbus-1492', $teacher);
        $scene = $lesson->scenes()->where('kind', 'voyage')->ordered()->get()
            ->first(fn ($s) => empty($s->config['overview']));
        $component = Livewire::actingAs($teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $scene->id);
        $catalog = collect(json_decode((string) file_get_contents(resource_path('js/timemap/voyages.json')), true)['voyages'])
            ->firstWhere('id', 'columbus-1492');

        return [$component, $lesson, $scene->id, $catalog['waypoints'], $catalog['legs']];
    }

    /** The route with two bends inserted after waypoint $i, every later leg index shifted. */
    private function withBends(array $wps, array $legs, int $i): array
    {
        array_splice($wps, $i + 1, 0, [[-20.0, 30.0], [-22.5, 29.0]]);
        $legWps = array_map(fn ($l) => array_map(fn ($w) => $w > $i ? $w + 2 : $w, $l['wp']), $legs);

        return [$wps, $legWps];
    }

    public function test_the_route_drawn_at_sea_is_saved_with_its_legs_shifted(): void
    {
        [$component, $lesson, $sceneId, $wps, $legs] = $this->editor();
        [$newWps, $legWps] = $this->withBends($wps, $legs, 0);

        $component->call('keepVoyageRouteAtSea', $sceneId, $newWps, $legWps, null);

        $def = $lesson->fresh()->game_config['voyage_def'];
        $this->assertCount(count($wps) + 2, $def['waypoints']);
        $this->assertEqualsWithDelta(-20.0, $def['waypoints'][1][0], 0.001);
        $this->assertSame($legWps, array_map(fn ($l) => $l['wp'], $def['legs']));
        // Everything else about a leg is untouched.
        $this->assertSame($legs[0]['depart'] ?? null, $def['legs'][0]['depart'] ?? null);
        $this->assertTrue($component->instance()->canUndoVoyage, 'the save can be taken back');
    }

    public function test_a_route_that_moves_a_stop_is_refused(): void
    {
        [$component, $lesson, $sceneId, $wps, $legs] = $this->editor();
        [$newWps, $legWps] = $this->withBends($wps, $legs, 0);
        $stop = $legWps[0][1];
        $newWps[$stop] = [$newWps[$stop][0] + 1, $newWps[$stop][1]];

        $before = $lesson->fresh()->game_config['voyage_def']['waypoints'] ?? null;
        $component->call('keepVoyageRouteAtSea', $sceneId, $newWps, $legWps, null);

        $this->assertSame($before, $lesson->fresh()->game_config['voyage_def']['waypoints'] ?? null);
    }

    public function test_a_route_that_shifts_its_stops_or_has_other_legs_is_refused(): void
    {
        [$component, $lesson, $sceneId, $wps, $legs] = $this->editor();
        $before = $lesson->fresh()->game_config['voyage_def']['waypoints'] ?? null;

        $component->call('keepVoyageRouteAtSea', $sceneId, array_slice($wps, 1), array_map(fn ($l) => $l['wp'], $legs), null);
        [$newWps, $legWps] = $this->withBends($wps, $legs, 0);
        $component->call('keepVoyageRouteAtSea', $sceneId, $newWps, array_slice($legWps, 1), null);

        $this->assertSame($before, $lesson->fresh()->game_config['voyage_def']['waypoints'] ?? null);
    }

    public function test_a_route_that_drops_a_bend_it_no_longer_needs_is_saved(): void
    {
        [$component, $lesson, $sceneId, $wps, $legs] = $this->editor();
        [$newWps, $legWps] = $this->withBends($wps, $legs, 0);
        $component->call('keepVoyageRouteAtSea', $sceneId, $newWps, $legWps, null);

        // Take one of the two bends out again: every stop stays where it was.
        array_splice($newWps, 1, 1);
        $fewer = array_map(fn ($l) => array_map(fn ($w) => $w > 1 ? $w - 1 : $w, $l), $legWps);
        $component->call('keepVoyageRouteAtSea', $sceneId, $newWps, $fewer, null);

        $def = $lesson->fresh()->game_config['voyage_def'];
        $this->assertCount(count($wps) + 1, $def['waypoints']);
        $this->assertSame($fewer, array_map(fn ($l) => $l['wp'], $def['legs']));
    }
}
