<?php

declare(strict_types=1);

namespace Tests\Unit\Lessons;

use App\Services\Lessons\SceneLinks;
use PHPUnit\Framework\TestCase;

class SceneLinksTest extends TestCase
{
    public function test_links_keep_known_scenes_and_clean_words(): void
    {
        $clean = SceneLinks::clean([
            ['label' => " Board\n the <i>galley</i> ", 'to' => '7'],
            ['label' => 'Somewhere else', 'to' => 99],
            'junk',
            ['label' => 'Pick later'],
        ], [7, 8]);

        $this->assertSame([
            ['label' => 'Board the galley', 'to' => 7],
            ['label' => 'Somewhere else', 'to' => null],
            ['label' => 'Pick later', 'to' => null],
        ], $clean);
        $this->assertSame([], SceneLinks::clean('nope', [1]));
    }

    public function test_a_scene_shows_at_most_six_choices(): void
    {
        $this->assertCount(SceneLinks::MAX_LINKS, SceneLinks::clean(array_fill(0, 9, ['label' => 'x', 'to' => 1]), [1]));
    }

    public function test_no_links_and_no_ending_leave_the_config_as_it_was(): void
    {
        $this->assertSame(['a' => 1], SceneLinks::into(['a' => 1, 'links' => [['label' => 'x', 'to' => 1]], 'ending' => true], [], false));
        $this->assertSame(['ending' => true], SceneLinks::into(null, [], true));
    }
}
