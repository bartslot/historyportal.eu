<?php

declare(strict_types=1);

namespace Tests\Unit\Lessons;

use App\Services\Lessons\LibraryLayers;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

class LibraryLayersSpeaksTest extends TestCase
{
    public function test_a_single_speaker_takes_its_mouth_from_the_figure(): void
    {
        $this->assertSame(['dante' => null], LibraryLayers::speaksIn(['speaks' => 'dante']));
        $this->assertSame([], LibraryLayers::speaksIn(['asset' => 'x']));
        $this->assertSame([], LibraryLayers::speaksIn(['speaks' => '']));
    }

    public function test_a_group_picture_gives_each_speaker_its_own_mouth(): void
    {
        $this->assertSame([
            'bootsman' => ['mouth' => [0.3, 0.2], 'facing' => -1],
            'matroos' => ['mouth' => [1.0, 0.0], 'facing' => 0],
        ], LibraryLayers::speaksIn(['speaks' => [
            'bootsman' => [0.3, 0.2, 'left'],
            'matroos' => [1.4, -0.1],
        ]]));
    }

    public function test_a_speaker_without_a_mouth_is_refused(): void
    {
        $this->expectException(InvalidArgumentException::class);
        LibraryLayers::speaksIn(['speaks' => ['bootsman' => 'left']]);
    }
}
