<?php

declare(strict_types=1);

namespace Tests\Unit\Diorama;

use App\Services\Diorama\DioramaSpec;
use PHPUnit\Framework\TestCase;

class DioramaSpecTest extends TestCase
{
    /** @return array<string, mixed> */
    private function example(): array
    {
        return json_decode((string) file_get_contents(__DIR__.'/../../../docs/diorama-example.json'), true, 64, JSON_THROW_ON_ERROR);
    }

    /** @param array<string, mixed> $spec */
    private function assertRejected(array $spec, string $expected): void
    {
        $errors = DioramaSpec::errors($spec);
        $this->assertNotEmpty(array_filter($errors, fn ($e) => str_contains($e, $expected)), "expected an error containing '{$expected}', got:\n".implode("\n", $errors));
    }

    public function test_the_documented_example_is_valid(): void
    {
        $this->assertSame([], DioramaSpec::errors($this->example()));
    }

    public function test_decimal_cells_are_on_the_grid_so_a_walk_can_slide(): void
    {
        $spec = $this->example();
        $spec['items'][1]['cell'] = [2.37, 6.5];

        $this->assertSame([], DioramaSpec::errors($spec));
    }

    public function test_nothing_can_be_off_the_grid(): void
    {
        $spec = $this->example();
        unset($spec['items'][1]['floor']);
        $this->assertRejected($spec, 'items[1].floor: no floor with id null (nothing can be off the grid)');

        $spec = $this->example();
        $spec['items'][1]['cell'] = [2, 40.5];
        $this->assertRejected($spec, 'items[1].cell: [2,40.5] is outside floor quay (x -12..12, y 0..40)');
    }

    public function test_a_keyframe_off_the_floor_is_rejected_and_keys_run_forward_in_time(): void
    {
        $spec = $this->example();
        $spec['items'][2]['keys'][1]['cell'] = [-3, 13];
        $this->assertRejected($spec, 'items[2].keys[1].cell: [-3,13] is outside floor boat.deck');

        $spec = $this->example();
        $spec['items'][2]['keys'][1]['t'] = 0;
        $this->assertRejected($spec, 'items[2].keys[1].t: keys must be in time order');
    }

    public function test_a_deck_must_ride_on_an_existing_item(): void
    {
        $spec = $this->example();
        $spec['floors'][2]['on'] = 'ghost_ship';

        $this->assertRejected($spec, 'floors[2].on: no item with id "ghost_ship"');
    }

    public function test_a_boat_cannot_stand_on_its_own_deck(): void
    {
        $spec = $this->example();
        $spec['items'][0]['floor'] = 'boat.deck';
        $spec['items'][0]['cell'] = [0, 0];

        $this->assertRejected($spec, 'floors: boat.deck rides on boat, which stands on a floor carried by itself');
    }

    public function test_every_problem_is_reported_at_once_with_its_path(): void
    {
        $spec = $this->example();
        $spec['items'][0]['id'] = 'barrel_1';        // duplicate id
        $spec['items'][1]['asset_version'] = 0;
        $spec['spots'][0]['facing'] = 'up';

        $errors = DioramaSpec::errors($spec);

        $this->assertContains('items[1].id: "barrel_1" is used twice', $errors);
        $this->assertContains('items[1].asset_version: expected a whole number from 1', $errors);
        $this->assertContains('spots[0].facing: expected left or right', $errors);
    }

    public function test_a_pitched_camera_is_refused_in_version_one(): void
    {
        $spec = $this->example();
        $spec['camera']['level'] = false;

        $this->assertRejected($spec, 'camera.level: must be true');
    }

    public function test_a_newer_file_says_so_instead_of_half_loading(): void
    {
        $spec = $this->example();
        $spec['diorama'] = 2;

        $this->assertSame(['diorama: version 2 is newer than this app understands (1)'], DioramaSpec::errors($spec));
    }

    public function test_readable_ids_only(): void
    {
        $spec = $this->example();
        $spec['items'][1]['id'] = 'Barrel One';

        $this->assertRejected($spec, 'items[1].id: expected a readable id');
    }

    public function test_the_blender_test_quay_scene_is_valid(): void
    {
        $spec = json_decode((string) file_get_contents(__DIR__.'/../../../public/diorama/test-quay/scene.json'), true, 64, JSON_THROW_ON_ERROR);

        $this->assertSame([], DioramaSpec::errors($spec));
        $this->assertSame(['wall', 'rail'], array_column($spec['plate']['occluders'], 'id'));
    }

    public function test_an_occluder_needs_a_picture_and_a_sane_depth_range(): void
    {
        $spec = $this->example();
        $spec['plate'] = ['image' => 'bg.webp', 'occluders' => [
            ['id' => 'wall', 'image' => 'wall.webp', 'depth_m' => [14.4, 14.0]],
            ['id' => 'wall', 'depth_m' => [6, 6.1]],
        ]];

        $errors = DioramaSpec::errors($spec);

        $this->assertContains('plate.occluders[0].depth_m: expected [near, far] in metres from the camera, near > 0 and near <= far', $errors);
        $this->assertContains('plate.occluders[1].id: "wall" is used twice', $errors);
        $this->assertContains("plate.occluders[1].image: expected the picture's file name", $errors);
    }
}
