<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Support\VoyageIntroCamera;
use PHPUnit\Framework\TestCase;

class VoyageIntroCameraTest extends TestCase
{
    private const POSE = ['lng' => 12.34, 'lat' => 45.44, 'zoom' => 3.8, 'heading' => 0, 'tilt' => 0];

    /** @return list<array{time: float, value: float}> */
    private function keysOf(array $timeline, string $property): array
    {
        foreach ($timeline['tracks'] as $track) {
            if ($track['target'] === 'camera' && $track['property'] === $property) {
                return $track['keyframes'];
            }
        }

        return [];
    }

    public function test_the_intro_adds_a_camera_that_dives_from_orbit_to_the_scene_framing(): void
    {
        $timeline = VoyageIntroCamera::withIntro(['duration' => 8, 'targets' => [], 'tracks' => []], self::POSE);

        $this->assertContains('camera', $timeline['targets']);
        $zoom = $this->keysOf($timeline, 'zoom');
        $this->assertSame(['time' => 0.0, 'value' => VoyageIntroCamera::ORBIT_ZOOM], $zoom[0]);
        $this->assertSame(['time' => VoyageIntroCamera::LANDS_AT, 'value' => 3.8], end($zoom));
        $this->assertSame([12.34], array_values(array_unique(array_column($this->keysOf($timeline, 'lng'), 'value'))));
    }

    public function test_the_camera_tilts_during_the_dive_and_lands_flat(): void
    {
        $tilt = $this->keysOf(VoyageIntroCamera::withIntro([], self::POSE), 'tilt');

        $this->assertSame(VoyageIntroCamera::DIVE_TILT, max(array_column($tilt, 'value')));
        $this->assertSame(0.0, $tilt[0]['value']);
        $this->assertSame(0.0, end($tilt)['value']);
    }

    public function test_a_camera_the_teacher_already_keyed_is_left_alone(): void
    {
        $mine = ['target' => 'camera', 'property' => 'zoom', 'keyframes' => [['time' => 0, 'value' => 2], ['time' => 3, 'value' => 5]]];
        $timeline = VoyageIntroCamera::withIntro(['duration' => 8, 'targets' => ['camera'], 'tracks' => [$mine]], self::POSE);

        $this->assertSame([$mine], $timeline['tracks']);
    }

    public function test_a_scene_shorter_than_the_dive_grows_to_fit_it(): void
    {
        $this->assertSame(VoyageIntroCamera::LANDS_AT, VoyageIntroCamera::withIntro(['duration' => 2], self::POSE)['duration']);
    }

    public function test_turning_the_intro_off_removes_the_camera_and_nothing_else(): void
    {
        $text = ['target' => 'text:1', 'property' => 'x', 'keyframes' => [['time' => 0, 'value' => 1]]];
        $on = VoyageIntroCamera::withIntro(['duration' => 8, 'targets' => [], 'tracks' => [$text]], self::POSE);
        $off = VoyageIntroCamera::withoutIntro($on);

        $this->assertSame([], $off['targets']);
        $this->assertSame([$text], $off['tracks']);
    }

    public function test_a_pose_with_a_missing_or_non_numeric_field_is_refused(): void
    {
        $this->assertNull(VoyageIntroCamera::pose(['lng' => 1, 'lat' => 2]));
        $this->assertNull(VoyageIntroCamera::pose(['lng' => 'x', 'lat' => 2, 'zoom' => 3]));
        $this->assertSame(['lng' => 1.0, 'lat' => 2.0, 'zoom' => 3.0, 'heading' => 0.0], VoyageIntroCamera::pose(['lng' => 1, 'lat' => 2, 'zoom' => 3]));
    }
}
