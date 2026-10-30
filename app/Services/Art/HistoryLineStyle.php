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

    // ── The two-pass History Lines restyle ──────────────────────────────────────────────────────
    // Source of the wording: the History Lines framework, Memory/historyportal/topics/history-lines/notes.md
    // (updated 2026-10-17; COLOUR-PASS.md of 2026-10-15 supersedes the old soft-pencil STYLE.md).
    // Pass 1 draws the ink from the source; pass 2 edits THAT ink into watercolour. Never colour the source directly.

    /** Bart's hatching rule, verbatim (2026-10-20, "our first pass is too much of nothing"). */
    public const HATCHING_RULE = 'approximately 10 to 14% black coverage. Use single-direction hatching for medium shadows and no more than two '
        .'intersecting directions for deep shadows. Keep 65 to 75% white space. Cross-hatching should occupy no more than 20% of the shaded area.';

    /** Framework pass 1, with the hatching rule; the scene in brackets is the restyle source itself. */
    public const INK_PASS = 'Redraw reference image 1 as a clean black-and-white educational comic illustration. Keep its composition, framing, '
        .'subject, pose, scale and identity exactly; change only the drawing style. The reference images after it show the History Lines '
        .'line quality and hatching only: take their style, never their subjects. Use crisp black contours and controlled hatching, '
        .'with '.self::HATCHING_RULE.' No solid black fills on anything that will need colour (cloaks, crosses, hulls): colour goes '
        .'under the ink. Keep broad areas of white paper and a clear focal action. Draw clouds as large irregular cumulus silhouettes '
        .'with very thin contours, few overlapping forms and nearly white interiors. No colour, grey washes, dense cloud shading, '
        .'text, labels or watermarks.';

    /** Edit lock, placed before the colour prompt (framework "Edit lock"). */
    public const EDIT_LOCK = 'Use the attached ink drawing (reference image 1) as a locked source. Preserve exact canvas size, framing, camera, '
        .'positions, scale, pose, silhouette and every ink mark. Change only colour beneath the drawing. Do not crop, outpaint, recompose or add objects. ';

    /** Bart's colour prompt, VERBATIM (framework "Pass 2"). */
    public const COLOUR_PROMPT = 'Color the existing black-and-white comic drawing as a clean educational historical illustration. Preserve all black '
        .'linework, hatching and cross-hatching exactly. Apply color only as a second pass beneath the ink. Use a restrained '
        .'watercolor-comic treatment with transparent washes, subtle pigment variation and a bright editorial feel. Keep major '
        .'architectural surfaces very light, mostly cream, pale sandstone, warm off-white and light ochre. Use weathered brown for wood '
        .'and boats, clear muted turquoise or blue-green for water, and restrained olive only for vegetation. Use selective color '
        .'placement rather than coloring every surface. Keep background areas quieter and less saturated. Black ink must remain '
        .'dominant. Preserve generous light areas and negative space, with roughly 35 to 45% of the image remaining very pale. No muddy '
        .'wash, no antique filter, no glossy rendering, no heavy grunge, no green architecture and no repainting of linework.';

    /** Cloud addendum, appended after the colour prompt (framework). */
    public const CLOUD_ADDENDUM = 'Keep clouds primarily the white of the paper, with 80-90% of each cloud untouched. Add only an extremely pale '
        .'transparent cool blue-grey wash beneath selected lower edges and overlaps. Surround them with a very pale blue watercolor sky. '
        .'Preserve thin cloud contours. No solid white or grey fill, detailed internal texture, heavy shadows, airbrushed gradients, '
        .'photographic clouds or 3D rendering.';

    /** Bart 2026-10-20 ("I would like more watercolour texture. that's history lines"): overrides the old "very low texture". */
    public const TEXTURE = 'Show real watercolor texture in the washes: blooms, backruns, granulation, tide-lines, paper tooth and uneven glazes. '
        .'No blur and no speckle noise. Reference images after the first show the watercolor look and texture only, never their content.';

    /** Material and geometry lock (framework "practical addendum"). */
    public const GEOMETRY_LOCK = 'Color only things already drawn. Keep dry ground almost white; never introduce water or wave marks. Preserve '
        .'every object, attachment and opening.';

    private const ANCHOR_DIR = 'art/style-anchors/history-lines';

    /**
     * The shared anchor set: one list per pass, scene or figure flavoured. Pass 1 attaches ink refs,
     * pass 2 the colour refs plus the texture ref. File names, in attach order, after the source image.
     *
     * @return list<string>
     */
    public static function anchors(int $pass, bool $figure): array
    {
        return match (true) {
            $pass === 1 && $figure => ['ink-classroom.jpg', 'ink-caesar.jpg'],
            $pass === 1 => ['ink-caesar.jpg', 'ink-castle.jpg'],
            $figure => ['colour-classroom.jpg', 'colour-caesar.jpg', 'texture-watercolour.jpg'],
            default => ['colour-caesar.jpg', 'colour-castle.jpg', 'texture-watercolour.jpg'],
        };
    }

    public static function anchorPath(string $file): string
    {
        return resource_path(self::ANCHOR_DIR.'/'.$file);
    }

    /** What a figure asset must stay: whole, uncropped, a single subject on plain paper (alpha is cut after pass 2). */
    private static function figureClause(bool $figure): string
    {
        return $figure
            ? ' This is an isolated cut-out asset: show the complete subject, head to feet, nothing cropped at the edges, on plain white paper '
                .'with no ground. Remove tables, crates, floors, shadows and other props baked into the picture unless they are part of the subject itself.'
            : '';
    }

    /** Pass 1: source + ink refs → black ink with hatching. */
    public static function restyleInk(bool $figure = false, string $era = ''): string
    {
        $eraLine = $era !== '' ? " Keep everything correct for {$era}; add nothing that does not belong to that time." : '';

        return self::INK_PASS.$eraLine.self::figureClause($figure).' '.self::SAFETY;
    }

    /** Pass 2: the pass-1 ink + colour refs + texture ref → watercolour edited from that ink. */
    public static function restyleColour(bool $figure = false): string
    {
        return self::EDIT_LOCK.self::COLOUR_PROMPT.' '.self::CLOUD_ADDENDUM.' '.self::TEXTURE.' '.self::GEOMETRY_LOCK
            .self::figureClause($figure).' '.self::SAFETY;
    }
}
