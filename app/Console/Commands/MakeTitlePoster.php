<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Support\LayerAmbient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;

/**
 * A series' comic title poster from its recipe: resources/lessons/titles/{group}.json in,
 * public/lesson-titles/{group}/ out (poster.json + letter SVGs + mask.svg + outlines.svg + the
 * pictures as WebP), the shape App\Support\TitlePoster and the player already read.
 *
 * This checks the recipe and names what is wrong; tools/titles/make_title.py (Python + fontTools +
 * Pillow) does the geometry. Run it locally and commit the output: SiteGround cannot run Python.
 *
 * A recipe with "layout": "cover" makes the Tintin-style cover instead (tools/titles/cover.py):
 * resources/lessons/titles/{group}-cover.json (--cover) into public/lesson-titles/{group}/cover/.
 *
 * A folder made by hand (Bart's Figma Tasman poster) is never overwritten: only a folder this
 * command wrote before, or a new one, is replaced. Use --out for a scratch copy.
 */
class MakeTitlePoster extends Command
{
    protected $signature = 'titles:make
        {group : the series translation_group, e.g. dante}
        {--cover : the cover recipe, resources/lessons/titles/{group}-cover.json}
        {--recipe= : recipe path (default resources/lessons/titles/{group}.json)}
        {--out= : output folder (default public/lesson-titles/{group}, a cover in its cover/ folder)}';

    protected $description = 'Generate a comic title poster from its recipe (local, Python)';

    private const TIMEOUT_S = 300;

    private const HEX = '/^#[0-9a-fA-F]{6}$/';

    public function handle(): int
    {
        $group = (string) $this->argument('group');
        if (! preg_match('/^[a-z0-9][a-z0-9-]*$/', $group)) {
            return $this->failWith("Group '{$group}' must be lowercase letters, digits and dashes.");
        }

        $recipePath = $this->option('recipe') ?: resource_path('lessons/titles/'.$group.($this->option('cover') ? '-cover' : '').'.json');

        if (! is_file($recipePath)) {
            return $this->failWith("No recipe at {$recipePath}.");
        }
        $recipe = json_decode((string) file_get_contents($recipePath), true);
        if (! is_array($recipe)) {
            return $this->failWith("{$recipePath} is not a JSON object: ".json_last_error_msg().'.');
        }

        $isCover = ($recipe['layout'] ?? null) === 'cover';
        $out = $this->option('out') ?: public_path("lesson-titles/{$group}".($isCover ? '/cover' : ''));

        $errors = $isCover ? self::coverProblems($recipe) : self::problems($recipe);
        if ($errors !== []) {
            $this->error("Recipe {$recipePath}:");
            foreach ($errors as $problem) {
                $this->error("  - {$problem}");
            }

            return self::FAILURE;
        }

        $existing = "{$out}/poster.json";
        if (is_file($existing) && ! str_starts_with((string) (json_decode((string) file_get_contents($existing), true)['source'] ?? ''), 'titles:make')) {
            return $this->failWith("{$out} holds a hand-made poster; it is never overwritten. Use --out for a copy.");
        }

        // Build into a fresh folder, then swap it in: no file of an older recipe is left behind.
        $tmp = storage_path('framework/cache/titles-'.$group.'-'.getmypid());
        File::deleteDirectory($tmp);
        $run = Process::timeout(self::TIMEOUT_S)->run([
            (string) config('art.python'), base_path('tools/titles/make_title.py'), $recipePath, $tmp, base_path(), $group,
        ]);
        if ($run->failed()) {
            File::deleteDirectory($tmp);

            return $this->failWith("Recipe {$recipePath}: ".trim($run->errorOutput() ?: $run->output()));
        }

        File::deleteDirectory($out);
        File::ensureDirectoryExists(dirname($out));
        File::copyDirectory($tmp, $out);   // copy, not rename: --out may sit on another volume
        File::deleteDirectory($tmp);

        $count = count(File::files($out));
        $this->info("Wrote {$count} files to {$out}.");

        return self::SUCCESS;
    }

    private function failWith(string $message): int
    {
        $this->error($message);

        return self::FAILURE;
    }

    /**
     * Everything wrong with a recipe, in words a person can act on. Empty when it is fine.
     *
     * @param  array<mixed>  $r
     * @return list<string>
     */
    public static function problems(array $r): array
    {
        $e = [];
        if (isset($r['layout']) && $r['layout'] !== 'cover') {
            $e[] = 'layout must be "cover" or left out (the comic poster).';
        }
        $file = fn (mixed $path): bool => is_string($path) && $path !== '' && ! str_contains($path, '..') && is_file(base_path($path));
        $positive = fn (mixed $n): bool => is_numeric($n) && (float) $n > 0;

        $letters = $r['letters'] ?? null;
        $sources = is_array($letters) ? array_intersect(array_keys($letters), ['wordmark', 'font']) : [];
        if (count($sources) !== 1) {
            $e[] = 'letters needs exactly one of "wordmark" (an SVG path) or "font" (a .ttf/.otf path).';
        } elseif (! $file($letters[reset($sources)])) {
            $e[] = 'letters.'.reset($sources)." file not found: {$letters[reset($sources)]}.";
        }

        $rows = $r['rows'] ?? null;
        if (! is_array($rows) || $rows === [] || ! array_is_list($rows)) {
            $e[] = 'rows must be a list of {text, gradient: [top, bottom]}.';
            $rows = [];
        }
        foreach ($rows as $i => $row) {
            if (! is_string($row['text'] ?? null) || trim($row['text']) === '') {
                $e[] = "rows[{$i}].text must be the row's letters, e.g. \"ABEL\".";
            }
            $g = $row['gradient'] ?? null;
            if (! is_array($g) || count($g) !== 2 || array_filter($g, fn ($c) => ! is_string($c) || ! preg_match(self::HEX, $c))) {
                $e[] = "rows[{$i}].gradient must be two colours, top then bottom, like [\"#04B3C4\", \"#C4F0F4\"].";
            }
            foreach (['scale', 'tracking'] as $key) {
                if (isset($row[$key]) && ! is_numeric($row[$key])) {
                    $e[] = "rows[{$i}].{$key} must be a number.";
                }
            }
        }

        if (! is_string($r['background'] ?? null) || ! preg_match(self::HEX, $r['background'])) {
            $e[] = 'background must be a colour like "#F03E4A".';
        }
        foreach (['outline', 'aspect', 'focus_width', 'focus_height'] as $key) {
            if (isset($r[$key]) && ! $positive($r[$key])) {
                $e[] = "{$key} must be a number above 0.";
            }
        }
        if (isset($r['row_gap']) && ! is_numeric($r['row_gap'])) {
            $e[] = 'row_gap must be a number (a share of the letter height).';
        }
        if (isset($r['shadow']) && (! is_array($r['shadow']) || count($r['shadow']) !== 2 || array_filter($r['shadow'], fn ($n) => ! is_numeric($n)))) {
            $e[] = 'shadow must be [x, y], shares of the letter height, e.g. [0.065, 0.06].';
        }
        if (isset($r['subtitle']['color']) && ! preg_match(self::HEX, (string) $r['subtitle']['color'])) {
            $e[] = 'subtitle.color must be a colour like "#FFFFFF".';
        }

        $pictures = $r['pictures'] ?? [];
        if (! is_array($pictures) || ! array_is_list($pictures)) {
            $e[] = 'pictures must be a list.';
            $pictures = [];
        }
        $named = array_map(fn ($p, $i) => [$p, "pictures[{$i}]"], $pictures, array_keys($pictures));
        if (isset($r['hero'])) {
            $named[] = [$r['hero'], 'hero'];
            if (! is_string($r['hero']['at'] ?? null)) {
                $e[] = 'hero.at must name the letter the hero stands in, e.g. "t".';
            }
        }
        foreach ($named as [$p, $name]) {
            if (! is_array($p)) {
                $e[] = "{$name} must be an object.";

                continue;
            }
            if (! $file($p['art'] ?? null)) {
                $e[] = "{$name}.art file not found: ".json_encode($p['art'] ?? null).'.';
            }
            $row = $p['row'] ?? 0;
            if (! is_int($row) || $row < 0 || $row >= max(1, count($rows))) {
                $e[] = "{$name}.row must be a row index, 0 to ".(count($rows) - 1).'.';
            }
            if (isset($p['at']) && ! is_string($p['at']) && ! is_numeric($p['at'])) {
                $e[] = "{$name}.at must be a letter id (\"b\", \"a1\") or a % across the row.";
            }
            if (isset($p['height']) && ! $positive($p['height'])) {
                $e[] = "{$name}.height must be a % above 0.";
            }
            if (isset($p['crop']) && (! is_array($p['crop']) || count($p['crop']) !== 4 || array_filter($p['crop'], fn ($n) => ! is_int($n) || $n < 0))) {
                $e[] = "{$name}.crop must be [x, y, w, h] in whole pixels of the art.";
            }
            if (isset($p['align']) && ! in_array($p['align'], ['top', 'middle', 'bottom'], true)) {
                $e[] = "{$name}.align must be top, middle or bottom.";
            }
            if (isset($p['ambient']) && ! in_array($p['ambient'], LayerAmbient::MODES, true)) {
                $e[] = "{$name}.ambient must be one of: ".implode(', ', LayerAmbient::MODES).'.';
            }
        }

        return $e;
    }
    /**
     * Everything wrong with a cover recipe ("layout": "cover"), in words a person can act on.
     *
     * @param  array<mixed>  $r
     * @return list<string>
     */
    public static function coverProblems(array $r): array
    {
        $e = [];
        $file = fn (mixed $path): bool => is_string($path) && $path !== '' && ! str_contains($path, '..') && is_file(base_path($path));
        $number = fn (mixed $n, float $min = 0, float $max = INF): bool => is_numeric($n) && (float) $n >= $min && (float) $n <= $max;
        $colour = fn (mixed $c): bool => is_string($c) && preg_match(self::HEX, $c) === 1;

        if (! $file($r['letters']['font'] ?? null)) {
            $e[] = 'letters.font must be the title font, e.g. "public/fonts/comicroma/ComicRoma.ttf".';
        }
        if (! $file($r['plate']['art'] ?? null)) {
            $e[] = 'plate.art file not found: '.json_encode($r['plate']['art'] ?? null).'. The plate is the painted scene.';
        }
        if (isset($r['plate']['bleed']) && ! $number($r['plate']['bleed'], 0, 10)) {
            $e[] = 'plate.bleed must be a % from 0 to 10.';
        }
        if (! is_string($r['title']['text'] ?? null) || trim($r['title']['text']) === '') {
            $e[] = 'title.text must be the title, e.g. "ABEL TASMAN".';
        }
        if (! $number($r['title']['w'] ?? null, 1, 100) && ! $number($r['title']['cap'] ?? null, 1, 100)) {
            $e[] = 'title needs "w" (its width, % of the frame) or "cap" (its letter height, % of the frame).';
        }
        foreach (['x', 'y'] as $key) {
            if (isset($r['title'][$key]) && ! $number($r['title'][$key], 0, 100)) {
                $e[] = "title.{$key} must be a % from 0 to 100.";
            }
        }
        if (! $colour($r['background'] ?? null)) {
            $e[] = 'background must be a colour like "#C8E5F2" (the sky, shown above the cover on a tall phone).';
        }
        foreach (['background_bottom', 'ink'] as $key) {
            if (isset($r[$key]) && ! $colour($r[$key])) {
                $e[] = "{$key} must be a colour like \"#16202E\".";
            }
        }
        if (isset($r['horizon']) && ! $number($r['horizon'], 0, 100)) {
            $e[] = 'horizon must be a % down the frame, 0 to 100.';
        }
        if (isset($r['subtitle']['font']) && ! in_array($r['subtitle']['font'], ['comic', 'comicroma'], true)) {
            $e[] = 'subtitle.font must be comic or comicroma.';
        }
        if (isset($r['focus']) && array_filter(['x', 'y', 'w', 'h'], fn ($k) => ! $number($r['focus'][$k] ?? null, 0, 100))) {
            $e[] = 'focus must be {x, y, w, h} in % of the frame: what a phone must keep in sight.';
        }

        $cutOuts = array_map(fn ($h, $i) => [$h, "heroes[{$i}]"], (array) ($r['heroes'] ?? []), array_keys((array) ($r['heroes'] ?? [])));
        if (isset($r['subject'])) {
            $cutOuts[] = [$r['subject'], 'subject'];
        }
        foreach (array_merge([[$r['plate'] ?? [], 'plate']], $cutOuts) as [$p, $name]) {
            if (! is_array($p)) {
                $e[] = "{$name} must be an object.";

                continue;
            }
            if ($name !== 'plate') {
                if (! $file($p['art'] ?? null)) {
                    $e[] = "{$name}.art file not found: ".json_encode($p['art'] ?? null).'.';
                }
                if (! $number($p['height'] ?? null, 1, 200)) {
                    $e[] = "{$name}.height must be its height, % of the frame.";
                }
            }
            if (isset($p['ambient']) && ! in_array($p['ambient'], LayerAmbient::MODES, true)) {
                $e[] = "{$name}.ambient must be one of: ".implode(', ', LayerAmbient::MODES).'.';
            }
        }

        return $e;
    }
}
