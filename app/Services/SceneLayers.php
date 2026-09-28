<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SvgAsset;

/**
 * The shape of a layered scene shot, in ONE place: the editor (EditsSceneArtwork) and the lesson
 * composer (Lessons\LibraryLayers) both build their layers here, so a composed scene is by
 * construction the same row the editor writes, and an editor change reaches composed lessons too.
 */
final class SceneLayers
{
    /** The scene image under the figures. Low, so it drifts behind them in Parallax mode. */
    public const COVER_DEPTH = 0.4;

    /** A figure the teacher has not placed yet: x/y is its CENTRE, in % of the stage. */
    public const FIGURE_DEFAULTS = ['kind' => 'figure', 'depth' => 1.3, 'scale' => 1.0, 'height' => 40, 'sway' => false, 'x' => 50.0, 'y' => 58.0];

    /**
     * An asset as a figure layer: the defaults, under whatever the caller sets.
     *
     * @param  array<string,mixed>  $settings
     * @return array<string,mixed>
     */
    public static function figure(SvgAsset $asset, array $settings = []): array
    {
        return ['asset_id' => $asset->id, 'path' => $asset->src(), ...self::FIGURE_DEFAULTS, ...$settings];
    }

    /** @return array{path:string,kind:string,depth:float} */
    public static function cover(string $imagePath, float $depth = self::COVER_DEPTH): array
    {
        return ['path' => $imagePath, 'kind' => 'cover', 'depth' => $depth];
    }

    /**
     * A single shot: the scene image as a cover layer under the given layers, or the layers alone
     * when the scene has no image (a map, a voyage: the map IS the backdrop).
     *
     * @param  list<array<string,mixed>>  $layers
     * @return array<string,mixed>
     */
    public static function shot(?string $imagePath, array $layers, float $coverDepth = self::COVER_DEPTH): array
    {
        return $imagePath
            ? ['order' => 0, 'image_path' => $imagePath, 'layers' => [self::cover($imagePath, $coverDepth), ...$layers]]
            : ['order' => 0, 'layers' => $layers];
    }
}
