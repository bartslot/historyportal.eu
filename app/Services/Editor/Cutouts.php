<?php

declare(strict_types=1);

namespace App\Services\Editor;

use App\Models\Lesson;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\Stage25d\LibraryBundle;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * A teacher's cut-outs (Bart, 2026-11-04: "when you select a bunch of grass or tree line, you can then save it as a
 * new asset"). The quick mask's selection, saved as its own picture: the teacher's own SvgAsset (source 'cutout'),
 * so it is in their Assets for normal scenes, and a row of the 3D library for stage25d scenes (stage25d/engine.js
 * merges forStage()). The picture it was cut from is never touched.
 */
final class Cutouts
{
    public const SOURCE = 'cutout';

    /** A standing thing with no known size (cut from a normal scene's picture) is this tall in a 3D scene. */
    public const DEFAULT_HEIGHT_M = 2.0;

    /**
     * Store a cut-out. `$from` says what it was cut from, for its real size in a 3D scene: a library asset of a stage25d
     * bundle (`bundle`, `asset`) and the cut-out's height in the source picture's pixels (`box_h`, of `height` px).
     *
     * @param  array<string,mixed>  $from
     */
    public static function save(User $user, string $dataUrl, string $title, array $from = []): ?SvgAsset
    {
        $path = EditedImages::storeIn("cutouts/{$user->id}", $dataUrl);
        if ($path === null) {
            return null;
        }
        $info = @getimagesizefromstring((string) Storage::disk('public')->get($path)) ?: [0, 0];
        $name = trim(Str::limit(strip_tags($title), 60, ''));
        // never the source's own name: two cut-outs of a band would read as the band itself
        $title = $name !== '' ? __('Cut-out of :name', ['name' => $name]) : __('Cut-out');

        return SvgAsset::create([
            'user_id' => $user->id,
            'source' => self::SOURCE,
            'source_ref' => pathinfo($path, PATHINFO_FILENAME),
            'source_url' => '',
            'title' => $title,
            'license' => __('Own cut-out'),
            'svg_path' => $path,
            'width' => $info[0] ?: null,
            'height' => $info[1] ?: null,
            'height_m' => self::heightM($from),
        ]);
    }

    /** Metres: the source asset's metres per pixel times the cut-out's height in its pixels; null when unknown. */
    public static function heightM(array $from): ?float
    {
        $bundle = is_string($from['bundle'] ?? null) ? $from['bundle'] : null;
        $assetId = is_string($from['asset'] ?? null) ? $from['asset'] : null;
        $boxH = is_numeric($from['box_h'] ?? null) ? (float) $from['box_h'] : 0.0;
        $picH = is_numeric($from['height'] ?? null) ? (float) $from['height'] : 0.0;
        if ($bundle === null || $assetId === null || $boxH <= 0 || $picH <= 0) {
            return null;
        }
        try {
            $asset = LibraryBundle::asset($bundle, $assetId);
        } catch (\Throwable) {
            return null;
        }
        $m = (float) ($asset['height_m'] ?? 0);

        return $m > 0 ? round($m * min(1.0, $boxH / $picH), 3) : null;
    }

    /** Every word Uitknippen shows (resources/js/editor/cutout-dialog.js), English => this language. */
    private const LABELS = [
        'Back to the scene', 'Picture', 'Save', 'Undo', 'Redo', 'Tools', 'Erase', 'Bring back', 'Remove colour', 'Select a part', 'Hand',
        'Zoom in', 'Zoom out', 'Fit', 'Size', 'Softness', 'Tolerance', 'Everywhere', 'Add', 'Remove', 'Brush size', 'Soft edge', 'Edge',
        'Clean up', 'White holes', 'White edges', 'Soft bottom', 'Before', 'Save as asset', 'Back to the original', 'Close',
        'Save your changes?', 'Keep editing', 'Discard', 'The picture could not be saved. Try again.',
        'This picture cannot be opened here.',
    ];

    /** @return array<string,string> */
    public static function labels(): array
    {
        return collect(self::LABELS)->mapWithKeys(fn (string $en) => [$en => __($en)])->all();
    }

    /** @return Collection<int, SvgAsset> */
    public static function of(User $user): Collection
    {
        return SvgAsset::query()->where('user_id', $user->id)->where('source', self::SOURCE)->latest()->get();
    }

    /**
     * A cut-out as a row of the 3D library (engine-mvp stage25d/types.ts Asset). `file` is relative to a bundle's own
     * folder (/storage/library/<bundle>/), which is where the stage resolves every file from.
     *
     * @return array<string,mixed>
     */
    public static function stageRow(SvgAsset $a): array
    {
        return [
            'id' => 'cut-'.$a->id,
            'layer' => 'mid',
            'tags' => ['cutout'],
            'file' => '../../'.ltrim($a->svg_path, '/'),
            'w' => (int) $a->width,
            'h' => (int) $a->height,
            'anchor' => [0.5, 1],
            'height_m' => $a->height_m ?: self::DEFAULT_HEIGHT_M,
            'name' => ['nl' => $a->title, 'en' => $a->title],
            'cutout' => true,
        ];
    }

    /** The cut-out a 3D layer id names ('cut-<id>'), or null. */
    public static function idOf(string $assetId): ?int
    {
        return preg_match('/^cut-(\d+)$/', $assetId, $m) === 1 ? (int) $m[1] : null;
    }

    /** The library kind of a teacher's own cut-out ('mid': it stands on the ground), or null when it is not theirs. */
    public static function layerOf(string $assetId, int $userId): ?string
    {
        $id = self::idOf($assetId);

        return $id !== null && SvgAsset::query()->whereKey($id)->where('user_id', $userId)->where('source', self::SOURCE)->exists()
            ? 'mid' : null;
    }

    /**
     * The 3D library rows a page needs: the teacher's own cut-outs (the editor) and every cut-out the lesson's 3D
     * scenes use, whoever made it (the player: a class has to see them too).
     *
     * @return list<array<string,mixed>>
     */
    public static function forStage(?User $user, ?Lesson $lesson = null): array
    {
        $ids = [];
        foreach ($lesson?->scenes ?? [] as $scene) {
            foreach ($scene->config['stage25d']['set']['layers'] ?? [] as $layer) {
                if (is_string($layer['asset'] ?? null) && ($id = self::idOf($layer['asset'])) !== null) {
                    $ids[] = $id;
                }
            }
        }
        $rows = SvgAsset::query()->where('source', self::SOURCE)
            ->where(fn ($q) => $q->whereIn('id', $ids)->when($user, fn ($q) => $q->orWhere('user_id', $user->id)))
            ->latest()->get();

        return $rows->map(fn (SvgAsset $a) => self::stageRow($a))->values()->all();
    }
}
