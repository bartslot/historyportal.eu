<?php

declare(strict_types=1);

namespace Tests\Feature\Map;

use Tests\TestCase;

/**
 * A tile that holds nothing is not a missing file: MapLibre asks for every tile in view, the tile
 * sets only store the ones with features, and each gap used to be a 404 in the console and a
 * "failed request" in npm run demo:check (2026-10-26, river-tiles/3/3/1.pbf, map-chart/waves/3/5/2.pbf).
 */
class EmptyTileTest extends TestCase
{
    public function test_a_tile_with_nothing_in_it_answers_empty_not_missing(): void
    {
        foreach (['/river-tiles/3/3/1.pbf', '/city-tiles/3/3/1.pbf', '/map-chart/waves/3/5/2.pbf', '/map-chart/peaks/4/9/9.pbf'] as $url) {
            $this->get($url)->assertNoContent();
        }
    }

    public function test_only_tile_sets_are_covered(): void
    {
        foreach (['/map-chart/art/1/2/3.pbf', '/storage/1/2/3.pbf', '/river-tiles/a/b/c.pbf'] as $url) {
            $this->assertNotSame(204, $this->get($url)->status(), $url);
        }
    }
}
