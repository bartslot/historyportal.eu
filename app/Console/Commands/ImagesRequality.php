<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Point stored Cloudinary lesson-picture URLs at the current quality (config lessons.image_quality).
 *
 * The delivery transform (`f_auto,q_N,c_limit,w_2880,h_2880`) is baked into every stored URL, so a
 * new quality only reached pictures uploaded afterwards. Cloudinary derives a transform on first
 * request, so rewriting the URL is all it takes; the master upload is untouched. Only that exact
 * lesson transform is rewritten; covers and thumbnails keep their own.
 */
class ImagesRequality extends Command
{
    protected $signature = 'images:requality {--dry-run : Count what would change, change nothing}';

    protected $description = 'Rewrite stored lesson-picture URLs to the configured AVIF quality';

    /** Tables and the columns that hold picture URLs (plain or inside JSON). */
    private const TARGETS = [
        'scenes' => ['image_path', 'config', 'shots'],
        'lessons' => ['poster_image'],
        'svg_assets' => ['cdn_url'],
    ];

    public const PATTERN = '#f_auto,q_\d+,c_limit,w_2880,h_2880#';

    public function handle(): int
    {
        $quality = (int) config('lessons.image_quality');
        $replacement = "f_auto,q_{$quality},c_limit,w_2880,h_2880";
        $dry = (bool) $this->option('dry-run');
        $total = 0;

        foreach (self::TARGETS as $table => $columns) {
            foreach ($columns as $column) {
                $changed = 0;
                DB::table($table)->select(['id', $column])->where($column, 'like', '%c_limit,w_2880,h_2880%')
                    ->orderBy('id')->chunkById(200, function ($rows) use ($table, $column, $replacement, $dry, &$changed): void {
                        foreach ($rows as $row) {
                            $new = self::rewrite((string) $row->{$column}, $replacement);
                            if ($new === $row->{$column}) {
                                continue;
                            }
                            $changed++;
                            if (! $dry) {
                                DB::table($table)->where('id', $row->id)->update([$column => $new]);
                            }
                        }
                    });
                if ($changed) {
                    $this->line("{$table}.{$column}: {$changed}");
                }
                $total += $changed;
            }
        }

        $this->info(($dry ? 'Would rewrite ' : 'Rewrote ')."{$total} value(s) to q_{$quality}.");

        return self::SUCCESS;
    }

    public static function rewrite(string $value, string $replacement): string
    {
        return (string) preg_replace(self::PATTERN, $replacement, $value);
    }
}
