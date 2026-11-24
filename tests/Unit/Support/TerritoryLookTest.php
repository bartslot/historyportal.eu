<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\TerritoryLook;
use PHPUnit\Framework\TestCase;

class TerritoryLookTest extends TestCase
{
    public function test_border_style_takes_the_four_styles_and_nothing_else(): void
    {
        foreach (['ink', 'solid', 'dashed', 'wavy'] as $style) {
            $this->assertSame($style, TerritoryLook::clean('border_style', $style));
        }
        $this->assertNull(TerritoryLook::clean('border_style', 'dotted'));
    }

    public function test_an_old_scene_without_a_border_style_draws_ink(): void
    {
        $this->assertSame('ink', TerritoryLook::from(['border_width' => 3])['border_style']);
        $this->assertSame('wavy', TerritoryLook::from(['border_style' => 'wavy'])['border_style']);
    }

    public function test_border_width_goes_up_to_twelve(): void
    {
        $this->assertSame(12.0, TerritoryLook::clean('border_width', 12));
        $this->assertSame(12.0, TerritoryLook::clean('border_width', 40));
    }
}
