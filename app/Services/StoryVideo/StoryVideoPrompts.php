<?php

declare(strict_types=1);

namespace App\Services\StoryVideo;

use App\Services\Art\HistoryLineStyle;

/**
 * The prompt text of story to video. Style words come from HistoryLineStyle only; this class adds what each
 * item is (a character sheet, an empty world shot, a clip) and the house rules that go with it:
 *
 * - Character sheets follow Castkit's sheet station: three panels, dead-on, on a flat 18% grey field with no
 *   lighting baked in, so every later shot can light the person its own way. Drawn in History Lines, not photoreal.
 * - World shots follow Scenecraft: the place only, nobody in it. Characters are added by the clip, not the plate.
 * - Clips follow Shotcaller (shotcaller-h3, retuned for Seedance): image 1 is the empty place, the sheets lock the
 *   people, the clip is silent and has no text, several hard cuts, no loops, real-time motion.
 */
final class StoryVideoPrompts
{
    /** The colour anchors and the texture plate that carry the look in every picture request, in attach order. */
    public const IMAGE_ANCHORS = ['colour-caesar.jpg', 'colour-castle.jpg', 'texture-watercolour.jpg'];

    public const SHEET_ANCHORS = ['colour-classroom.jpg', 'colour-caesar.jpg', 'texture-watercolour.jpg'];

    /**
     * @param  array{name: string, colour?: string, look?: string}  $person
     * @param  list<string>  $whiteOwners  who owns white in this cast (at most one is allowed)
     */
    public static function characterSheet(array $person, string $era, string $place, array $whiteOwners = []): string
    {
        $name = trim($person['name']);
        $colour = trim((string) ($person['colour'] ?? ''));
        $look = trim((string) ($person['look'] ?? ''));
        $white = mb_strtolower($colour) === 'white';
        $colourLine = $colour !== ''
            ? "{$name}'s signature colour is {$colour}: their largest garment (cloak, dress or coat) is {$colour}, and {$colour} is the strongest colour on them. "
            : '';
        $whiteLine = $white
            ? ''
            : 'They wear no white garment: white belongs to '.($whiteOwners !== [] ? implode(', ', $whiteOwners) : 'nobody in this story').' only. ';

        return "A character reference sheet for a historical educational comic: {$name}, {$era}, {$place}. "
            .($look !== '' ? "{$look}. " : '')
            .$colourLine.$whiteLine
            .'Three panels side by side at the same scale: panel 1 the full figure from the front, head to feet; '
            .'panel 2 the full figure from the back; panel 3 a tight front view of the face and shoulders. '
            .'Every panel dead-on, standing straight, arms relaxed, neutral calm expression, feet visible. '
            .'The same person, clothes and colours in every panel, garment for garment. '
            .'Historically accurate clothing and objects for that time and place; if unsure, simplify, never invent. '
            .'The background is a single flat 18% neutral grey field, one uniform value corner to corner, not a floor or a wall, '
            .'with no cast shadow, no contact shadow, no glow and no colour bleeding onto the grey. Flat even model-sheet light, no shadow side. '
            .'No panel borders, no labels, no names, no text. '
            .HistoryLineStyle::ONE_PASS;
    }

    /**
     * An empty place: what the scene's world looks like with nobody in it.
     *
     * @param  array<string, mixed>  $brief  the scene's outline brief (location, year, viewerPosition, visualEvidence, avoidList, image_prompt_seed)
     */
    public static function worldShot(array $brief, string $era, string $fallback = ''): string
    {
        $place = trim((string) ($brief['location'] ?? ''));
        $year = trim((string) ($brief['year'] ?? ''));
        $where = trim((string) ($brief['viewerPosition'] ?? ''));
        $seed = trim((string) ($brief['image_prompt_seed'] ?? '')) ?: $fallback;
        $evidence = array_values(array_filter(array_map('strval', (array) ($brief['visualEvidence'] ?? []))));
        $avoid = array_values(array_filter(array_map('strval', (array) ($brief['avoidList'] ?? []))));

        return 'A wide 16:9 establishing view of a place for a historical educational comic, '
            .trim(implode(', ', array_filter([$place, $year !== '' ? self::year($year) : $era]))).'. '
            .($seed !== '' ? "{$seed}. " : '')
            .($where !== '' ? "Seen as if {$where}. " : '')
            .($evidence !== [] ? 'Show: '.implode('; ', $evidence).'. ' : '')
            .'THE PLACE IS EMPTY: no people, no animals with riders, no figures anywhere, not even small or distant ones. '
            .'Leave clear open ground in the foreground and middle distance where people can be placed later. '
            .'Architecture, terrain, water, materials and the direction of the light read clearly. '
            .($avoid !== [] ? 'Leave out: '.implode('; ', $avoid).'. ' : '')
            .HistoryLineStyle::ONE_PASS;
    }

    /** The LLM's brief for one clip: it writes the staging; the fixed slots around it come from clip(). */
    public static function shotPlanSystem(): string
    {
        return <<<'SYS'
You plan one silent video clip for a narrated history lesson, drawn as a watercolour comic. Write only what is
VISIBLE: positions, movement, counts, distances, gestures, weather. The model is a physics engine, not a mood board.

Rules:
- Image 1 is an EMPTY place. Only the people you write are in frame. Name them exactly as given.
- 2 to 5 shots with hard cuts, timings in seconds that add up exactly to the clip length. Open wide (a slow high
  establishing move when the place matters), then cut closer. Landscape beats stay far: small travellers, terrain.
- Faces only in close and medium-close shots; in wide shots show backs, profiles or small figures.
- Nobody points. No hands near fire. No modern objects. Nobody speaks to camera; mouths stay closed or still.
- Real-time motion, no slow motion, no loops, the last shot does not return to the first.

Answer JSON: {"staging": string} — 120 to 260 words, in this order: one line per shot with its time range, camera
(lens in degrees, move) and what happens; then where each person stands (left/right, near/far); then one line on
light and weather.
SYS;
    }

    /**
     * @param  list<array{name: string, colour?: string, look?: string}>  $people  the cast in this beat, in the order of their sheets (image 2, 3, ...)
     */
    public static function shotPlanUser(string $line, int $seconds, string $place, array $people): string
    {
        $who = $people === [] ? 'nobody (the place alone)' : implode('; ', array_map(
            fn (array $p) => trim($p['name']).(trim((string) ($p['colour'] ?? '')) !== '' ? ' (wears '.trim((string) $p['colour']).')' : ''),
            $people,
        ));

        return "Narration this clip covers: \"{$line}\"\nClip length: {$seconds} seconds\nPlace: {$place}\nPeople: {$who}";
    }

    /**
     * The full clip prompt around the staging.
     *
     * @param  list<array{name: string, colour?: string, look?: string}>  $people  in sheet order: image 2, image 3, ...
     */
    public static function clip(string $staging, int $seconds, array $people): string
    {
        $assets = ['image 1 = the place only: architecture, terrain, water, palette and light direction. It contributes no people.'];
        foreach (array_values($people) as $i => $p) {
            $colour = trim((string) ($p['colour'] ?? ''));
            $assets[] = 'image '.($i + 2).' = '.trim($p['name']).'\'s character sheet: face, build, hair and clothing'
                .($colour !== '' ? ", in their signature {$colour}" : '').'. Its grey backdrop, panels and straight-on poses are never reproduced.';
        }

        return "One clip, {$seconds} seconds, hard cuts between shots, no transitions, all real-time, no slow motion.\n\n"
            .'Style: a hand-drawn European comic album in motion: confident black ink line of varying weight, crisp closed outer contours, '
            .'transparent watercolour washes under the ink, bright paper showing through, visible blooms and granulation. Most of the frame stays pale. '
            .'Darkness built from hatching, never solid black fills. Faces drawn with a few precise lines, eyes crisp and ink-outlined at every distance, '
            ."hands with five fingers. NOT photoreal, NOT 3D, NOT glossy digital painting, NOT anime. The line work holds its shape from frame to frame: no flicker, no boiling lines, no morphing.\n\n"
            .'NO ON-SCREEN TEXT: no captions, subtitles, titles, labels, map lettering, speech bubbles, sound-effect lettering, watermarks or logos at any point.'."\n\n"
            .'THE PLACE IS EMPTY UNTIL WE FILL IT: image 1 gives the world; the only figures in frame are the ones written below.'
            .($people !== [] ? ' THE SHEETS LOCK THE CHARACTERS: each sheet is the single source of truth for that person, garment for garment and colour for colour, in every shot. Nobody else wears their colour.' : '')
            ."\n\nAssets: ".implode(' ', $assets)."\n\n"
            .trim($staging)."\n\n"
            .'Silent clip: no dialogue, mouths still. Period-true everything. The last shot does not return to the first frame.';
    }

    /** "-49" → "49 BC". */
    private static function year(string $year): string
    {
        return preg_match('/^-(\d+)$/', $year, $m) === 1 ? "{$m[1]} BC" : $year;
    }
}
