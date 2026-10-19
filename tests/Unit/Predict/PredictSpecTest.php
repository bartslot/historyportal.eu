<?php

declare(strict_types=1);

namespace Tests\Unit\Predict;

use App\Services\Lessons\PredictSpec;
use PHPUnit\Framework\TestCase;

class PredictSpecTest extends TestCase
{
    public function test_a_raw_moment_is_cleaned_capped_and_clamped(): void
    {
        $p = PredictSpec::normalize([
            'question' => '  <i>What</i> happens? ',
            'mode' => 'hologram',
            'seconds' => 9999,
            'rubric' => [
                'key_cause' => str_repeat('x', 400),
                'concepts' => ['salt', ['nested'], 'soil', 1, 2, 3, 4, 5, 6, 7],
                'misconceptions' => 'not a list',
                'levels' => ['2' => 'Names the salt.'],
            ],
            'evil' => 'dropped',
        ]);

        $this->assertSame('What happens?', $p['question']);
        $this->assertSame('paper', $p['mode']);
        $this->assertSame(PredictSpec::SECONDS_MAX, $p['seconds']);
        $this->assertSame(300, mb_strlen($p['rubric']['key_cause']));
        $this->assertCount(PredictSpec::CONCEPTS_MAX, $p['rubric']['concepts']);
        $this->assertSame([], $p['rubric']['misconceptions']);
        $this->assertArrayNotHasKey('evil', $p);
        $this->assertSame('Names the salt.', PredictSpec::levelText($p, 2));
        $this->assertSame(PredictSpec::LEVELS[3], PredictSpec::levelText($p, 3));
        $this->assertSame(PredictSpec::SECONDS_DEFAULT, PredictSpec::normalize([])['seconds']);
    }

    public function test_the_player_copy_has_no_rubric_and_grading_needs_a_key_cause(): void
    {
        $p = PredictSpec::normalize(['question' => 'Q', 'rubric' => ['key_cause' => 'Salt.']]);

        $this->assertArrayNotHasKey('rubric', PredictSpec::forPlayer($p));
        $this->assertTrue(PredictSpec::canGrade($p));
        $this->assertFalse(PredictSpec::canGrade(PredictSpec::normalize([])));
    }

    public function test_weaving_puts_a_moment_after_each_asking_narration_brief_at_most_four(): void
    {
        $asks = fn (string $q) => ['kind' => 'narration', 'beat' => $q, 'predict' => ['question' => $q]];
        $briefs = [
            $asks('a'), $asks('b'), ['kind' => 'game', 'predict' => ['question' => 'not on a game']],
            ['kind' => 'narration', 'predict' => ['question' => '']],
            $asks('c'), $asks('d'), $asks('e'),
        ];

        $woven = PredictSpec::weaveIntoBriefs($briefs);

        $moments = array_values(array_filter($woven, fn ($b) => ($b['game_type'] ?? null) === 'predict'));
        $this->assertSame(['a', 'b', 'c', 'd'], array_map(fn ($b) => $b['predict']['question'], $moments));
        $this->assertSame('predict', $woven[1]['game_type']);
        $this->assertCount(count($briefs) + 4, $woven);
        foreach ($woven as $brief) {
            $this->assertTrue(! isset($brief['predict']) || ($brief['game_type'] ?? null) === 'predict');
        }
    }
}
