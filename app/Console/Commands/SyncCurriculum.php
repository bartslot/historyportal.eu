<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Mail\CurriculumChangedMail;
use App\Models\CurriculumGoal;
use App\Services\Curriculum\OfficialCurriculum;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Pull the curriculum from the government's own publications and apply what changed (Bart,
 * 2026-10-17). Weekly from routes/console.php.
 *
 * Safety: a change is applied only when the source still has the shape we expect (kerndoelen 36-47
 * all present, at least 50 Canon windows). Anything else (a kerndoel added or removed, a page we can
 * no longer read) is NOT applied but mailed to the admin, because that needs a person. Nothing is
 * ever deleted, so lesson links survive. Kerndoel titles are our own short labels and stay.
 */
class SyncCurriculum extends Command
{
    protected $signature = 'curriculum:sync {--dry-run : Report what would change, write nothing}';

    protected $description = 'Pull kerndoelen and the Canon from the official sources and apply changes';

    private const KERNDOELEN = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47'];

    private const MIN_CANON_WINDOWS = 50;

    private const FINGERPRINTS = 'curriculum/syllabus-fingerprints.json';

    /** @var list<string> */
    private array $changes = [];

    /** @var list<string> */
    private array $problems = [];

    public function handle(OfficialCurriculum $official): int
    {
        // The command object is reused within one process (the scheduler, tests): start clean.
        $this->changes = [];
        $this->problems = [];

        $this->attempt('kerndoelen', fn () => $this->syncKerndoelen($official));
        $this->attempt('canon', fn () => $this->syncCanon($official));
        $this->attempt('syllabus', fn () => $this->watchSyllabus($official));

        foreach ($this->changes as $line) {
            $this->line('changed: '.$line);
        }
        foreach ($this->problems as $line) {
            $this->warn('needs a person: '.$line);
        }
        if ($this->changes === [] && $this->problems === []) {
            $this->info('Curriculum is up to date with the official sources.');
        }

        $this->report();

        return $this->problems === [] ? self::SUCCESS : self::FAILURE;
    }

    private function syncKerndoelen(OfficialCurriculum $official): void
    {
        $texts = $official->parseKerndoelen($official->lawXml());
        // array keys like "36" come back as ints, so compare as strings.
        $codes = array_map('strval', array_keys($texts));
        sort($codes);

        if ($codes !== self::KERNDOELEN) {
            $this->problems[] = 'kerndoelen mens en maatschappij are now numbered '.implode(', ', $codes)
                .' instead of 36-47: check '.OfficialCurriculum::LAW_URL.' and update resources/curriculum/nl-vo.php by hand.';

            return;
        }

        foreach ($texts as $code => $body) {
            $this->apply(
                CurriculumGoal::query()->firstWhere(['type' => 'kerndoel', 'code' => (string) $code]),
                ['body' => $body, 'source_url' => OfficialCurriculum::LAW_URL],
                "Kerndoel {$code}",
            );
        }
    }

    private function syncCanon(OfficialCurriculum $official): void
    {
        $windows = $official->parseCanon($official->canonHtml());

        if (count($windows) < self::MIN_CANON_WINDOWS) {
            $this->problems[] = 'the Canon page lists '.count($windows).' windows (expected at least '.self::MIN_CANON_WINDOWS.'): the page layout may have changed.';

            return;
        }

        $sort = (int) CurriculumGoal::query()->max('sort');
        foreach ($windows as $window) {
            $values = [
                'title' => $window['title'],
                'period' => $window['period'],
                'source_url' => $official->canonUrl($window['slug']),
            ];
            $goal = CurriculumGoal::query()->firstWhere(['type' => 'canonvenster', 'code' => $window['code']]);

            if ($goal === null) {
                $this->changes[] = "Canonvenster {$window['code']} is new: {$window['title']}";
                if (! $this->option('dry-run')) {
                    CurriculumGoal::query()->create($values + [
                        'type' => 'canonvenster', 'code' => $window['code'], 'sort' => ++$sort,
                        'slug' => CurriculumGoal::slugFor('canonvenster', $window['code']),
                    ]);
                }

                continue;
            }

            // Renumbering would silently move lesson links onto another window: a person decides.
            if ($goal->title !== $window['title'] && $goal->lessons()->exists()) {
                $this->problems[] = "Canonvenster {$window['code']} is now '{$window['title']}' (was '{$goal->title}') and has lessons linked: check the links.";

                continue;
            }

            $this->apply($goal, $values, "Canonvenster {$window['code']}");
        }
    }

    /** Kenmerkende aspecten live in a PDF: alert when the syllabus for an exam year appears or changes. */
    private function watchSyllabus(OfficialCurriculum $official): void
    {
        $disk = Storage::disk('local');
        $known = $disk->exists(self::FINGERPRINTS) ? (array) json_decode($disk->get(self::FINGERPRINTS), true) : [];
        $year = (int) now()->year;

        foreach ([$year, $year + 1, $year + 2] as $examYear) {
            $fingerprint = $official->syllabusFingerprint($examYear);
            if ($fingerprint === null || ($known[$examYear] ?? null) === $fingerprint) {
                continue;
            }

            $verb = isset($known[$examYear]) ? 'changed' : 'is published';
            $this->problems[] = "the vwo history syllabus for exam year {$examYear} {$verb}: check its list of kenmerkende aspecten against resources/curriculum/nl-vo.php ({$official->syllabusUrl($examYear)}).";
            $known[$examYear] = $fingerprint;
        }

        if (! $this->option('dry-run')) {
            $disk->put(self::FINGERPRINTS, json_encode($known, JSON_PRETTY_PRINT));
        }
    }

    /** @param  array<string, string|null>  $values */
    private function apply(?CurriculumGoal $goal, array $values, string $label): void
    {
        if ($goal === null) {
            $this->problems[] = "{$label} is missing from the database: run curriculum:import.";

            return;
        }

        $changed = array_keys(array_filter($values, fn ($value, string $field) => $goal->{$field} !== $value, ARRAY_FILTER_USE_BOTH));
        if ($changed === []) {
            return;
        }

        $this->changes[] = "{$label}: ".implode(', ', $changed);
        if (! $this->option('dry-run')) {
            $goal->update($values);
        }
    }

    private function attempt(string $source, callable $step): void
    {
        try {
            $step();
        } catch (Throwable $e) {
            $this->problems[] = "{$source}: could not read the official source ({$e->getMessage()}).";
            Log::warning('[curriculum:sync] '.$source.' failed', ['error' => $e->getMessage()]);
        }
    }

    private function report(): void
    {
        $to = (string) config('services.alerts.email', '');
        if (($this->changes === [] && $this->problems === []) || $to === '' || $this->option('dry-run')) {
            return;
        }

        Mail::to($to)->send(new CurriculumChangedMail($this->changes, $this->problems));
    }
}
