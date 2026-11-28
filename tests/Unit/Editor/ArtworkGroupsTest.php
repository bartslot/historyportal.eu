<?php

declare(strict_types=1);

namespace Tests\Unit\Editor;

use App\Services\Editor\ArtworkGroups;
use PHPUnit\Framework\TestCase;

/** Groups of pictures on a flat scene: the server's copy of resources/js/scene/art-groups.js, and the bookkeeping. */
class ArtworkGroupsTest extends TestCase
{
    private function shot(): array
    {
        return ['image_path' => 'a.webp', 'layers' => [
            ['path' => 'a.webp', 'kind' => 'cover'],
            ['asset_id' => 1, 'x' => 20.0, 'y' => 50.0, 'scale' => 1.0],
            ['asset_id' => 2, 'x' => 80.0, 'y' => 50.0, 'scale' => 1.0],
            ['asset_id' => 3, 'x' => 50.0, 'y' => 30.0, 'scale' => 1.0],
            ['asset_id' => 4, 'kind' => 'arrow', 'x' => 10.0, 'y' => 10.0],
        ]];
    }

    public function test_group_makes_a_group_at_rest_round_the_pictures_and_stacks_them_together(): void
    {
        [$shot, $id] = ArtworkGroups::group($this->shot(), [1, 3, 4], 35.0, 40.0);

        $this->assertSame('g1', $id);
        $this->assertSame([['id' => 'g1', 'x' => 0.0, 'y' => 0.0, 'scale' => 1.0, 'rotation' => 0.0, 'opacity' => 1.0, 'pivot_x' => 35.0, 'pivot_y' => 40.0]], $shot['groups']);
        // the arrow is never grouped; 1 and 3 are one block where the front-most (3) stood
        $this->assertSame([null, 2, 1, 3, 4], array_map(fn ($l) => $l['asset_id'] ?? null, $shot['layers']));
        $this->assertSame(['g1', 'g1'], [$shot['layers'][2]['group'], $shot['layers'][3]['group']]);
        $this->assertArrayNotHasKey('group', $shot['layers'][4]);
    }

    public function test_carry_matches_the_editor(): void
    {
        // the same case as art-groups.test.js: 90 degrees about the middle of a 16:9 stage
        $shown = ArtworkGroups::carry(['x' => 60.0, 'y' => 50.0, 'rotation' => 5.0], ['pivot_x' => 50, 'pivot_y' => 50, 'rotation' => 90]);
        $this->assertEqualsWithDelta(50.0, $shown['x'], 1e-6);
        $this->assertEqualsWithDelta(50 + 160 / 900 * 100, $shown['y'], 1e-6);
        $this->assertEqualsWithDelta(95.0, $shown['rotation'], 1e-6);
    }

    public function test_ungroup_leaves_every_picture_where_the_group_put_it(): void
    {
        [$shot] = ArtworkGroups::group($this->shot(), [1, 2], 50.0, 50.0);
        $shot = ArtworkGroups::patch($shot, 'g1', ['x' => 10, 'scale' => 2, 'opacity' => 0.5]);
        $shot = ArtworkGroups::ungroup($shot, 'g1');

        $this->assertArrayNotHasKey('groups', $shot);
        $one = collect($shot['layers'])->firstWhere('asset_id', 1);
        $this->assertArrayNotHasKey('group', $one);
        $this->assertEqualsWithDelta(0.0, $one['x'], 1e-6);   // 50 + 10 + (20 - 50) * 2
        $this->assertEqualsWithDelta(2.0, $one['scale'], 1e-6);
        $this->assertEqualsWithDelta(0.5, $one['opacity'], 1e-6);
    }

    public function test_ungroup_of_a_group_at_rest_changes_nothing_but_the_membership(): void
    {
        [$grouped] = ArtworkGroups::group($this->shot(), [1, 2], 50.0, 50.0);
        $shot = ArtworkGroups::ungroup($grouped, 'g1');
        $this->assertSame(['asset_id' => 1, 'x' => 20.0, 'y' => 50.0, 'scale' => 1.0], collect($shot['layers'])->firstWhere('asset_id', 1));
    }

    public function test_patch_clamps_values_and_cleans_the_name(): void
    {
        [$shot] = ArtworkGroups::group($this->shot(), [1], 50.0, 50.0);
        $shot = ArtworkGroups::patch($shot, 'g1', ['scale' => 99, 'opacity' => -1, 'rotation' => 'x', 'name' => ' Ship <b>and</b> crew ', 'evil' => 1]);
        $g = $shot['groups'][0];
        $this->assertSame(6.0, $g['scale']);
        $this->assertSame(0.0, $g['opacity']);
        $this->assertSame(0.0, $g['rotation']);
        $this->assertSame('Ship and crew', $g['name']);
        $this->assertArrayNotHasKey('evil', $g);
    }

    public function test_prune_drops_empty_groups_and_stray_memberships(): void
    {
        $shot = ['layers' => [['asset_id' => 1, 'group' => 'g9']], 'groups' => [['id' => 'g1'], ['id' => 'g2']]];
        $this->assertSame(['layers' => [['asset_id' => 1]]], ArtworkGroups::prune($shot));
    }

    public function test_a_second_group_gets_a_fresh_id_and_takes_a_picture_out_of_its_old_group(): void
    {
        [$shot] = ArtworkGroups::group($this->shot(), [1, 2], 50.0, 50.0);
        $shot = ArtworkGroups::patch($shot, 'g1', ['y' => 10]);
        [$shot, $id] = ArtworkGroups::group($shot, [2, 3], 60.0, 40.0);

        $this->assertSame('g2', $id);
        $two = collect($shot['layers'])->firstWhere('asset_id', 2);
        $this->assertSame('g2', $two['group']);
        $this->assertEqualsWithDelta(60.0, $two['y'], 1e-6);   // where g1 showed it
        $this->assertSame(['g1', 'g2'], array_column($shot['groups'], 'id'));
    }

    public function test_drop_tracks_takes_the_groups_keys_out_of_the_timeline(): void
    {
        $config = ['timeline' => ['tracks' => [['target' => 'grp:g1', 'property' => 'x'], ['target' => 'art:1', 'property' => 'x']], 'targets' => ['camera']]];
        $this->assertSame([['target' => 'art:1', 'property' => 'x']], ArtworkGroups::dropTracks($config, 'g1')['timeline']['tracks']);
    }

    public function test_layer_payload_reads_the_pivot_and_the_group(): void
    {
        $this->assertSame(['pivot_x' => 0.0, 'pivot_y' => 2.0, 'group' => 'g1'], ArtworkGroups::layerPayload(['pivot_x' => 0, 'pivot_y' => 5, 'group' => 'g1']));
        $this->assertSame(['pivot_x' => null, 'pivot_y' => null, 'group' => null], ArtworkGroups::layerPayload(['kind' => 'arrow', 'group' => 'g1']));
    }

    public function test_a_new_id_skips_ids_used_in_other_panels_or_still_keyed(): void
    {
        $other = ArtworkGroups::group($this->shot(), [1], 20.0, 50.0)[0];
        $config = ['timeline' => ['tracks' => [['target' => 'grp:g2', 'property' => 'x', 'keyframes' => []]]]];
        $taken = ArtworkGroups::idsInUse([$other], $config);
        $this->assertSame(['g1', 'g2'], $taken);

        [, $id] = ArtworkGroups::group($this->shot(), [2], 80.0, 50.0, ArtworkGroups::ASPECT, $taken);
        $this->assertSame('g3', $id);
    }

    public function test_drop_gone_tracks_only_drops_the_keys_of_groups_that_went(): void
    {
        $before = ArtworkGroups::group(ArtworkGroups::group($this->shot(), [1], 20.0, 50.0)[0], [2], 80.0, 50.0)[0];
        $after = $before;
        $after['groups'] = [$before['groups'][1]];
        $config = ['timeline' => ['tracks' => [
            ['target' => 'grp:g1', 'property' => 'x', 'keyframes' => []],
            ['target' => 'grp:g2', 'property' => 'x', 'keyframes' => []],
        ]]];

        $left = ArtworkGroups::dropGoneTracks($config, [$before], [$after]);
        $this->assertSame(['grp:g2'], array_column($left['timeline']['tracks'], 'target'));
    }
}
