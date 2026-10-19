<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Scene;
use App\Services\Lessons\PredictSpec;
use App\Services\Predict\NamePseudonymizer;
use App\Services\Predict\PredictionGrader;
use Illuminate\Console\Command;
use Throwable;

/**
 * Before a predict moment goes live (plan §3.4): run its gold set through the live grader (JEV on the
 * moment's rubric) and print how often it agrees with the gold levels (Bart's; his ties win).
 *
 * The gold set is a JSON list of {"text": "...", "level": 0-3}, about 40 answers, default
 * storage/app/predict/gold-{scene}.json. Names are replaced exactly as in a live grade.
 * Calls JEV once per answer; nothing is written to the database.
 */
class PredictCalibrate extends Command
{
    protected $signature = 'predict:calibrate
        {scene : The predict scene id}
        {--gold= : Path to the gold set JSON (default storage/app/predict/gold-{scene}.json)}
        {--show : Print every answer with both levels}';

    protected $description = 'Grade a predict moment\'s gold set with the live grader and print the agreement';

    public function handle(PredictionGrader $grader): int
    {
        $scene = Scene::where('game_type', 'predict')->find((int) $this->argument('scene'));
        if (! $scene) {
            $this->error('No predict scene with that id.');

            return self::FAILURE;
        }
        $predict = PredictSpec::normalize((array) (($scene->config ?? [])['predict'] ?? []));
        if (! PredictSpec::canGrade($predict)) {
            $this->error('This moment has no key cause: write its rubric first.');

            return self::FAILURE;
        }
        $path = (string) ($this->option('gold') ?: storage_path("app/predict/gold-{$scene->id}.json"));
        $gold = is_file($path) ? json_decode((string) file_get_contents($path), true) : null;
        if (! is_array($gold) || $gold === []) {
            $this->error("No gold set at {$path} (a JSON list of {\"text\", \"level\"}).");

            return self::FAILURE;
        }

        $names = NamePseudonymizer::make();
        $keep = $scene->lesson ? NamePseudonymizer::lessonWords($scene->lesson, $predict) : [];
        $matrix = array_fill(0, 4, array_fill(0, 4, 0));
        $exact = $close = $graded = $unsure = $failed = 0;
        $minConfidence = (float) config('predict.min_confidence', 0.6);
        $rows = [];
        foreach ($gold as $i => $item) {
            $text = trim((string) ($item['text'] ?? ''));
            $want = $item['level'] ?? null;
            if ($text === '' || ! is_numeric($want) || ! array_key_exists((int) $want, PredictSpec::LEVELS)) {
                $this->warn('Skipped gold row '.($i + 1).': needs a text and a level 0-3.');

                continue;
            }
            try {
                $grade = $grader->grade($predict, $names->replace($text, [], $keep, (string) ($scene->lesson?->language ?: 'en'))['text']);
            } catch (Throwable $e) {
                $failed++;
                $rows[] = [$i + 1, (int) $want, 'failed', '', mb_strimwidth($text, 0, 60, '…')];

                continue;
            }
            $got = $grade['level'];
            $graded++;
            $matrix[(int) $want][$got]++;
            $exact += (int) ($got === (int) $want);
            $close += (int) (abs($got - (int) $want) <= 1);
            $unsure += (int) ($grade['confidence'] < $minConfidence);
            $rows[] = [$i + 1, (int) $want, $got, number_format($grade['confidence'], 2), mb_strimwidth($text, 0, 60, '…')];
        }

        if ($this->option('show')) {
            $this->table(['#', 'gold', 'JEV', 'confidence', 'answer'], $rows);
        }
        $this->table(['gold \\ JEV', '0', '1', '2', '3'], array_map(fn (int $l) => [$l, ...$matrix[$l]], array_keys($matrix)));
        $pct = fn (int $n) => $graded > 0 ? round($n / $graded * 100).'%' : '-';
        $this->info("Graded {$graded} of ".count($gold).". Exact agreement: {$pct($exact)}. Within one level: {$pct($close)}. "
            ."Below confidence {$minConfidence} (would be flagged): {$unsure}. Failed calls: {$failed}.");

        return $graded > 0 ? self::SUCCESS : self::FAILURE;
    }
}
