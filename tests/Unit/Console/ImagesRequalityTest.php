<?php

declare(strict_types=1);

namespace Tests\Unit\Console;

use App\Console\Commands\ImagesRequality;
use PHPUnit\Framework\TestCase;

class ImagesRequalityTest extends TestCase
{
    public function test_only_the_lesson_transform_gets_the_new_quality(): void
    {
        $new = 'f_auto,q_50,c_limit,w_2880,h_2880';
        $lesson = 'https://res.cloudinary.com/x/image/upload/f_auto,q_20,c_limit,w_2880,h_2880/v1/library/a.webp';
        $cover = 'https://res.cloudinary.com/x/image/upload/f_webp,q_60,c_limit,w_480/v1/lessons/1/cover.webp';
        $json = '{"backdrop":"'.$lesson.'","hold":{"ship":"/storage/x.webp"}}';

        $this->assertSame(str_replace('q_20', 'q_50', $lesson), ImagesRequality::rewrite($lesson, $new));
        $this->assertSame($cover, ImagesRequality::rewrite($cover, $new));
        $this->assertStringContainsString('q_50,c_limit,w_2880', ImagesRequality::rewrite($json, $new));
        $this->assertSame(ImagesRequality::rewrite($lesson, $new), ImagesRequality::rewrite(ImagesRequality::rewrite($lesson, $new), $new));
    }
}
