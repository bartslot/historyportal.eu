<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Art\FalBudgetExceeded;
use App\Services\Art\FalImageService;
use App\Services\Art\FalLedger;
use App\Services\Art\HistoryLineStyle;
use Illuminate\Console\Command;

/**
 * Same inputs through every candidate fal model, side by side in one index.html, so Bart can
 * pick the history-line model on what it draws rather than on price. Always dry-run first:
 * --dry-run prints the plan and makes no HTTP call.
 */
class ArtBakeoff extends Command
{
    protected $signature = 'art:bakeoff
        {--models= : comma list, default config art.bakeoff_models}
        {--tests=A,B,C : which tests to run}
        {--source= : image for Test A (default resources/art/bakeoff/source.jpg)}
        {--anchors-only : generate style-anchor candidates instead of the bake-off}
        {--dry-run : print the plan and stop, no HTTP}
        {--max-usd=2 : cap for this run}';

    protected $description = 'Compare candidate fal models on the history-line style (A convert, B helmet sheet, C figure sheet)';

    private const ANCHOR_CANDIDATES = 4;

    private const HELMETS = [
        'kettle hat', 'great helm', 'bascinet with aventail', 'cervelliera skullcap', 'nasal helm',
        'cervelliera with mail coif', 'kettle hat with chin strap', 'great helm side view', 'padded arming cap',
    ];

    private const FIGURES = [
        'Florentine citizen in long lucco and cap', 'infantry soldier with spear and shield',
        'young scribe with codex', 'cavalryman on foot holding helmet',
    ];

    private const SCORES = [
        'A' => ['composition preservation', 'silhouette fidelity', 'no hatching', 'no shading', 'line clarity', 'people detail', 'architecture detail', 'quiet background'],
        'B' => ['isolation', 'white background', 'closed silhouette', 'no hatching', 'historical form', 'consistency across cells', 'usable region separation', 'style match'],
        'C' => ['anatomy', 'hands/feet', 'consistent line language', 'clean outer contour', 'usable colour regions'],
    ];

    public function handle(FalImageService $fal, FalLedger $ledger): int
    {
        $plan = $this->option('anchors-only') ? $this->anchorPlan() : $this->bakeoffPlan();
        if ($plan === null) {
            return self::FAILURE;
        }

        $this->printPlan($plan, $fal, $ledger);
        if ($this->option('dry-run')) {
            return self::SUCCESS;
        }

        $missing = array_filter($this->anchors(), fn (string $path) => ! is_file($path));
        if ($missing !== [] && ! $this->option('anchors-only')) {
            $this->error('Style anchors missing (T0.5): '.implode(', ', $missing));

            return self::FAILURE;
        }

        return $this->runPlan($plan, $fal->capRun((float) $this->option('max-usd')));
    }

    /** @return list<array<string, mixed>>|null */
    private function bakeoffPlan(): ?array
    {
        $source = (string) ($this->option('source') ?: resource_path('art/bakeoff/source.jpg'));
        $tests = array_intersect(array_map('trim', explode(',', strtoupper((string) $this->option('tests')))), ['A', 'B', 'C']);
        if (in_array('A', $tests, true) && ! is_file($source)) {
            $this->error("Test A source image not found: {$source}");

            return null;
        }
        $anchors = array_values($this->anchors());

        $plan = [];
        foreach ($this->models() as $model) {
            foreach ($tests as $test) {
                $plan[] = ['model' => $model, 'test' => $test] + match ($test) {
                    'A' => ['prompt' => HistoryLineStyle::convert(), 'refs' => [$source, ...$anchors], 'w' => 2560, 'h' => 1440],
                    'B' => ['prompt' => HistoryLineStyle::sheet(self::HELMETS, 3, 3, 'c. 1289', 'Tuscany, Italy'), 'refs' => $anchors, 'w' => 4096, 'h' => 4096],
                    'C' => ['prompt' => HistoryLineStyle::sheet(self::FIGURES, 2, 2, 'c. 1300', 'Florence', figures: true), 'refs' => $anchors, 'w' => 4096, 'h' => 4096],
                };
            }
        }

        return $plan;
    }

    /** Text-to-image candidates for the two style anchors, when Figma has none (T0.5). */
    private function anchorPlan(): array
    {
        $subjects = [
            'people' => ['a sheet of 4 medieval figures with equipment', 2048, 2048],
            'environment' => ['a street with buildings, trees and hills', 2560, 1440],
        ];
        $plan = [];
        foreach ($subjects as $anchor => [$subject, $w, $h]) {
            for ($i = 1; $i <= self::ANCHOR_CANDIDATES; $i++) {
                $plan[] = [
                    'model' => (string) config('art.models.generate'), 'test' => "anchor-{$anchor}-{$i}",
                    'prompt' => HistoryLineStyle::BASE.' '.ucfirst($subject).'. '.HistoryLineStyle::SAFETY,
                    'refs' => [], 'w' => $w, 'h' => $h,
                ];
            }
        }

        return $plan;
    }

    private function printPlan(array $plan, FalImageService $fal, FalLedger $ledger): void
    {
        $total = 0.0;
        $rows = array_map(function (array $row) use ($fal, &$total) {
            try {
                $usd = $fal->estimate($row['model']);
                $total += $usd;
                $cost = sprintf('$%.3f', $usd);
            } catch (FalBudgetExceeded) {
                $cost = 'no price: skipped';
            }

            return [$row['model'], $row['test'], count($row['refs']), "{$row['w']}x{$row['h']}", $cost];
        }, $plan);

        $this->table(['model', 'test', 'refs', 'size', 'est. USD'], $rows);
        $this->line(sprintf('Total: $%.2f   Run cap: $%.2f   Budget left: $%.2f of $%.2f',
            $total, (float) $this->option('max-usd'), $ledger->remainingUsd(), (float) config('art.budget_usd')));

        $missing = array_filter($this->anchors(), fn (string $path) => ! is_file($path));
        if ($missing !== [] && ! $this->option('anchors-only')) {
            $this->warn('Style anchors not in place yet (T0.5), a real run will refuse: '.implode(', ', array_keys($missing)));
        }
    }

    private function runPlan(array $plan, FalImageService $fal): int
    {
        $dir = storage_path('app/bakeoff/'.now()->format('Ymd_His'));
        if (! is_dir($dir) && ! mkdir($dir, 0775, true) && ! is_dir($dir)) {
            $this->error("Cannot create {$dir}");

            return self::FAILURE;
        }

        $results = [];
        foreach ($plan as $row) {
            $file = $row['test'].'_'.str_replace(['/', '.'], ['_', '-'], $row['model']).'.png';
            try {
                $meta = ['command' => 'art:bakeoff'];
                $bytes = $row['refs'] === []
                    ? $fal->generate($row['model'], $row['prompt'], $row['w'], $row['h'], 'anchor', $meta)
                    : $fal->edit($row['model'], $row['prompt'], $row['refs'], $row['w'], $row['h'], 'bakeoff', $meta);
                file_put_contents("{$dir}/{$file}", $bytes);
                $results[] = $row + ['file' => $file];
                $this->info("✓ {$row['test']} {$row['model']}");
            } catch (FalBudgetExceeded $e) {
                $results[] = $row + ['error' => $e->getMessage()];
                $this->warn("skipped {$row['test']} {$row['model']}: {$e->getMessage()}");
            } catch (\Throwable $e) {
                $results[] = $row + ['error' => $e->getMessage()];
                $this->error("✗ {$row['test']} {$row['model']}: {$e->getMessage()}");
            }
        }

        file_put_contents("{$dir}/index.html", $this->indexHtml($results));
        $this->line("Open {$dir}/index.html");

        return self::SUCCESS;
    }

    private function indexHtml(array $results): string
    {
        $e = fn (string $s) => htmlspecialchars($s, ENT_QUOTES);
        $models = array_values(array_unique(array_column($results, 'model')));
        $html = '<!doctype html><meta charset="utf-8"><title>history-line bake-off</title>'
            .'<style>body{font:14px system-ui;margin:16px}table{border-collapse:collapse;width:100%}'
            .'td,th{border:1px solid #ccc;padding:6px;vertical-align:top}img{width:100%}</style>'
            .'<table><tr><th>test</th>'.implode('', array_map(fn ($m) => '<th>'.$e($m).'</th>', $models)).'</tr>';

        foreach (array_unique(array_column($results, 'test')) as $test) {
            $html .= '<tr><th>'.$e($test).'</th>';
            foreach ($models as $model) {
                $hit = collect($results)->first(fn ($r) => $r['test'] === $test && $r['model'] === $model);
                $html .= '<td>'.match (true) {
                    $hit === null => '',
                    isset($hit['file']) => '<img src="'.$e($hit['file']).'">',
                    default => '<em>'.$e((string) $hit['error']).'</em>',
                }.'</td>';
            }
            $html .= '</tr>';

            foreach (self::SCORES[$test] ?? [] as $criterion) {
                $html .= '<tr><td>'.$e($criterion).'</td>'.str_repeat('<td></td>', count($models)).'</tr>';
            }
        }

        return $html.'</table>';
    }

    /** @return list<string> */
    private function models(): array
    {
        $option = (string) $this->option('models');

        return $option !== ''
            ? array_values(array_filter(array_map('trim', explode(',', $option))))
            : (array) config('art.bakeoff_models');
    }

    /** @return array{people: string, environment: string} */
    private function anchors(): array
    {
        return (array) config('art.anchors');
    }
}
