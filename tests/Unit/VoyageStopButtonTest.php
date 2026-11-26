<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\VoyageStopButton;
use PHPUnit\Framework\TestCase;

/** Bart, 2026-11-23: an empty voyage stop kept a button the class could click. */
class VoyageStopButtonTest extends TestCase
{
    public function test_an_empty_stop_has_no_button_even_with_a_title(): void
    {
        $this->assertFalse(VoyageStopButton::isOn([]));
        $this->assertFalse(VoyageStopButton::isOn(['gallery' => ['title' => 'Hormuz', 'story' => '  ', 'images' => []]]));
    }

    public function test_a_story_or_a_picture_turns_it_on(): void
    {
        $this->assertTrue(VoyageStopButton::isOn(['gallery' => ['story' => 'Schepen zonder spijkers.']]));
        $this->assertTrue(VoyageStopButton::isOn(['gallery' => ['images' => [['url' => '/a.jpg']]]]));
        $this->assertTrue(VoyageStopButton::isOn(['stop_images' => ['/pin.jpg']]));
        $this->assertFalse(VoyageStopButton::hasContent(['gallery' => ['images' => [['url' => '']]]]));
    }

    public function test_the_teacher_switch_wins(): void
    {
        $this->assertFalse(VoyageStopButton::isOn(['gallery' => ['story' => 'Iets', 'button' => false]]));
        $this->assertTrue(VoyageStopButton::isOn(['gallery' => ['title' => 'Hormuz', 'button' => true]]));
    }
}
