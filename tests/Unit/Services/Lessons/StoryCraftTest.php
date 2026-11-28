<?php

declare(strict_types=1);

namespace Tests\Unit\Services\Lessons;

use App\Services\Lessons\StoryCraft;
use PHPUnit\Framework\TestCase;

/** The history-story-writer rules as quick lesson creation's prompts read them. */
class StoryCraftTest extends TestCase
{
    public function test_the_age_comes_from_the_lessons_grade_level_and_is_never_assumed(): void
    {
        $this->assertSame(12, StoryCraft::age('Age 12'));
        $this->assertSame(8, StoryCraft::age(' age 8 '));
        $this->assertSame(12, StoryCraft::age('7th grade'));
        $this->assertNull(StoryCraft::age('groep 8'));
        $this->assertNull(StoryCraft::age(null));
        $this->assertNull(StoryCraft::age(''));
    }

    public function test_the_reading_rules_scale_with_the_class(): void
    {
        $this->assertStringContainsString('under 10 words', StoryCraft::readingRules('Age 6'));
        $this->assertStringContainsString('under 12 words', StoryCraft::readingRules('Age 10'));
        $this->assertStringContainsString('under 18 words', StoryCraft::readingRules('Age 12'));
        $this->assertStringContainsString('under 25 words', StoryCraft::readingRules('Age 16'));
        // a local school year names no age: the prompt follows it as written, it never picks 12
        $rules = StoryCraft::readingRules('groep 8');
        $this->assertStringContainsString('in groep 8', $rules);
        $this->assertStringNotContainsString('about 12', $rules);
        $this->assertStringContainsString('first language is not', StoryCraft::readingRules('Age 14'));
    }

    public function test_the_narration_and_critique_carry_the_word_and_truth_rules(): void
    {
        $rules = StoryCraft::narrationRules();
        $this->assertStringContainsString('HARD WORDS', $rules);
        $this->assertStringContainsString('LEGENDS stay legends', $rules);
        $this->assertStringContainsString('open question', $rules);
        $this->assertStringContainsString('cap it at 2', StoryCraft::critiqueRules());
        $this->assertStringContainsString('owns white', StoryCraft::castRules());
    }

    public function test_a_scene_dresses_its_own_people_in_their_signature_colours(): void
    {
        $outline = ['cast' => [
            ['name' => 'Beatrice Portinari', 'colour' => 'white', 'look' => 'girl, later a young woman'],
            ['name' => 'Dante Alighieri', 'colour' => 'red'],
            ['name' => 'Guido Cavalcanti', 'colour' => 'blue'],
            ['name' => '', 'colour' => 'green'],
        ]];

        $block = StoryCraft::castColours($outline, ['Dante', 'Beatrice Portinari']);
        $this->assertStringContainsString('- Beatrice Portinari: white (girl, later a young woman)', $block);
        $this->assertStringContainsString('- Dante Alighieri: red', $block);
        $this->assertStringNotContainsString('Guido', $block);

        // a brief that names nobody in the cast: the whole cast, so nobody borrows a colour
        $this->assertStringContainsString('Guido Cavalcanti: blue', StoryCraft::castColours($outline, ['a boatman']));
        $this->assertStringNotContainsString('green', StoryCraft::castColours($outline));
        $this->assertSame('', StoryCraft::castColours([], ['Dante']));
    }
}
