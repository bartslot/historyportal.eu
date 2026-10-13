<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Support\LayerAmbient;
use App\Services\Support\ShotCamera;
use PHPUnit\Framework\TestCase;

/**
 * The world-motion vocabulary lives twice: PHP validates it (LayerAmbient, ShotCamera), JS plays it
 * (resources/js/scene/ambient.js, camera.js). If they drift, a teacher picks a mode the server
 * refuses, or the editor shows a default the player does not use. This reads the JS and holds the
 * two together.
 */
class WorldMotionVocabularyTest extends TestCase
{
    private function js(string $file): string
    {
        return (string) file_get_contents(dirname(__DIR__, 2)."/resources/js/scene/{$file}");
    }

    /** @return array<string, float> the `key: number` pairs of one exported object literal */
    private function jsObject(string $source, string $name): array
    {
        $this->assertSame(1, preg_match('/export const '.$name.' = \{(.*?)\n\}/s', $source, $m), "{$name} not found");
        preg_match_all("/'?([a-z-]+)'?:\\s*([\\d.]+)/", $m[1], $pairs, PREG_SET_ORDER);

        return collect($pairs)->mapWithKeys(fn ($p) => [$p[1] => (float) $p[2]])->all();
    }

    /** @return list<string> */
    private function jsList(string $source, string $name): array
    {
        $this->assertSame(1, preg_match('/export const '.$name.' = \[(.*?)\]/s', $source, $m), "{$name} not found");
        preg_match_all("/'([a-z-]+)'/", $m[1], $items);

        return $items[1];
    }

    public function test_the_ambient_modes_are_the_ones_ambient_js_plays(): void
    {
        $periods = $this->jsObject($this->js('ambient.js'), 'PERIOD_S');

        $this->assertSame(LayerAmbient::MODES, ['none', ...array_keys($periods)]);
    }

    public function test_the_camera_vocabulary_and_move_durations_match_camera_js(): void
    {
        $js = $this->js('camera.js');

        $this->assertSame(ShotCamera::MOVES, $this->jsList($js, 'CAMERA_MOVES'));
        $this->assertSame(ShotCamera::ENTRIES, $this->jsList($js, 'CAMERA_ENTRIES'));
        $this->assertSame(ShotCamera::EASES, $this->jsList($js, 'CAMERA_EASES'));
        $this->assertEquals(ShotCamera::MOVE_DURATION, $this->jsObject($js, 'MOVE_DURATION_S'));
    }

    public function test_a_stored_camera_is_cleaned_to_the_vocabulary(): void
    {
        $this->assertNull(ShotCamera::payload(null));
        $this->assertNull(ShotCamera::payload(['move' => 'hold']));
        $this->assertNull(ShotCamera::payload(['move' => 'spin']));
        $this->assertSame(
            ['move' => 'pull', 'amount' => 0.0, 'duration' => 30.0, 'ease' => 'move', 'delay' => 10.0],
            ShotCamera::payload(['move' => 'pull', 'amount' => -1, 'duration' => 99, 'ease' => 'wobbly', 'delay' => 60]),
        );
        $this->assertNull(ShotCamera::entry('fade'));   // the default travels as absence
        $this->assertSame('slide', ShotCamera::entry('slide'));
        $this->assertNull(ShotCamera::entry('explode'));
    }
}
