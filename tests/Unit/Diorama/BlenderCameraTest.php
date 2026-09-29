<?php

declare(strict_types=1);

namespace Tests\Unit\Diorama;

use App\Services\Diorama\BlenderCamera;
use App\Services\Diorama\DioramaSpec;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class BlenderCameraTest extends TestCase
{
    /** A real hp1 camera.json from the art pipeline (lesson_assets/_sketchfab/_gallery/p_shrub_camera.json), trimmed. */
    private const HP1 = [
        'shot' => 'p_shrub', 'family' => 'hp1', 'resolution' => [2560, 1440],
        'camera_location_m' => [0.0, -8.65, 1.75], 'camera_rotation_deg' => [90.0, 0.0, 0.0],
        'lens_mm' => 28.254, 'sensor_width_mm' => 36.0, 'shift_y' => 0.0,
        'focal_px' => 2009.2, 'horizon_y_px' => 720.0, 'eye_height_m' => 1.75,
    ];

    public function test_an_hp1_camera_becomes_a_valid_level_diorama_camera(): void
    {
        $camera = BlenderCamera::toCamera(self::HP1);

        $this->assertSame(2560, $camera['width']);
        $this->assertSame(1440, $camera['height']);
        $this->assertSame(2009.2, $camera['focal_px']);
        $this->assertEquals([1280, 720.0], $camera['principal_px']);
        $this->assertSame([0.0, -8.65, 1.75], $camera['position_m']);
        $this->assertTrue($camera['level']);

        $spec = ['diorama' => 1, 'camera' => $camera, 'floors' => [['id' => 'floor', 'height_m' => 0, 'cell_m' => 0.5, 'cells' => [[0, 0], [1, 1]]]]];
        $this->assertSame([], DioramaSpec::errors($spec));
    }

    public function test_hp1_focal_length_matches_its_lens(): void
    {
        // focal_px = lens / sensor width × image width; keeps the pipeline and this contract honest.
        $this->assertEqualsWithDelta(28.254 / 36.0 * 2560, BlenderCamera::toCamera(self::HP1)['focal_px'], 0.1);
    }

    public function test_a_tilted_camera_is_refused(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('not level');

        BlenderCamera::toCamera([...self::HP1, 'camera_rotation_deg' => [80.0, 0.0, 0.0]]);
    }

    public function test_a_missing_field_is_named(): void
    {
        $this->expectExceptionMessage('has no horizon_y_px');

        $camera = self::HP1;
        unset($camera['horizon_y_px']);
        BlenderCamera::toCamera($camera);
    }
}
