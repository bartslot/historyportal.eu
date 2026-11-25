<?php

declare(strict_types=1);

namespace Tests\Unit\Stage25d;

use App\Services\Stage25d\LayerGroups;
use PHPUnit\Framework\TestCase;

/** The server's copy of the stage's group maths (engine-mvp stage25d/layout.ts inGroup), and the group bookkeeping. */
class LayerGroupsTest extends TestCase
{
    private const REST = ['x' => 0.5, 'z' => 20.0];

    public function test_a_new_group_stands_in_the_middle_of_its_layers_with_a_fresh_id(): void
    {
        $group = LayerGroups::make([['x' => 0.4, 'z' => 10.0], ['x' => 0.6, 'depth' => 'mid']], [['id' => 'g1']]);

        $this->assertSame('g2', $group['id']);
        $this->assertEqualsWithDelta(0.5, $group['rest']['x'], 1e-6);
        $this->assertEqualsWithDelta(16.0, $group['rest']['z'], 1e-6);
        $this->assertSame($group['rest']['x'], $group['x']);
    }

    public function test_carry_matches_the_stage(): void
    {
        // the same cases as layout.test.ts "groups"
        $moved = LayerGroups::carry(['x' => 0.6, 'z' => 20.0], ['rest' => self::REST, 'x' => 0.6]);
        $this->assertEqualsWithDelta(0.7, $moved['x'], 1e-6);

        $scaled = LayerGroups::carry(['x' => 0.6, 'z' => 20.0], ['rest' => self::REST, 'scale' => 2]);
        $this->assertEqualsWithDelta(0.7, $scaled['x'], 1e-6);
        $this->assertEqualsWithDelta(2.0, $scaled['scale'], 1e-6);

        $turned = LayerGroups::carry(['x' => 0.6, 'z' => 20.0], ['rest' => self::REST, 'rotation' => 90]);
        $this->assertEqualsWithDelta(0.5, $turned['x'], 1e-6);
        $this->assertEqualsWithDelta(-0.1 * LayerGroups::viewWidthAt(20.0), $turned['y'], 1e-6);
        $this->assertEqualsWithDelta(90.0, $turned['rotation'], 1e-6);
    }

    public function test_released_from_a_group_that_never_moved_a_layer_is_as_it_was(): void
    {
        $layer = ['asset' => 'a', 'depth' => 'mid', 'x' => 0.6, 'group' => 'g1'];

        $this->assertSame(['asset' => 'a', 'depth' => 'mid', 'x' => 0.6], LayerGroups::release($layer, ['id' => 'g1', 'rest' => self::REST, 'x' => 0.5, 'z' => 20.0]));
    }

    public function test_released_from_a_moved_group_a_layer_stands_where_the_group_put_it_keys_too(): void
    {
        $layer = ['asset' => 'a', 'depth' => 'mid', 'x' => 0.6, 'z' => 20.0, 'group' => 'g1', 'keys' => [['t' => 0, 'x' => 0.6], ['t' => 2, 'opacity' => 0.5]]];
        $out = LayerGroups::release($layer, ['id' => 'g1', 'rest' => self::REST, 'x' => 0.6, 'opacity' => 0.5]);

        $this->assertArrayNotHasKey('group', $out);
        $this->assertEqualsWithDelta(0.7, $out['x'], 1e-4);
        $this->assertEqualsWithDelta(0.5, $out['opacity'], 1e-6);
        $this->assertArrayNotHasKey('y', $out);
        $this->assertEqualsWithDelta(0.7, $out['keys'][0]['x'], 1e-4);
        $this->assertEqualsWithDelta(0.25, $out['keys'][1]['opacity'], 1e-6);
    }

    public function test_prune_drops_groups_no_layer_belongs_to(): void
    {
        $set = LayerGroups::prune(['layers' => [['group' => 'g2'], ['asset' => 'b']], 'groups' => [['id' => 'g1'], ['id' => 'g2']]]);
        $this->assertSame([['id' => 'g2']], $set['groups']);

        $this->assertArrayNotHasKey('groups', LayerGroups::prune(['layers' => [['asset' => 'b']], 'groups' => [['id' => 'g1']]]));
    }
}
