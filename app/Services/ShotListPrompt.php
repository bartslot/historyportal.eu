<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Scene;

/**
 * Storyboard prompt: turns a scene's narration into N distinct shots, each anchored
 * to the exact sentence it illustrates. The anchor is a VERBATIM substring of the
 * script — the player resolves it against the TTS character timings so every image
 * appears at the precise moment the narrator speaks about it.
 */
final class ShotListPrompt
{
    /** Composition vocabulary baked into the prompt so shots don't converge on one framing. */
    private const COMPOSITIONS = 'establishing wide, medium view of activity, close-up of an object or '
        .'detail, over-the-shoulder viewpoint, dramatic low angle, high vantage overview, '
        .'intimate interior, movement or action moment, aftermath or quiet detail';

    public static function system(int $shotCount, bool $narrative = false): string
    {
        return $narrative ? self::narrativeSystem($shotCount) : self::environmentSystem($shotCount);
    }

    /** Baseline storyboard prompt — byte-for-byte the pre-Phase-0 behaviour. */
    private static function environmentSystem(int $shotCount): string
    {
        $compositions = self::COMPOSITIONS;

        return <<<SYS
You are a storyboard artist for a history documentary. Break the scene narration into
exactly {$shotCount} visual shots that illustrate the story as it is told.

Rules — all mandatory:
- Exactly {$shotCount} shots, ordered to follow the narration from start to end.
- "anchor_sentence" must be copied VERBATIM from the narration text — an exact contiguous
  substring (a sentence or distinctive phrase), no paraphrasing, no added words. This is a
  hard technical requirement: the substring is machine-matched against the narration.
- Each shot gets a DIFFERENT composition. Vary among: {$compositions}.
- Each shot anchors a DIFFERENT part of the narration — spread the anchors across the whole
  text from first sentence to last. Never anchor two shots to the same sentence.
- "description" is a concrete visual moment (place, objects, light, weather, period-accurate
  details) — an environment or object study, no readable text, no modern objects.
- Everything must be period-accurate for the year and location given. Respect the avoid-list.

Return ONLY JSON:
{
  "shots": [
    {
      "order": integer (1-based),
      "anchor_sentence": string (verbatim substring of the narration),
      "composition": string (one of the compositions above),
      "description": string (one or two sentences of concrete visual detail)
    }
  ]
}
SYS;
    }

    /**
     * Phase 0 candidate: the storyboard shows the story's PEOPLE ACTING. "description" is an
     * action to witness, not scenery to study — the single change the whole experiment hinges
     * on (the script prompt demands named people doing things; the old storyboard prompt then
     * asked the illustrator for an "environment or object study" and removed them again).
     */
    private static function narrativeSystem(int $shotCount): string
    {
        return <<<SYS
You are a storyboard artist for a history story told to schoolchildren. Break the scene
narration into exactly {$shotCount} visual shots that SHOW the story's people doing what the
narration says they do.

Rules — all mandatory:
- Exactly {$shotCount} shots, ordered to follow the narration from start to end.
- "anchor_sentence" must be copied VERBATIM from the narration text — an exact contiguous
  substring (a sentence or distinctive phrase), no paraphrasing, no added words. This is a
  hard technical requirement: the substring is machine-matched against the narration.
- Each shot anchors a DIFFERENT part of the narration — spread the anchors across the whole
  text from first sentence to last. Never anchor two shots to the same sentence.
- "subject" is WHO the shot is about: the named person, or a documented group ("the sailors",
  "the marching women"). When the anchored narration involves a person, the shot shows them.
- "action" is what the subject is visibly DOING in this frame: deciding, arguing, fleeing,
  building, studying a chart, turning away. One concrete observable moment — never a mood,
  never an empty landscape while people are acting in the narration.
- "shot_size" is one of: wide, medium-wide, medium, close-up, detail. Vary across the scene;
  use medium and close-up when a decision or emotion carries the beat, wide to establish.
- "narrative_function" is one of: establish, action, decision, reaction, consequence, reveal.
- "description" is the full renderable moment in one or two sentences: subject + action +
  setting + period-accurate details. A frozen frame from a film, not a postcard. Pure
  environment shots are allowed ONLY where the narration itself pauses on place.
- Everything must be period-accurate for the year and location given. Respect the avoid-list.
- No readable text, no modern objects, nothing that would frighten young children.

Return ONLY JSON:
{
  "shots": [
    {
      "order": integer (1-based),
      "anchor_sentence": string (verbatim substring of the narration),
      "subject": string,
      "action": string,
      "shot_size": string,
      "narrative_function": string,
      "composition": string (short framing note, e.g. "low angle", "over-the-shoulder"),
      "description": string (one or two sentences: subject + action + setting)
    }
  ]
}
SYS;
    }

    /**
     * Phase 0 dynamic shot count: one visual state per ~`lessons.shot_seconds` of narration,
     * clamped to `lessons.dynamic_shot_range`. Median 91-word scene → ≈6 shots.
     */
    public static function shotCountFor(Scene $scene): int
    {
        $words = max(1, str_word_count((string) $scene->script_segment));
        $seconds = $words / max(0.1, (float) config('lessons.words_per_second', 2.55));
        [$min, $max] = array_pad((array) config('lessons.dynamic_shot_range', [3, 8]), 2, 8);

        return (int) max((int) $min, min((int) $max, (int) round($seconds / max(1.0, (float) config('lessons.shot_seconds', 6.5)))));
    }

    /**
     * Grid layout for a dynamic shot count. Prefers 2x3 over 3x3 (512px-high panels instead
     * of 341px — faces, hands and interactions need the vertical resolution).
     *
     * @return array{0: int, 1: int} [rows, cols]
     */
    public static function gridForCount(int $count): array
    {
        return match (true) {
            $count <= 3 => [1, 3],
            $count === 4 => [2, 2],
            $count <= 6 => [2, 3],
            default => [2, 4],
        };
    }

    public static function user(Scene $scene, int $shotCount): string
    {
        $brief = self::briefFor($scene);

        $visualBlock = ! empty($brief['visualEvidence'])
            ? "Period-accurate visual details to draw from:\n".self::bulletList((array) $brief['visualEvidence'])
            : '';
        $avoidBlock = ! empty($brief['avoidList'])
            ? "Do NOT depict:\n".self::bulletList((array) $brief['avoidList'])
            : '';

        $setting = trim(($scene->year ?? '').' '.($scene->location ?? ''));
        $settingLine = $setting !== '' ? "Setting: {$setting}" : '';

        return <<<USR
{$settingLine}

Narration for this scene (anchor_sentence must be a verbatim substring of THIS text):
"""
{$scene->script_segment}
"""

{$visualBlock}

{$avoidBlock}

Produce the {$shotCount}-shot JSON storyboard now.
USR;
    }

    /**
     * The outline brief for this scene, matched by POSITION among non-map scenes —
     * the default map block shifts scene orders by one, so order-based indexing is wrong.
     *
     * @return array<string, mixed>
     */
    public static function briefFor(Scene $scene): array
    {
        $briefs = array_values($scene->lesson->outline['scene_briefs'] ?? []);
        $position = $scene->lesson->scenes
            ->where('kind', '!=', 'map')
            ->sortBy('order')
            ->values()
            ->search(fn (Scene $candidate) => $candidate->id === $scene->id);

        // Null-safe index: a repaired outline can create more scenes than stored briefs, and a
        // raw out-of-range access is a fatal ErrorException in the queue worker (fails the scene).
        return ($position !== false ? ($briefs[$position] ?? null) : null) ?? [];
    }

    private static function bulletList(array $items): string
    {
        return implode("\n", array_map(fn ($item) => "- {$item}", $items));
    }
}
