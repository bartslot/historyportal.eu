<?php

declare(strict_types=1);

namespace App\Services\Diorama;

use App\Models\SvgAsset;
use App\Support\MediaUrl;

/**
 * Library pictures as diorama assets. A diorama item points at one with `asset: "library:<id>"`;
 * this turns the stored real-world metadata into what DioramaStage draws with: the picture's URL,
 * its pixels per metre and frame size, and its anchor. Everything is measured on the DRAWN part
 * (opaque_box), never the transparent margin, so the anchor is the bottom centre of the drawing.
 */
final class LibraryAssets
{
    public const PREFIX = 'library:';

    /**
     * Stage assets for every library item in a diorama spec, keyed by the item's asset key.
     *
     * @param  array<string, mixed>  $spec
     * @return array<string, array<string, mixed>>
     */
    public static function forSpec(array $spec): array
    {
        $ids = collect($spec['items'] ?? [])
            ->pluck('asset')
            ->filter(fn ($key) => is_string($key) && str_starts_with($key, self::PREFIX))
            ->map(fn (string $key) => (int) substr($key, strlen(self::PREFIX)))
            ->unique()->values();
        if ($ids->isEmpty()) {
            return [];
        }

        return SvgAsset::query()->whereIn('id', $ids)->get()
            ->mapWithKeys(fn (SvgAsset $a) => [self::PREFIX.$a->id => self::stageAsset($a)])
            ->filter()
            ->all();
    }

    /** Why this picture cannot stand on a diorama floor, or null when it can. */
    public static function refusal(SvgAsset $asset): ?string
    {
        if ($asset->placement !== 'stands') {
            return match ($asset->placement) {
                'sky' => __('Clouds and birds belong in the sky, not on the floor.'),
                'held' => __('This is carried by a figure. It cannot stand on the floor alone.'),
                'closeup' => __('This is a close-up drawing, not an object in the scene.'),
                'cropped' => __('This drawing is cut off at the bottom, so it cannot stand on a floor.'),
                default => __('This picture has no real height yet, so it cannot stand on a floor.'),
            };
        }

        return self::stageAsset($asset) === null ? __('This picture has no real height yet, so it cannot stand on a floor.') : null;
    }

    /** @return array<string, mixed>|null */
    private static function stageAsset(SvgAsset $a): ?array
    {
        $box = $a->opaque_box;
        if ($a->placement !== 'stands' || ! $a->height_m || ! $a->width || ! $a->height || ! is_array($box) || count($box) !== 4) {
            return null;
        }
        $drawnPx = ($box[3] - $box[1]) * $a->height;
        if ($drawnPx <= 0) {
            return null;
        }
        $pxPerM = $drawnPx / $a->height_m;

        return [
            'url' => MediaUrl::of($a->src()),
            'label' => $a->title,
            'description' => $a->description,
            'px_per_m' => round($pxPerM, 3),
            'height_m' => $a->height_m,
            'frame_m' => [round($a->width / $pxPerM, 4), round($a->height / $pxPerM, 4)],
            // Bottom centre of the drawing, as fractions of the picture.
            'anchor' => [round(($box[0] + $box[2]) / 2, 4), $box[3]],
        ];
    }
}
