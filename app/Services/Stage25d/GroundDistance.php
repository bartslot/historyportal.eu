<?php

declare(strict_types=1);

namespace App\Services\Stage25d;

/**
 * Gives every picture that stands on the ground of a stage25d scene its distance from the camera in metres
 * (`config.stage25d.set.layers[i].z`), the value the editor drags along the ground grid. The distance is its depth
 * band's (engine-mvp stage25d/layout.ts DEPTH_Z), which is where the stage already draws a layer without z: nothing
 * changes on screen. Backdrops that span the view (the sky picture, bg strips, tileable pictures) and sky-depth
 * pictures are not on the ground and keep no z. A layer that already has z is left alone, so a second run changes nothing.
 */
final class GroundDistance
{
    /** Distance of each ground band from the camera in metres (layout.ts DEPTH_Z). */
    public const DEPTH_Z = ['bg' => 70.0, 'mid' => 22.0, 'fg' => 7.0, 'near' => 3.5];

    /**
     * @param  array<string,mixed>  $stage  config.stage25d
     * @return array{0:array<string,mixed>,1:array{filled:int,skipped:int}}
     */
    public static function fill(array $stage): array
    {
        $report = ['filled' => 0, 'skipped' => 0];
        $layers = $stage['set']['layers'] ?? null;
        if (! is_array($layers)) {
            return [$stage, $report];
        }
        $assets = collect(LibraryBundle::assets((string) ($stage['bundle'] ?? '')))->keyBy('id');
        foreach ($layers as $i => $layer) {
            if (! is_array($layer) || isset($layer['z'])) {
                continue;
            }
            $depth = (string) ($layer['depth'] ?? 'mid');
            $asset = is_string($layer['asset'] ?? null) ? $assets->get($layer['asset']) : null;
            $kind = $asset['layer'] ?? null;
            $backdrop = $kind === 'bg' || $kind === 'sky' || ! empty($asset['tileable_x']) || ($asset === null && $depth === 'bg');
            if (! isset(self::DEPTH_Z[$depth]) || $backdrop) {
                $report['skipped']++;

                continue;
            }
            $layers[$i] = [...$layer, 'z' => self::DEPTH_Z[$depth]];
            $report['filled']++;
        }
        $stage['set']['layers'] = $layers;

        return [$stage, $report];
    }
}
