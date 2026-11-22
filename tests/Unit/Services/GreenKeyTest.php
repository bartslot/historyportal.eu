<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Services\Support\GreenKey;
use GdImage;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * A picture made on the green screen loses the whole range of the screen's greens, not only #00FF00 (Bart,
 * 2026-11-22), also between arm and body, and keeps its own muted greens. A picture not made on a screen is untouched.
 */
class GreenKeyTest extends TestCase
{
    /**
     * A 200x200 sheet of $screen with a brown figure (a filled disc) and a pocket of screen inside a ring next to it,
     * plus an olive patch in the figure: the colour painted grass and cloth get.
     */
    private function figureOn(array $screen): string
    {
        $img = imagecreatetruecolor(200, 200);
        imagefill($img, 0, 0, imagecolorallocate($img, ...$screen));
        imagefilledellipse($img, 70, 100, 80, 80, imagecolorallocate($img, 120, 80, 50));
        imagefilledrectangle($img, 60, 90, 80, 110, imagecolorallocate($img, 110, 130, 60));   // olive
        imagesetthickness($img, 8);
        imageellipse($img, 150, 100, 60, 60, imagecolorallocate($img, 120, 80, 50));         // the screen inside stays enclosed
        // a blended edge: half figure, half screen
        $mix = array_map(fn (int $a, int $b) => intdiv($a + $b, 2), [120, 80, 50], $screen);
        imagefilledrectangle($img, 110, 96, 111, 104, imagecolorallocate($img, ...$mix));
        imagefilledrectangle($img, 108, 96, 109, 104, imagecolorallocate($img, 120, 80, 50));

        return $this->png($img);
    }

    private function png(GdImage $img): string
    {
        ob_start();
        imagepng($img);

        return (string) ob_get_clean();
    }

    private function alphaAt(GdImage $img, int $x, int $y): int
    {
        return (imagecolorat($img, $x, $y) >> 24) & 0x7F;
    }

    private function spillAt(GdImage $img, int $x, int $y): int
    {
        $c = imagecolorat($img, $x, $y);

        return (($c >> 8) & 0xFF) - max(($c >> 16) & 0xFF, $c & 0xFF);
    }

    /** @return array<string, array{0: array{int,int,int}}> */
    public static function screens(): array
    {
        return [
            'pure #00FF00' => [[0, 255, 0]],
            'lighter screen' => [[60, 235, 70]],
            'bluer screen' => [[20, 220, 90]],
            'darker screen' => [[10, 205, 30]],
        ];
    }

    #[DataProvider('screens')]
    public function test_every_green_of_the_screen_goes_and_the_figure_stays(array $screen): void
    {
        $out = GreenKey::apply($this->figureOn($screen));

        $this->assertNotNull($out);
        $this->assertSame(127, $this->alphaAt($out, 5, 5), 'corner screen is clear');
        $this->assertSame(127, $this->alphaAt($out, 150, 100), 'screen enclosed by the ring is clear too');
        $this->assertSame(0, $this->alphaAt($out, 50, 100), 'the figure stays opaque');
        $this->assertSame(0, $this->alphaAt($out, 70, 100), 'olive paint in the figure stays');
        $this->assertGreaterThan(0, $this->spillAt($out, 70, 100), 'and keeps its green');
    }

    public function test_a_blended_edge_goes_part_clear_and_loses_its_green(): void
    {
        $out = GreenKey::apply($this->figureOn([0, 255, 0]));

        $alpha = $this->alphaAt($out, 110, 100);
        $this->assertGreaterThan(0, $alpha);
        $this->assertLessThan(127, $alpha);
        $this->assertLessThanOrEqual(0, $this->spillAt($out, 110, 100), 'no green halo');
    }

    /** @return array<string, array{0: array{int,int,int}}> */
    public static function grasses(): array
    {
        return [
            'muted grass' => [[90, 150, 60]],
            'bright painted grass' => [[60, 190, 50]],
        ];
    }

    #[DataProvider('grasses')]
    public function test_a_painting_with_a_green_field_is_left_alone(array $grass): void
    {
        $img = imagecreatetruecolor(100, 100);
        imagefill($img, 0, 0, imagecolorallocate($img, ...$grass));   // grass all the way to the edge
        imagefilledrectangle($img, 0, 0, 99, 30, imagecolorallocate($img, 150, 190, 230));   // sky

        $this->assertNull(GreenKey::apply($this->png($img)));
    }

    public function test_a_picture_that_is_already_a_cut_out_is_left_alone(): void
    {
        $img = imagecreatetruecolor(100, 100);
        imagealphablending($img, false);
        imagesavealpha($img, true);
        imagefill($img, 0, 0, imagecolorallocatealpha($img, 0, 255, 0, 127));

        $this->assertNull(GreenKey::apply($this->png($img)));
    }
}
