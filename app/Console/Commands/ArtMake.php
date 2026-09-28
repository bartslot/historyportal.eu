<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Art\FalBudgetExceeded;
use App\Services\Art\FalImageService;
use App\Services\Art\FalLedger;
use App\Services\Art\HistoryLineStyle;
use App\Services\Art\LineClean;
use App\Services\CommonsImageService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Builds a reusable asset pack from a manifest (resources/art/manifests/<name>.php) into the
 * shared library: <library>/<collection>/<category>/<subcategory>/<slug>.webp. Idempotent: an
 * output that exists is skipped unless --force. Always --dry-run first: it prints the plan and
 * makes no HTTP call. Publish the result with `icons:import`.
 */
class ArtMake extends Command
{
    protected $signature = 'art:make
        {manifest : name in resources/art/manifests}
        {--only= : comma list of sheet names / plate or conversion slugs}
        {--force : rewrite outputs that already exist (from the kept raw when there is one)}
        {--regenerate : call fal again even when a raw image for the job is kept}
        {--dry-run : print the plan and stop, no HTTP}
        {--max-usd=6 : cap for this run}';

    protected $description = 'Generate a history-line asset pack (sheets, plates, conversions) from a manifest';

    private const SHEET_SIZE = [4096, 4096];

    private const PLATE_SIZE = [2560, 1440];

    private const SOURCE_WIDTH = 2560;

    private string $manifestName;

    private array $manifest;

    private FalImageService $fal;

    private FalLedger $ledger;

    private LineClean $lineClean;

    private CommonsImageService $commons;

    public function handle(FalImageService $fal, FalLedger $ledger, LineClean $lineClean, CommonsImageService $commons): int
    {
        // Nano Banana Pro returns 5504x3072 plates; GD needs ~70 MB per copy, and the default
        // 128M died SILENTLY (exit 255, no message) after the paid call. Local CLI tool only.
        ini_set('memory_limit', '1G');
        [$this->fal, $this->ledger, $this->lineClean, $this->commons] = [$fal, $ledger, $lineClean, $commons];
        $this->manifestName = (string) $this->argument('manifest');
        $path = rtrim((string) config('art.manifests_path'), '/')."/{$this->manifestName}.php";
        if (! preg_match('/^[a-z0-9_-]+$/i', $this->manifestName) || ! is_file($path)) {
            $this->error("No manifest at {$path}.");

            return self::FAILURE;
        }
        $this->manifest = require $path;

        $jobs = $this->jobs();
        $this->printPlan($jobs);
        if ($this->option('dry-run')) {
            return self::SUCCESS;
        }

        $missing = array_filter($this->anchors(), fn (string $p) => ! is_file($p));
        if ($missing !== []) {
            $this->error('Style anchors missing: '.implode(', ', $missing));

            return self::FAILURE;
        }

        $this->fal->capRun((float) $this->option('max-usd'));

        return $this->runJobs(array_filter($jobs, fn (array $job) => ! $job['skip']));
    }

    /** @return list<array{kind: string, name: string, def: array, outputs: array<string, string>, refs: int, skip: bool}> */
    private function jobs(): array
    {
        $only = array_filter(array_map('trim', explode(',', (string) $this->option('only'))));
        $jobs = [];
        foreach ((array) ($this->manifest['sheets'] ?? []) as $sheet) {
            $jobs[] = $this->job('sheet', $sheet['name'], $sheet, array_keys($sheet['items']), 2);
        }
        foreach ((array) ($this->manifest['plates'] ?? []) as $plate) {
            $jobs[] = $this->job('plate', $plate['slug'], $plate, [$plate['slug']], 2 + count($plate['sources'] ?? []));
        }
        foreach ((array) ($this->manifest['conversions'] ?? []) as $conversion) {
            $jobs[] = $this->job('conversion', $conversion['slug'], $conversion, [$conversion['slug']], 3);
        }

        return array_values(array_filter($jobs, fn (array $job) => $only === [] || in_array($job['name'], $only, true)));
    }

    private function job(string $kind, string $name, array $def, array $slugs, int $refs): array
    {
        $dir = rtrim((string) config('art.library_path'), '/')
            ."/{$this->manifest['collection']}/{$def['category']}/{$def['subcategory']}";
        $outputs = [];
        foreach ($slugs as $slug) {
            $outputs[$slug] = "{$dir}/{$slug}.webp";
        }
        $skip = ! $this->option('force') && array_filter($outputs, fn (string $p) => ! is_file($p)) === [];
        // A raw image was paid for: cleanup re-runs from it for free unless --regenerate.
        $raw = rtrim((string) config('art.raw_path'), '/')."/{$this->manifestName}/{$name}.png";
        $reuse = ! $this->option('regenerate') && is_file($raw);

        return compact('kind', 'name', 'def', 'outputs', 'refs', 'skip', 'raw', 'reuse');
    }

    private function printPlan(array $jobs): void
    {
        $model = (string) config('art.models.edit');
        $total = 0.0;
        $rows = array_map(function (array $job) use ($model, &$total): array {
            $action = match (true) {
                $job['skip'] => 'skip',
                $job['reuse'] => 'reuse raw',
                default => 'run',
            };
            $usd = $action === 'run' ? $this->fal->estimate($model) : 0.0;
            $total += $usd;

            return [$job['kind'], $job['name'], count($job['outputs']), $job['refs'], sprintf('$%.2f', $usd), $action];
        }, $jobs);

        $this->table(['kind', 'name', 'outputs', 'refs', 'est. USD', 'action'], $rows);
        $this->line(sprintf('Total: $%.2f   Run cap: $%.2f   Budget left: $%.2f of $%.2f',
            $total, (float) $this->option('max-usd'), $this->ledger->remainingUsd(), (float) config('art.budget_usd')));
    }

    private function runJobs(array $jobs): int
    {
        $credits = [];
        foreach ($jobs as $job) {
            try {
                $credit = match ($job['kind']) {
                    'sheet' => $this->makeSheet($job),
                    'plate' => $this->makePlate($job),
                    'conversion' => $this->makeConversion($job),
                };
                $credits += $credit;
                $this->info("done {$job['kind']} {$job['name']}");
            } catch (FalBudgetExceeded $e) {
                $this->error("Stopped: {$e->getMessage()}");
                break;
            } catch (\Throwable $e) {
                $this->error("failed {$job['kind']} {$job['name']}: {$e->getMessage()}");
            }
        }
        $this->writeCredits($credits);

        return self::SUCCESS;
    }

    /** @return array<string, array> credits (none for a sheet) */
    private function makeSheet(array $job): array
    {
        $def = $job['def'];
        if (! preg_match('/^([1-9])x([1-9])$/', (string) $def['grid'], $m) || (int) $m[1] * (int) $m[2] !== count($def['items'])) {
            throw new RuntimeException("grid {$def['grid']} does not fit ".count($def['items']).' items');
        }
        [$rows, $cols] = [(int) $m[1], (int) $m[2]];
        $prompt = HistoryLineStyle::sheet(array_values($def['items']), $rows, $cols,
            (string) $def['era'], (string) $def['place'], figures: (bool) ($def['figures'] ?? false));

        $raw = $job['reuse'] ? $this->readRaw($job) : $this->generate($job, $prompt, array_values($this->anchors()), self::SHEET_SIZE);
        $cells = $this->lineClean->slice($raw, $rows, $cols, 0.02);
        $this->lineClean->lastSliceWarning === ''
            ? $this->line("{$job['name']}: cut per detected figure")
            : $this->warn("{$job['name']}: {$this->lineClean->lastSliceWarning}");
        foreach (array_keys($def['items']) as $i => $slug) {
            $path = $job['outputs'][$slug];
            if ($this->option('force') || ! is_file($path)) {
                $closed = (array) (($def['cut_off'] ?? [])[$slug] ?? []);
                $this->writeWebp($path, $this->lineClean->cutout($cells[$i], closed: $closed), self::MAX_EDGE_CUTOUT);
            }
        }

        return [];
    }

    private function makePlate(array $job): array
    {
        if ($job['reuse']) {
            // Sources and credits were fetched on the paid run; credits.json already holds them.
            $this->finishPlate($job, $this->readRaw($job));

            return [];
        }
        $def = $job['def'];
        $sources = array_map(fn (string $ref) => $this->source($ref), (array) ($def['sources'] ?? []));
        $prompt = HistoryLineStyle::plate((string) $def['prompt'], (string) ($def['constraints'] ?? ''));
        $refs = [...array_values($this->anchors()), ...array_column($sources, 'bytes')];

        $this->finishPlate($job, $this->generate($job, $prompt, $refs, self::PLATE_SIZE));

        return $sources === [] ? [] : [$def['slug'] => array_map(fn (array $s) => $s['credit'], $sources)];
    }

    private function makeConversion(array $job): array
    {
        if ($job['reuse']) {
            $this->finishPlate($job, $this->readRaw($job));

            return [];
        }
        $def = $job['def'];
        $source = $this->source((string) $def['source']);
        $prompt = HistoryLineStyle::convert((string) ($def['constraints'] ?? ''));

        $this->finishPlate($job, $this->generate($job, $prompt, [$source['bytes'], ...array_values($this->anchors())], self::PLATE_SIZE));

        return [$def['slug'] => [$source['credit']]];
    }

    private function finishPlate(array $job, string $raw): void
    {
        $this->writeWebp($job['outputs'][$job['def']['slug']], $this->lineClean->plate($raw), self::MAX_EDGE_PLATE);
    }

    /** One fal call; the raw output is kept for audit. */
    private function generate(array $job, string $prompt, array $refs, array $size): string
    {
        $bytes = $this->fal->edit((string) config('art.models.edit'), $prompt, $refs, $size[0], $size[1],
            "art-{$job['kind']}", ['command' => 'art:make', 'manifest' => $this->manifestName, 'job' => $job['name']]);

        File::ensureDirectoryExists(dirname($job['raw']));
        file_put_contents($job['raw'], $bytes);

        return $bytes;
    }

    private function readRaw(array $job): string
    {
        $this->line("reusing raw {$job['raw']}");

        return (string) file_get_contents($job['raw']);
    }

    /**
     * A 'commons:<File>' reference, downloaded only when its licence allows sending it to fal.
     *
     * @return array{bytes: string, credit: array{source: string, credit: string, license: string}}
     */
    private function source(string $ref): array
    {
        if (! str_starts_with($ref, 'commons:')) {
            throw new RuntimeException("unknown source '{$ref}' (only commons:<File> is supported)");
        }
        $file = substr($ref, strlen('commons:'));
        $meta = $this->commons->fileMeta($file);
        if ($meta === null) {
            throw new RuntimeException("source refused: '{$file}' not found on Commons or not freely licensed");
        }
        if (config('art.source_filter') !== 'off' && ! self::isPublicDomain((string) $meta['license'])) {
            throw new RuntimeException("source refused: '{$file}' is {$meta['license']}, not public domain / CC0");
        }
        $bytes = Http::withHeaders(['User-Agent' => 'LearningPortal/1.0 (thelearningportal.us)'])
            ->timeout(60)->get($meta['image_url'], ['width' => self::SOURCE_WIDTH])->throw()->body();

        return ['bytes' => $bytes, 'credit' => [
            'source' => $file,
            'credit' => trim(($meta['artist'] ?? null) ?: 'Unknown artist').', via Wikimedia Commons',
            'license' => (string) $meta['license'],
        ]];
    }

    /** Only a licence that STARTS with Public domain / PD / CC0 ('not public domain' is not one). */
    public static function isPublicDomain(string $license): bool
    {
        return (bool) preg_match('/^(public domain|PD\b|PD-|CC0)/i', trim($license));
    }

    /** Longest edge a library file keeps: the 1920 stage (Bart: "no more 2400+ scaled images"). */
    private const MAX_EDGE_PLATE = \App\Services\Support\WebpEncoder::MAX_SIDE;

    /** Cut-outs never fill more than ~75% of the stage height. */
    private const MAX_EDGE_CUTOUT = 1600;

    private function writeWebp(string $path, string $png, int $maxEdge): void
    {
        $img = @imagecreatefromstring($png);
        if ($img === false) {
            throw new RuntimeException('cleaned image could not be decoded');
        }
        imagepalettetotruecolor($img);
        $img = $this->capEdge($img, $maxEdge);
        imagealphablending($img, false);
        imagesavealpha($img, true);
        File::ensureDirectoryExists(dirname($path));
        if (! imagewebp($img, $path, \App\Services\Support\WebpEncoder::UPLOAD_QUALITY)) {
            throw new RuntimeException("could not write {$path}");
        }
    }

    private function capEdge(\GdImage $img, int $maxEdge): \GdImage
    {
        $long = max(imagesx($img), imagesy($img));
        if ($long <= $maxEdge) {
            return $img;
        }
        $scale = $maxEdge / $long;
        $out = imagecreatetruecolor((int) round(imagesx($img) * $scale), (int) round(imagesy($img) * $scale));
        imagealphablending($out, false);
        imagesavealpha($out, true);
        imagecopyresampled($out, $img, 0, 0, 0, 0, imagesx($out), imagesy($out), imagesx($img), imagesy($img));

        return $out;
    }

    /** @param  array<string, list<array>>  $credits */
    private function writeCredits(array $credits): void
    {
        if ($credits === []) {
            return;
        }
        $path = rtrim((string) config('art.library_path'), '/')."/{$this->manifest['collection']}/credits.json";
        $all = is_file($path) ? (array) json_decode((string) file_get_contents($path), true) : [];
        $all = array_merge($all, $credits);
        ksort($all);
        File::ensureDirectoryExists(dirname($path));
        file_put_contents($path, json_encode($all, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n");
    }

    /** @return array{people: string, environment: string} */
    private function anchors(): array
    {
        return (array) config('art.anchors');
    }
}
