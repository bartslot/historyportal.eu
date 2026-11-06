<?php

declare(strict_types=1);

namespace Tests\Unit;

use Symfony\Component\Finder\Finder;
use Tests\TestCase;

/** One slider across the wizard (Figma 1471:2104): every range input is the panel slider, in its wrapper. */
class WizardSliderTest extends TestCase
{
    public function test_every_wizard_slider_is_the_panel_slider_in_its_wrapper(): void
    {
        $files = Finder::create()->files()->name('*.blade.php')->in([
            resource_path('views/components/lesson'),
            resource_path('views/components/ui'),
            resource_path('views/livewire/wizard'),
        ]);

        foreach ($files as $file) {
            $html = $file->getContents();
            $this->assertStringNotContainsString('range-xs', $html, "{$file->getRelativePathname()} has a bare DaisyUI slider");

            preg_match_all('/<input\b(?:[^>"\']|"[^"]*"|\'[^\']*\')*?type="range"/', $html, $inputs, PREG_OFFSET_CAPTURE);
            foreach ($inputs[0] as [, $at]) {
                $this->assertStringContainsString('range-panel-knob', substr($html, max(0, $at - 400), 400), "{$file->getRelativePathname()} has a slider with no drawn knob at byte {$at}");
            }
        }
    }
}
