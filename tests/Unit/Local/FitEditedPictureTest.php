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
}
