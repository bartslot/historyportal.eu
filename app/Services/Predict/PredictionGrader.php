<?php

declare(strict_types=1);

namespace App\Services\Predict;

use App\Services\Jev\JevClient;
use App\Services\Lessons\PredictSpec;
use App\Services\Llm\LlmRouter;
use App\Support\Locales;
use RuntimeException;

/**
 * Grades a WHY answer at a predict moment and writes its feedback (plan §2-3, Bart 2026-10-19):
 *
 *   1. JEV grades: one call, a choice question per thing to judge: the level (0-3 on the moment's
 *      rubric), which known misconception (or none), and per accepted concept whether it is there.
 *      JEV grades and chooses; it does not write.
 *   2. The small model (the `feedback` LLM role) writes 1-2 kind sentences in the lesson's language
 *      from JEV's level and the rubric. It does not re-grade.
 *
 * Both only ever see text with the names already replaced (NamePseudonymizer).
 */
final class PredictionGrader
{
    /** Longer than this is not "1-2 sentences" any more. */
    private const FEEDBACK_MAX = 400;

    public function __construct(
        private readonly JevClient $jev,
        private readonly LlmRouter $llm,
    ) {}

    /**
     * @param  array<string,mixed>  $predict  config.predict, normalized
     * @return array{level: int, concepts: list<string>, misconception: ?string, confidence: float}
     */
    public function grade(array $predict, string $answer): array
    {
        $rubric = $predict['rubric'];
        $questions = [
            'level' => [
                'instructions' => 'How well does the pupil explain WHY it happened? Pick the level that fits the answer best. '
                    .'Judge the reasoning, not the spelling or the language.',
                'criteria' => collect(PredictSpec::LEVELS)
                    ->mapWithKeys(fn ($_, int $level) => [(string) $level => PredictSpec::levelText($predict, $level)])
                    ->all(),
            ],
        ];
        $misconceptions = array_values(array_filter($rubric['misconceptions']));
        if ($misconceptions !== []) {
            $questions['misconception'] = [
                'instructions' => 'Does the answer give one of these known wrong causes as the reason?',
                'criteria' => ['none' => 'None of these: the answer does not give any of them as the cause.']
                    + collect($misconceptions)->mapWithKeys(fn (string $m, int $i) => ['m'.($i + 1) => $m])->all(),
            ];
        }
        $concepts = array_values(array_filter($rubric['concepts']));
        foreach ($concepts as $i => $concept) {
            $questions['concept_'.($i + 1)] = [
                'instructions' => "Does the answer use this idea, in any words: \"{$concept}\"?",
                'criteria' => ['yes' => 'Yes, the answer uses this idea.', 'no' => 'No, it does not.'],
            ];
        }

        $answers = $this->jev->choose($this->state($predict, $answer), $questions);

        $level = $answers['level']['choice'] ?? null;
        if (! is_numeric($level) || ! array_key_exists((int) $level, PredictSpec::LEVELS)) {
            throw new RuntimeException('JEV gave no level.');
        }
        $miss = (string) ($answers['misconception']['choice'] ?? 'none');
        $missIndex = str_starts_with($miss, 'm') ? (int) substr($miss, 1) - 1 : -1;

        return [
            'level' => (int) $level,
            'concepts' => array_values(array_filter($concepts, fn ($_, int $i) => ($answers['concept_'.($i + 1)]['choice'] ?? 'no') === 'yes', ARRAY_FILTER_USE_BOTH)),
            'misconception' => $misconceptions[$missIndex] ?? null,
            'confidence' => (float) ($answers['level']['confidence'] ?? 0),
        ];
    }

    /**
     * 1-2 kind sentences for the child, in the lesson's language. Strict JSON out, one retry.
     *
     * @param  array{level: int, concepts: list<string>, misconception: ?string}  $grade
     */
    public function feedback(array $predict, string $answer, array $grade, string $language): string
    {
        $client = $this->llm->for('feedback');
        $system = $this->feedbackSystem($language);
        $user = json_encode([
            'question' => $predict['debrief'],
            'what_happened' => $predict['outcome'],
            'answer' => $answer,
            'level' => $grade['level'],
            'level_meaning' => PredictSpec::levelText($predict, $grade['level']),
            'key_cause' => $predict['rubric']['key_cause'],
            'ideas_the_answer_used' => $grade['concepts'],
            'misconception_in_the_answer' => $grade['misconception'],
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);

        $lastError = null;
        foreach ([1, 2] as $attempt) {
            try {
                $text = $this->cleanFeedback($client->json($system, (string) $user, maxTokens: 300)['feedback'] ?? null);
                if ($text !== null) {
                    return $text;
                }
                $lastError = new RuntimeException('The feedback model wrote no usable feedback.');
            } catch (\Throwable $e) {
                $lastError = $e;
            }
        }

        throw $lastError;
    }

    /** "jev-latest + gpt-4o-mini": what made this grade, for the teacher and the calibration. */
    public function modelName(): string
    {
        return 'jev-latest+'.$this->llm->profileFor('feedback')->model;
    }

    private function state(array $predict, string $answer): string
    {
        $rubric = $predict['rubric'];

        return implode("\n", array_filter([
            'History Portal: a narrated history lesson for children aged 9 to 14. At a turning point the class predicted '
                .'what would happen; the story then showed it, and now a pupil explains why it happened.',
            'Question the pupil answered: '.$predict['debrief'],
            $predict['outcome'] !== '' ? 'What happened in the story: '.$predict['outcome'] : null,
            'The key cause (a level 2 answer names it): '.$rubric['key_cause'],
            array_filter($rubric['concepts']) !== [] ? 'Ideas that count, in any words: '.implode('; ', array_filter($rubric['concepts'])) : null,
            'Names in the answer are replaced by ids such as child_1a2b3c.',
            'The pupil\'s answer: "'.$answer.'"',
        ]));
    }

    private function feedbackSystem(string $language): string
    {
        $name = Locales::isSupported($language) ? Locales::name($language) : 'English';

        return <<<SYS
You write feedback for one child (aged 9 to 14) in a history lesson. The child explained WHY something
in the story happened. A grader has already judged the answer: you are given its level (0-3) and what
that level means. Do not grade again and never mention a level, a score or points.

Write 1 or 2 short sentences, in {$name}, that a child understands:
- kind and specific: say what is good in THIS answer, in plain words;
- if a misconception is given, name it gently (people at the time may have believed it) and say it was not the cause;
- below level 3, end with one small question that nudges towards the cause (never give the answer away);
- never shame, never exclamation marks on a mistake, no emoji, no em dashes;
- names appear as ids like child_1a2b3c: never invent a name; speak to the child as "you".

Return ONLY JSON: {"feedback": "..."}
SYS;
    }

    private function cleanFeedback(mixed $raw): ?string
    {
        if (! is_string($raw)) {
            return null;
        }
        $text = trim(preg_replace('/\s+/u', ' ', strip_tags($raw)) ?? '');

        return $text === '' ? null : mb_substr($text, 0, self::FEEDBACK_MAX);
    }
}
