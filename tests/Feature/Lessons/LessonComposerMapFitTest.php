<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Models\Scene;
use App\Models\User;
use App\Services\LessonComposer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A map block that pins its own places frames those places, not its polity: Italy in 1295 framed
 * half of Europe and stacked Campaldino, Firenze and Siena on one blot.
 */
class LessonComposerMapFitTest extends TestCase
{
    use RefreshDatabase;

    private function composeMap(array $spec): Scene
    {
        $lesson = app(LessonComposer::class)->build([
            'key' => 'Map fit test',
            'scenes' => [['type' => 'map', 'script' => 'Toscana.', 'year' => 1289, ...$spec]],
        ], User::factory()->create(), narrate: false);

        return $lesson->scenes()->firstOrFail();
    }

    public function test_a_map_with_labels_fits_its_labels_and_keeps_the_polity(): void
    {
        $scene = $this->composeMap([
            'qid' => 'Q38',
            'labels' => [['Firenze', 11.2558, 43.7696], ['Siena', 11.3308, 43.3188]],
        ]);

        $this->assertSame('labels', $scene->config['fit']);
        $this->assertSame('Q38', $scene->config['qid']);   // borders still draw
        $this->assertCount(2, $scene->config['annotations']);
    }

    public function test_a_map_without_labels_keeps_the_polity_fit(): void
    {
        $scene = $this->composeMap(['qid' => 'Q38']);

        $this->assertArrayNotHasKey('fit', $scene->config);
        $this->assertSame('Q38', $scene->config['qid']);
    }
}
