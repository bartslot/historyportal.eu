<?php

declare(strict_types=1);

namespace Tests\Unit\Lessons;

use App\Services\Lessons\LibraryLayers;
use PHPUnit\Framework\TestCase;

/** Library backdrops are never dimmed by the player's shade; only ink drawings are letterboxed. */
class LibraryLayersBackdropConfigTest extends TestCase
{
    public function test_a_painted_plate_fills_the_frame_unshaded(): void
    {
        $this->assertSame(['backdrop_shade' => false], LibraryLayers::backdropConfig('history-line/backdrops/tasman/deck_sea_day'));
    }

    public function test_line_art_is_unshaded_and_shown_whole(): void
    {
        $this->assertSame(LibraryLayers::LINE_ART_CONFIG, LibraryLayers::backdropConfig('history-line/backdrops/dante/study'));
    }

    public function test_other_pictures_keep_the_player_default(): void
    {
        $this->assertSame([], LibraryLayers::backdropConfig('paintings/nightwatch'));
    }
}
