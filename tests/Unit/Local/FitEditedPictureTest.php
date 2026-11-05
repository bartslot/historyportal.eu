<?php

declare(strict_types=1);

namespace Tests\Unit\Local;

use App\Services\Local\FitEditedPicture;
use App\Services\Local\LocalChatGpt;
use PHPUnit\Framework\TestCase;

class FitEditedPictureTest extends TestCase
{
    private array $files = [];

    protected function tearDown(): void
    {
        array_map('unlink', $this->files);
    }

    private function save(\GdImage $im): string
    {
        $path = tempnam(sys_get_temp_dir(), 'fit').'.png';
        imagepng($im, $path);

        return $this->files[] = $path;
    }

    /** A w x h picture, `bg` behind a block from (x0,y0) to (x1,y1). bg null: see-through. */
    private function pic(int $w, int $h, ?int $bg, array $block): string
    {
        $im = imagecreatetruecolor($w, $h);
        imagealphablending($im, false);
        imagesavealpha($im, true);
        imagefilledrectangle($im, 0, 0, $w, $h, $bg === null ? imagecolorallocatealpha($im, 0, 0, 0, 127) : $bg);
        imagefilledrectangle($im, ...[...$block, imagecolorallocatealpha($im, 200, 90, 40, 0)]);

        return $this->save($im);
    }

    private function alphaAt(\GdImage $im, int $x, int $y): int
    {
        return (imagecolorat($im, $x, $y) >> 24) & 0x7F;
    }

    public function test_a_cut_out_comes_back_in_its_own_frame_on_its_feet(): void
    {
        $old = $this->pic(100, 200, null, [30, 20, 70, 199]);
        $new = $this->pic(400, 600, null, [100, 50, 300, 500]);   // bigger, with a margin under the feet

        $fit = imagecreatefromstring(FitEditedPicture::fit($old, $new));

        $this->assertSame([100, 200], [imagesx($fit), imagesy($fit)]);
        $this->assertLessThan(64, $this->alphaAt($fit, 50, 198), 'the feet stand where the old feet stood');
        $this->assertLessThan(64, $this->alphaAt($fit, 50, 25), 'the top reaches the old top');
        $this->assertGreaterThan(64, $this->alphaAt($fit, 50, 5), 'above it stays see-through');
    }

    public function test_a_cut_out_back_on_white_paper_loses_the_paper_but_not_white_inside_it(): void
    {
        $old = $this->pic(100, 100, null, [20, 20, 80, 80]);
        $im = imagecreatetruecolor(100, 100);
        $white = imagecolorallocate($im, 255, 255, 255);
        imagefilledrectangle($im, 0, 0, 99, 99, $white);
        imagefilledrectangle($im, 20, 20, 80, 80, imagecolorallocate($im, 200, 90, 40));
        imagefilledrectangle($im, 45, 45, 55, 55, $white);   // a white shirt, enclosed

        $fit = imagecreatefromstring(FitEditedPicture::fit($old, $this->save($im)));

        $this->assertGreaterThan(64, $this->alphaAt($fit, 2, 2), 'the paper is gone');
        $this->assertLessThan(64, $this->alphaAt($fit, 50, 50), 'the shirt stays');
    }

    public function test_a_painting_fills_its_frame_and_is_never_stretched(): void
    {
        $old = $this->pic(200, 100, 0x808080, [0, 0, 1, 1]);
        $new = $this->pic(200, 200, 0x404040, [0, 0, 1, 1]);

        $fit = imagecreatefromstring(FitEditedPicture::fit($old, $new));

        $this->assertSame([200, 100], [imagesx($fit), imagesy($fit)]);
        $this->assertSame(0, $this->alphaAt($fit, 100, 50));
    }

    public function test_the_reply_is_the_last_message_without_its_token_count(): void
    {
        $this->assertSame('The answer.', LocalChatGpt::replyOf("thinking\ncodex\nfirst\ncodex\nThe answer.\ntokens used: 12\n34"));
        $this->assertSame('No marker.', LocalChatGpt::replyOf('No marker.'));
    }

    public function test_a_cut_out_back_on_green_loses_the_green_and_its_fringe(): void
    {
        $old = $this->pic(100, 100, null, [20, 20, 80, 99]);
        $im = imagecreatetruecolor(100, 100);
        imagefilledrectangle($im, 0, 0, 99, 99, imagecolorallocate($im, 0, 255, 0));
        imagefilledrectangle($im, 20, 20, 80, 98, imagecolorallocate($im, 240, 235, 220));   // a pale shirt, the white route's weak spot
        imagefilledrectangle($im, 15, 40, 19, 60, imagecolorallocate($im, 130, 200, 110));   // an edge with green spill on it
        imagefilledrectangle($im, 45, 45, 55, 55, imagecolorallocate($im, 255, 255, 255));   // white inside stays

        $fit = imagecreatefromstring(FitEditedPicture::fit($old, $this->save($im)));

        $this->assertGreaterThan(120, $this->alphaAt($fit, 2, 2), 'the green is gone');
        $this->assertSame(0, $this->alphaAt($fit, 50, 50), 'white inside the figure stays');
        $this->assertSame(0, $this->alphaAt($fit, 30, 70), 'pale cloth stays');
        $c = imagecolorat($fit, 50, 95);
        $this->assertLessThanOrEqual(max(($c >> 16) & 0xFF, $c & 0xFF), ($c >> 8) & 0xFF, 'no green left in the figure');
    }

    public function test_green_mixed_into_the_figure_takes_the_colour_around_it(): void
    {
        $old = $this->pic(100, 100, null, [20, 20, 80, 99]);
        $im = imagecreatetruecolor(100, 100);
        imagefilledrectangle($im, 0, 0, 99, 99, imagecolorallocate($im, 0, 255, 0));
        imagefilledrectangle($im, 20, 20, 80, 98, imagecolorallocate($im, 190, 130, 70));     // hair
        imagefilledrectangle($im, 30, 30, 31, 70, imagecolorallocate($im, 190, 205, 50));     // a yellow sliver: too little green for the key
        imagefilledrectangle($im, 50, 40, 54, 52, imagecolorallocate($im, 120, 150, 60));     // an olive patch, wider than one step
        imagefilledrectangle($im, 65, 30, 65, 70, imagecolorallocate($im, 10, 33, 1));        // a line gone dark green

        $fit = imagecreatefromstring(FitEditedPicture::fit($old, $this->save($im)));

        foreach ([[30, 50], [31, 50], [50, 45], [52, 46], [54, 45], [65, 50]] as [$x, $y]) {
            $c = imagecolorat($fit, $x, $y);
            $this->assertLessThan(6, (($c >> 8) & 0xFF) - max(($c >> 16) & 0xFF, $c & 0xFF), "green left at $x,$y");
            $this->assertSame(0, $this->alphaAt($fit, $x, $y), "a hole at $x,$y");
        }
    }

    public function test_a_half_keyed_pixel_keeps_its_see_through_but_takes_the_figures_colour(): void
    {
        $old = $this->pic(100, 100, null, [20, 20, 80, 99]);
        $im = imagecreatetruecolor(100, 100);
        imagefilledrectangle($im, 0, 0, 99, 99, imagecolorallocate($im, 0, 255, 0));
        imagefilledrectangle($im, 20, 20, 80, 98, imagecolorallocate($im, 190, 130, 70));
        imagefilledrectangle($im, 30, 30, 31, 70, imagecolorallocate($im, 130, 200, 40));     // left olive once the green is capped

        $fit = imagecreatefromstring(FitEditedPicture::fit($old, $this->save($im)));

        $c = imagecolorat($fit, 30, 50);
        $this->assertGreaterThan(160, ($c >> 16) & 0xFF, 'the hair colour, not olive');
        $this->assertLessThan(150, ($c >> 8) & 0xFF, 'the hair colour, not olive');
        $this->assertGreaterThan(0, $c >> 24, 'still partly see-through');
    }

    public function test_a_thin_line_with_green_on_both_sides_loses_its_tint_too(): void
    {
        $old = $this->pic(100, 100, null, [20, 20, 80, 99]);
        $im = imagecreatetruecolor(100, 100);
        imagefilledrectangle($im, 0, 0, 99, 99, imagecolorallocate($im, 0, 255, 0));
        imagefilledrectangle($im, 30, 20, 80, 98, imagecolorallocate($im, 200, 190, 180));
        imagefilledrectangle($im, 22, 30, 22, 90, imagecolorallocate($im, 20, 55, 10));       // a stray hair: nothing clean beside it

        $fit = imagecreatefromstring(FitEditedPicture::fit($old, $this->save($im)));

        for ($y = 0; $y < 100; $y++) {
            for ($x = 0; $x < 100; $x++) {
                $c = imagecolorat($fit, $x, $y);
                if (($c >> 24) < 100) {
                    $this->assertLessThan(6, (($c >> 8) & 0xFF) - max(($c >> 16) & 0xFF, $c & 0xFF), "green left at $x,$y");
                }
            }
        }
    }

    public function test_a_grey_line_is_not_taken_for_green(): void
    {
        $old = $this->pic(100, 100, null, [20, 20, 80, 99]);
        $im = imagecreatetruecolor(100, 100);
        imagefilledrectangle($im, 0, 0, 99, 99, imagecolorallocate($im, 0, 255, 0));
        imagefilledrectangle($im, 20, 20, 80, 98, imagecolorallocate($im, 240, 235, 220));
        imagefilledrectangle($im, 40, 30, 41, 70, imagecolorallocate($im, 30, 30, 30));

        $fit = imagecreatefromstring(FitEditedPicture::fit($old, $this->save($im)));

        $c = imagecolorat($fit, 40, 50);
        $this->assertLessThan(60, ($c >> 16) & 0xFF, 'the line stays dark');
    }

    public function test_a_figure_with_no_green_in_it_keeps_every_pixel_when_keyed(): void
    {
        $old = $this->pic(40, 40, 0x808080, [0, 0, 1, 1]);
        $new = $this->pic(40, 40, 0x705040, [0, 0, 1, 1]);

        $fit = imagecreatefromstring(FitEditedPicture::fit($old, $new));

        $this->assertSame(0, $this->alphaAt($fit, 20, 20));
    }
}
