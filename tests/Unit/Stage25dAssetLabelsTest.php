<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

/** The Assets tab's filter shows a label per kind of picture: a kind without one shows its raw key to the teacher. */
class Stage25dAssetLabelsTest extends TestCase
{
    public function test_every_layer_kind_has_a_label(): void
    {
        $types = file_get_contents(__DIR__.'/../../engine-mvp/src/stage25d/types.ts');
        $this->assertSame(1, preg_match('/export type LayerKind = ([^\n]+)/', $types, $kinds));
        preg_match_all("/'([a-z_]+)'/", $kinds[1], $names);
        $this->assertNotEmpty($names[1]);

        $view = file_get_contents(__DIR__.'/../../resources/views/livewire/wizard/step3-scene-configurator.blade.php');
        $this->assertSame(1, preg_match('/labels: @js\(\[(.+?)\]\),/', $view, $labels));

        foreach ($names[1] as $kind) {
            $this->assertStringContainsString("'{$kind}' =>", $labels[1], "The Assets filter has no label for {$kind}");
        }
    }
}
