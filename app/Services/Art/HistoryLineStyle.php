<?php

declare(strict_types=1);

namespace App\Services\Art;

/**
 * The ONE History Portal illustration style and the single source of its prompt text.
 * Fine black ink line on white, shading only by controlled line hatching (Bart's prompt, 2026-09-26).
 * Never add dense cross-hatching / engraving language: the old etching, engraved and sumi-e styles are what this replaces.
 */
final class HistoryLineStyle
{
    public const KEY = 'history-line';

    public const VERSION = 'history-line@1';

    public const BASE = 'Clean black-and-white historical comic line drawing. High-contrast black lines on white. '
        .'Preserve accurate shapes, proportions, poses, architecture, vehicles, ships, animals and important historical objects. '
        .'Use clear outer contours and only essential interior construction lines. '
        .'Keep useful structural detail in people, clothing, faces, equipment and architecture. '
        .'Simplify landscape, terrain, vegetation, water, sky and distant elements into broad readable shapes with fewer lines. '
        // Shading rule from Bart's own prompt behind the reference images (2026-09-26). It replaces the
        // earlier "no hatching at all" wording: controlled hatching is the look, dense engraving is not.
        .'Add approximately 10 to 14% black coverage, built from lines and never from solid fills. '
        .'Use single-direction hatching for medium shadows and no more than two intersecting directions for deep shadows. '
        .'Keep 65 to 75% white space. Cross-hatching should occupy no more than 20% of the shaded area. '
        .'No solid black fills, no silhouettes, no black masses. No grey wash. No halftone. No graphite texture. '
        .'No decorative micro-detail. No synthetic texture. Keep large areas white and visually quiet. '
        .'If an object is ambiguous, simplify it rather than inventing detail.';

    public const SAFETY = 'No readable text, no letters, no labels, no watermark, no gore.';

    /** Source → line master. Reference order: source first, then the two style anchors. */
    public static function convert(string $constraints = ''): string
    {
        return 'Convert reference image 1 into this style, matching the line quality of reference images 2 and 3. '
            .'Preserve the exact composition, camera angle, poses, silhouettes, architecture and object placement of reference image 1. '
            .'Do not invent objects. '.self::BASE.' '.self::SAFETY
            .($constraints !== '' ? ' '.$constraints : '');
    }

    /**
     * Wide empty stage: a scene backdrop that figures are placed on later as layers.
     * Reference order: people anchor, environment anchor, then optional real sources.
     */
    public static function plate(string $scene, string $constraints = ''): string
    {
        return 'A wide 16:9 backdrop for a historical educational comic. '.$scene.' '
            .'Keep the foreground empty for figures to be placed later, no main characters. '
            .'Match the line style of reference images 1 and 2 exactly. '
            .'Follow the architecture and historical details of any further reference images, but leave out their figures. '
            .self::BASE.' '.self::SAFETY
            .($constraints !== '' ? ' '.$constraints : '');
    }

    /**
     * Isolated asset sheet. $items: one short description per cell, top-left → bottom-right.
     * Reference order: people anchor, environment anchor, then optional content references.
     *
     * @param  list<string>  $items
     */
    public static function sheet(array $items, int $rows, int $cols, string $era, string $place, string $view = 'three-quarter', bool $figures = false): string
    {
        $count = $rows * $cols;
        $list = implode('; ', array_map(
            fn (int $i, string $description) => 'cell '.($i + 1).': '.$description,
            array_keys($items),
            $items,
        ));
        $figure = $figures
            ? ' Full body, feet visible, all standing on the same invisible ground line, neutral expression, respectful non-caricatured features.'
                .' The whole figure, from the top of the head to the soles of both feet, sits inside its own cell with clear white margin all round;'
                .' the figure takes at most 85% of the cell height. Never crop a figure at the cell edge.'
            : '';

        return "A {$rows}x{$cols} sheet of {$count} separate isolated items for a historical educational comic, {$era}, {$place}. {$list}. "
            .'Each item alone and centred in its own equal cell on a pure white background, with a wide white margin, '
            .'not touching the cell edges or other items. No ground, no floor, no cast shadow, no background scenery, no frames, no grid lines. '
            ."All items drawn at the same eye-level {$view} view.{$figure} "
            .'Closed continuous outer contour around every item. Match the line style of reference images 1 and 2 exactly. '
            .'Follow shapes and historical details of any further reference images. '
            .self::BASE.' '.self::SAFETY;
    }
}
