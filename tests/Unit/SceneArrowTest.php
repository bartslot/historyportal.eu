<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\SvgAsset;
use App\Services\SceneArrow;
use App\Services\SceneLayers;
use PHPUnit\Framework\TestCase;

/** The server's half of a vector arrow: the bounds it saves within, and which library arrows become one. */
class SceneArrowTest extends TestCase
{
    private function arrowAsset(string $ref, string $collection = 'arrows'): SvgAsset
    {
        $asset = new SvgAsset(['collection' => $collection, 'source_ref' => $ref, 'svg_path' => $ref.'.svg']);
        $asset->forceFill(['id' => 42]);

        return $asset;
    }

    public function test_clamp_keeps_each_value_inside_the_canvas_bounds(): void
    {
        $clean = SceneArrow::clamp(['end_x' => 140, 'end_y' => -5, 'bend' => -9, 'shaft' => 0, 'head' => 99]);

        $this->assertSame(100.0, $clean['end_x']);
        $this->assertSame(0.0, $clean['end_y']);
        $this->assertSame(-0.5, $clean['bend']);
        $this->assertSame(0.2, $clean['shaft']);
        $this->assertSame(20.0, $clean['head']);
    }

    public function test_clamp_leaves_out_keys_that_are_absent_or_not_numeric(): void
    {
        $this->assertSame(['end_x' => 33.0], SceneArrow::clamp(['end_x' => 33, 'bend' => 'curvy']));
    }

    public function test_a_library_arrow_with_a_vector_form_becomes_an_arrow_layer(): void
    {
        $layer = SceneLayers::forAsset($this->arrowAsset('arrows/arrow-curved'), ['x' => 30, 'y' => 40]);

        $this->assertSame(SceneArrow::KIND, $layer['kind']);
        $this->assertSame(42, $layer['asset_id']);
        $this->assertArrayNotHasKey('path', $layer, 'an arrow is drawn, it has no picture');
        $this->assertSame('stroke', $layer['arrow_style']);
        $this->assertSame(0.22, $layer['bend']);
        $this->assertSame(50.0, $layer['end_x'], 'the default end sits 20 along from the start');
    }

    public function test_the_library_ref_with_its_extension_matches_the_preset(): void
    {
        // The live library stores source_ref with the file extension, and that is what the editor places.
        $this->assertSame('block', SceneLayers::forAsset($this->arrowAsset('arrows/arrow-block.svg'))['arrow_style']);
    }

    public function test_a_block_arrow_keeps_its_style(): void
    {
        $layer = SceneLayers::forAsset($this->arrowAsset('arrows/arrow-block'));

        $this->assertSame('block', $layer['arrow_style']);
    }

    public function test_an_arrow_without_a_vector_form_stays_a_picture(): void
    {
        $layer = SceneLayers::forAsset($this->arrowAsset('arrows/arrow-dashed'));

        $this->assertSame('figure', $layer['kind']);
        $this->assertArrayNotHasKey('arrow_style', $layer);
    }

    public function test_a_non_arrow_collection_is_never_turned_into_an_arrow(): void
    {
        $this->assertNull(SceneArrow::presetFor($this->arrowAsset('line-art/arrow-straight', 'line-art')));
    }

    public function test_payload_carries_the_arrow_values_only_for_an_arrow(): void
    {
        $arrow = SceneArrow::payload(['kind' => 'arrow', 'end_x' => 60, 'bend' => 0.1, 'arrow_style' => 'block']);

        $this->assertSame('arrow', $arrow['kind']);
        $this->assertSame(60.0, $arrow['end_x']);
        $this->assertSame('block', $arrow['arrow_style']);
        $this->assertSame([], SceneArrow::payload(['kind' => 'figure', 'end_x' => 60]));
    }
}
