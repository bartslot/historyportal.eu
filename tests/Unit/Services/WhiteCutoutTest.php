<?php

declare(strict_types=1);

namespace Tests\Unit\Services;

use App\Services\Support\WhiteCutout;
use GdImage;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * A figure drawn with a strong black outline on light paper loses the paper around it, whatever
 * light colour the paper is, and keeps the paper INSIDE its outline (a face, a robe).
 */
class WhiteCutoutTest extends TestCase
{
    /** A 200x200 sheet of $paper with a black-outlined figure: a ring whose inside is also $paper. */
    private function figureOn(array $paper): string
    {
        $img = imagecreatetruecolor(200, 200);
        imagefill($img, 0, 0, imagecolorallocate($img, ...$paper));
        imagesetthickness($img, 6);
        imageellipse($img, 100, 100, 120, 120, imagecolorallocate($img, 10, 10, 10));

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

    /** @return array<string, array{0: array{int,int,int}}> */
    public static function papers(): array
    {
        return [
            'white' => [[255, 255, 255]],
            'pale yellow (our image generator)' => [[250, 240, 200]],
            'pale blue' => [[220, 232, 245]],
        ];
    }

    #[DataProvider('papers')]
    public function test_the_paper_around_the_figure_goes_and_the_paper_inside_stays(array $paper): void
    {
        $out = WhiteCutout::apply($this->figureOn($paper));

        $this->assertNotNull($out);
        $this->assertSame(127, $this->alphaAt($out, 5, 5), 'corner paper is transparent');
        $this->assertSame(127, $this->alphaAt($out, 100, 20), 'paper just outside the outline is transparent');
        $this->assertSame(0, $this->alphaAt($out, 100, 100), 'paper inside the outline stays');
        $this->assertSame(0, $this->alphaAt($out, 100, 40), 'the ink stays');
    }

    public function test_a_photo_whose_edge_is_not_mostly_one_light_colour_is_left_alone(): void
    {
        $img = imagecreatetruecolor(200, 200);
        mt_srand(7);
        for ($y = 0; $y < 200; $y += 4) {
            for ($x = 0; $x < 200; $x += 4) {
                imagefilledrectangle($img, $x, $y, $x + 3, $y + 3, imagecolorallocate($img, mt_rand(0, 255), mt_rand(0, 255), mt_rand(0, 255)));
            }
        }

        $this->assertNull(WhiteCutout::apply($this->png($img)));
    }

    public function test_a_dark_background_is_left_alone(): void
    {
        $this->assertNull(WhiteCutout::apply($this->figureOn([15, 23, 42])));
    }
}
