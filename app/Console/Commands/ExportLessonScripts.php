<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Lesson;
use App\Models\Scene;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;

/**
 * Every narration script we have, in one markdown file, for reading patterns across lessons.
 *
 * A command rather than a one-off dump because the interesting question is not "what did we write"
 * but "what do we keep writing" — and that answer changes every time a lesson is generated. It also
 * carries the numbers that make a pattern visible: words per scene, and words per SECOND of
 * narration, which is the one that says whether a scene is rushed or dawdling.
 */
final class ExportLessonScripts extends Command
{
    protected $signature = 'lessons:export-scripts
                            {--out= : Where to write. Defaults to storage/app/exports/lesson-scripts.md}
                            {--status=* : Only these lesson statuses (repeatable)}
                            {--min-scenes=1 : Skip lessons with fewer narrated scenes than this}
                            {--real : Drop QA and [test] lessons, which duplicate real ones and skew every average}
                            {--dedupe : One lesson per title — the most recently touched copy}
                            {--since= : Only lessons created on or after this date, e.g. 2026-07-31}';

    protected $description = 'Write every lesson narration script to one markdown file for analysis';

    public function handle(): int
    {
        $out = (string) ($this->option('out') ?: storage_path('app/exports/lesson-scripts.md'));
        @mkdir(dirname($out), 0775, true);

        $lessons = Lesson::query()
            ->when($this->option('since'), fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($this->option('status'), fn ($q, $s) => $q->whereIn('status', (array) $this->option('status')))
            ->orderByRaw("case when status = 'published' then 0 when status = 'previewable' then 1 else 2 end")
            ->orderBy('title')
            ->get();

        $scenesByLesson = Scene::query()
            ->whereIn('lesson_id', $lessons->pluck('id'))
            ->whereNotNull('script_segment')
            ->where('script_segment', '<>', '')
            ->orderBy('lesson_id')->orderBy('order')
            ->get(['id', 'lesson_id', 'order', 'kind', 'game_type', 'year', 'location',
                'duration_seconds', 'script_segment'])
            ->groupBy('lesson_id');

        if ($this->option('real')) {
            // The corpus carries [test] and QA copies — "The Flood of 1953" appears three times with
            // identical word counts. Left in, every average is really an average of how often a
            // lesson was duplicated for a test run.
            $lessons = $lessons->reject(fn (Lesson $l): bool => (bool) preg_match('/^\[test\]|\bQA\b/i', (string) $l->title));
        }

        if ($this->option('dedupe')) {
            // Same title, different code, identical scripts: the corpus carries "The Flood of 1953
            // and the Delta Works" three times. Keep the copy touched most recently.
            $lessons = $lessons->sortByDesc('updated_at')->unique(
                fn (Lesson $l): string => mb_strtolower(trim(preg_replace('/^\[test\]\s*/i', '', (string) $l->title)))
            )->values();
        }

        $min = max(1, (int) $this->option('min-scenes'));
        $lessons = $lessons->filter(fn (Lesson $l): bool => ($scenesByLesson[$l->id] ?? collect())->count() >= $min);

        if ($lessons->isEmpty()) {
            $this->error('No lessons matched.');

            return self::FAILURE;
        }

        // Only the scenes of the lessons that SURVIVED the filters — counting them all here
        // reported 1,464 scenes for an export that contained 1,330, which is the kind of number
        // someone then quotes.
        $kept = $lessons->flatMap(fn (Lesson $l) => $scenesByLesson[$l->id] ?? collect());

        $md = $this->render($lessons, $scenesByLesson);
        file_put_contents($out, $md);

        $this->info(sprintf(
            '%d lessons, %d scenes, %s words → %s',
            $lessons->count(),
            $kept->count(),
            number_format($kept->sum(fn (Scene $s): int => $this->words($s->script_segment))),
            $out,
        ));

        return self::SUCCESS;
    }

    /**
     * The database actually connected to.
     *
     * Not `config(...database)`: something sets the connection at runtime for worktree isolation,
     * so the config said `laravel` while the live PDO was on `lp_dev_vscript`. An export that
     * names the wrong source is worse than one that names none.
     */
    private function connectedDatabase(): string
    {
        try {
            return (string) \Illuminate\Support\Facades\DB::selectOne('select current_database() d')->d;
        } catch (\Throwable) {
            return (string) config('database.connections.'.config('database.default').'.database');
        }
    }

    /** `status` is a backed enum on the model and a string in the query — read it either way. */
    private function statusOf(Lesson $lesson): string
    {
        $status = $lesson->status;

        return $status instanceof \BackedEnum ? (string) $status->value : (string) $status;
    }

    /** Words, counted the same way for every language: runs of non-space. */
    private function words(?string $text): int
    {
        $trimmed = trim((string) $text);

        return $trimmed === '' ? 0 : count(preg_split('/\s+/u', $trimmed) ?: []);
    }

    private function render(Collection $lessons, Collection $scenesByLesson): string
    {
        $rows = [];
        $allWordCounts = [];
        $kinds = [];

        foreach ($lessons as $lesson) {
            $scenes = $scenesByLesson[$lesson->id] ?? collect();
            $words = $scenes->sum(fn (Scene $s): int => $this->words($s->script_segment));
            $seconds = $scenes->sum(fn (Scene $s): int => (int) ($s->duration_seconds ?? 0));

            foreach ($scenes as $scene) {
                $allWordCounts[] = $this->words($scene->script_segment);
                $key = $scene->kind === 'game' ? 'game:'.($scene->game_type ?? '?') : (string) $scene->kind;
                $kinds[$key] = ($kinds[$key] ?? 0) + 1;
            }

            $rows[] = [
                'lesson' => $lesson,
                'scenes' => $scenes,
                'count' => $scenes->count(),
                'words' => $words,
                'avg' => $scenes->count() ? (int) round($words / $scenes->count()) : 0,
                'wps' => $seconds > 0 ? round($words / $seconds, 2) : null,
            ];
        }

        sort($allWordCounts);
        arsort($kinds);

        $out = [];
        $out[] = '# Lesson narration scripts';
        $out[] = '';
        $out[] = sprintf(
            'Every `scenes.script_segment` in `%s`. %d lessons, %d narrated scenes, %s words.',
            $this->connectedDatabase(),
            count($rows),
            count($allWordCounts),
            number_format(array_sum($allWordCounts)),
        );
        $out[] = '';
        $out[] = 'Regenerate with `php artisan lessons:export-scripts`. Published lessons come first,';
        $out[] = 'then previewable, then everything else — the drafts are noisier and worth reading second.';
        $out[] = '';

        $out[] = '## Shape of the corpus';
        $out[] = '';
        $out[] = sprintf('- **Words per scene** — shortest %d, median %d, longest %d.',
            $allWordCounts[0] ?? 0,
            $allWordCounts[intdiv(count($allWordCounts), 2)] ?? 0,
            end($allWordCounts) ?: 0);
        $out[] = '- **Scene kinds** — '.collect($kinds)->map(fn ($n, $k) => "$k ($n)")->implode(', ').'.';
        $out[] = '- **Words per second** is in the table below. Narration sits near 2.5 words/second;';
        $out[] = '  far under that is a scene holding a picture too long, far over is one nobody can follow.';
        $out[] = '';

        $out[] = '## Lessons';
        $out[] = '';
        $out[] = '| Lesson | Code | Status | Grade | Scenes | Words | Avg/scene | Words/sec |';
        $out[] = '|---|---|---|---|--:|--:|--:|--:|';
        foreach ($rows as $r) {
            $out[] = sprintf('| %s | `%s` | %s | %s | %d | %s | %d | %s |',
                str_replace('|', '\\|', (string) $r['lesson']->title),
                $r['lesson']->lesson_code ?? '—',
                $this->statusOf($r['lesson']),
                $r['lesson']->grade_level ?? '—',
                $r['count'],
                number_format($r['words']),
                $r['avg'],
                $r['wps'] === null ? '—' : number_format((float) $r['wps'], 2),
            );
        }
        $out[] = '';
        $out[] = '---';
        $out[] = '';

        foreach ($rows as $r) {
            $lesson = $r['lesson'];
            $out[] = sprintf('## %s', $lesson->title);
            $out[] = '';
            $meta = array_filter([
                $lesson->lesson_code ? '`'.$lesson->lesson_code.'`' : null,
                $this->statusOf($lesson),
                $lesson->subject,
                $lesson->grade_level ? 'grade '.$lesson->grade_level : null,
                $lesson->tone,
                $r['count'].' scenes',
                number_format($r['words']).' words',
                $r['wps'] === null ? null : $r['wps'].' words/sec',
            ]);
            $out[] = implode(' · ', $meta);
            $out[] = '';

            foreach ($r['scenes'] as $scene) {
                $head = array_filter([
                    '#'.$scene->order,
                    $scene->kind === 'game' ? 'game/'.($scene->game_type ?? '?') : $scene->kind,
                    $scene->year,
                    $scene->location,
                    $scene->duration_seconds ? $scene->duration_seconds.'s' : null,
                    $this->words($scene->script_segment).'w',
                ]);
                $out[] = '### '.implode(' · ', $head);
                $out[] = '';
                $out[] = trim((string) $scene->script_segment);
                $out[] = '';
            }

            $out[] = '---';
            $out[] = '';
        }

        return implode("\n", $out)."\n";
    }
}
