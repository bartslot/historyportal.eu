<?php

declare(strict_types=1);

namespace App\Services\Diorama;

use InvalidArgumentException;

/**
 * Turns the art pipeline's `<shot>_camera.json` (tools/artkit/blender, hp1 family) into the
 * diorama `camera` block.
 *
 * Blender's camera looks level when its X rotation is 90° and its Y rotation (roll) is 0°;
 * Z is the yaw. The horizon row of a level camera is its principal point's row, and the
 * pipeline already writes it as `horizon_y_px` (lens shift included).
 */
final class BlenderCamera
{
    /** Degrees a rotation may be off and still count as level (float noise from Blender). */
    private const LEVEL_TOLERANCE_DEG = 0.01;

    /**
     * @param  array<string, mixed>  $blender
     * @return array<string, mixed>
     */
    public static function toCamera(array $blender): array
    {
        [$width, $height] = $blender['resolution'] ?? [null, null];
        [$pitch, $roll, $yaw] = $blender['camera_rotation_deg'] ?? [null, null, null];

        foreach (['resolution' => $width, 'camera_rotation_deg' => $pitch, 'focal_px' => $blender['focal_px'] ?? null,
            'horizon_y_px' => $blender['horizon_y_px'] ?? null, 'camera_location_m' => $blender['camera_location_m'] ?? null] as $key => $value) {
            if ($value === null) {
                throw new InvalidArgumentException("Blender camera.json has no {$key}.");
            }
        }

        if (abs($pitch - 90) > self::LEVEL_TOLERANCE_DEG || abs($roll) > self::LEVEL_TOLERANCE_DEG) {
            throw new InvalidArgumentException(sprintf(
                'Blender camera is not level (rotation %s°, %s°); version 1 needs X = 90° and Y = 0°.', $pitch, $roll));
        }

        return [
            'width' => (int) $width,
            'height' => (int) $height,
            'focal_px' => (float) $blender['focal_px'],
            'principal_px' => [$width / 2, (float) $blender['horizon_y_px']],
            'position_m' => array_map(floatval(...), $blender['camera_location_m']),
            'yaw_deg' => (float) $yaw,
            'level' => true,
            'source' => $blender['shot'] ?? null,
        ];
    }
}
