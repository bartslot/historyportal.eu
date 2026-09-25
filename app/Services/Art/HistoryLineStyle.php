<?php

declare(strict_types=1);

namespace App\Services\Art;

/**
 * The ONE History Portal illustration style and the single source of its prompt text.
 * Line only, black on white, no tonal shading. Never add hatching words here: the old
 * multi-style experiments (etching, engraved, sumi-e ink) are what this replaces.
 */
final class HistoryLineStyle
{
    public const KEY = 'history-line';

    public const VERSION = 'history-line@1';

    public const BASE = 'Clean black-and-white historical comic line drawing. High-contrast black lines on white. '
        .'Preserve accurate silhouettes, proportions, poses, architecture, vehicles, ships, animals and important historical objects. '
        .'Use clear outer contours and only essential interior construction lines. '
        .'Keep useful structural detail in people, clothing, faces, equipment and architecture. '
        .'Simplify landscape, terrain, vegetation, water, sky and distant elements into broad readable shapes with fewer lines. '
        .'No shading. No hatching. No cross-hatching. No grey wash. No halftone. No graphite texture. '
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
