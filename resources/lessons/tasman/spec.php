<?php

declare(strict_types=1);

/**
 * Abel Tasman, the standard lesson, in any language: the renderer-neutral story (story.json: scenes,
 * panels, staging, cast, camera, art per panel) merged with that language's words (text/{lang}.json)
 * and the cast's voices (cast.json). Every comic panel becomes one scene; the team games sit where
 * story.json's `sequence` puts them.
 *
 * Art comes from the history-line library (resources/icons/history-line/.../tasman, imported with
 * `php artisan icons:import --collection=history-line`). A panel whose picture is not in the library
 * yet is built without it, so the lesson composes while the art is still being painted.
 *
 * $text is injectable for tests; normally it is read from text/{lang}.json.
 */
return function (string $lang, ?array $text = null): array {
    $read = fn (string $file): array => json_decode((string) file_get_contents(__DIR__."/{$file}"), true, 512, JSON_THROW_ON_ERROR);
    $story = $read('story.json');
    $cast = $read('cast.json');
    $text ??= $read("text/{$lang}.json");
    $library = resource_path('icons/history-line');

    // story.json paths are the art folder's (plates/x.png); the library keeps them as webp by kind.
    $ref = function (?string $path, string $kind) use ($library): ?string {
        $name = $path === null ? null : "{$kind}/tasman/".pathinfo($path, PATHINFO_FILENAME);

        return $name !== null && is_file("{$library}/{$name}.webp") ? "history-line/{$name}" : null;
    };

    $panels = [];
    foreach ($story['scenes'] as $scene) {
        $words = $text['scenes'][$scene['id']] ?? throw new UnexpectedValueException(
            "Tasman text/{$lang}.json has no scene {$scene['id']}."
        );
        foreach ($scene['panels'] as $i => $panel) {
            $lines = [];
            if ($i === 0 && ($words['narrator'] ?? '') !== '') {
                $lines[] = ['narrator', $words['narrator']];
            }
            foreach ($panel['lines'] as $line) {
                $said = $words['lines'][$line['id']] ?? throw new UnexpectedValueException(
                    "Tasman text/{$lang}.json has no line {$line['id']}."
                );
                $lines[] = isset($line['bubble'])
                    ? [$line['speaker'], $said, [$line['bubble'], $words['bubbles'][$line['id']] ?? throw new UnexpectedValueException(
                        "Tasman text/{$lang}.json has no balloon for {$line['id']}."
                    )]]
                    : [$line['speaker'], $said];
            }

            $layers = [];
            foreach ($panel['ships'] as $ship) {
                if ($asset = $ref($ship['file'], 'props')) {
                    // Boats sit IN the water (blend-into-scene boat preset).
                    // The ship's own values (assets.json) first: `+` keeps the left key, so they win over the preset.
                    $layers[] = array_intersect_key($ship, array_flip(['x', 'y', 'height', 'depth', 'ambient', 'ambient_amount', 'waterline', 'frames', 'frames_play']))
                        + ['asset' => $asset, 'anim' => 'fade',
                            // Waterline = share of the picture under the sea: the painted hulls run to the keel,
                            // so 0.07 puts the sea at the lower hull curve (0.15 drowned the gun ports).
                            'waterline' => 0.07, 'reflection' => 0.35, 'contact_shadow' => 0.4, 'color_match' => 0.35,
                            // Foam where the hull meets the water; the wake shows progress (0 = at anchor).
                            'foam' => 0.5, 'speed' => (float) ($ship['speed'] ?? 0)]
                        // Art painted facing left is mirrored, so its bow wave sits at the bow.
                        + (! empty($ship['flip']) ? ['flip_x' => true] : []);
                }
            }
            // Bart's Figma cut-outs, standing on the plate: ground = feet line, height in % of the stage.
            // A speaker's figure gets the balloon tail only in a panel where that speaker has a balloon.
            $talkers = array_filter(array_column($panel['lines'], 'bubble'));
            foreach ($panel['people'] ?? [] as $person) {
                if ($asset = $ref($person['file'], 'figures')) {
                    $layers[] = ['asset' => $asset, 'x' => $person['x'], 'y' => $person['ground'] - $person['height'] / 2,
                        'height' => $person['height'], 'depth' => 1.0, 'anim' => 'fade',
                        // People stand on the plate (figure preset); a figure cut at the frame edge has no feet to shadow.
                        'color_match' => 0.3] + ($person['ground'] <= 100 ? ['contact_shadow' => 0.5] : [])
                        + (in_array($person['speaks'] ?? null, $talkers, true) ? ['speaks' => $person['speaks']] : [])
                        + (! empty($person['flip']) ? ['flip' => true] : []);
                }
            }
            if ($asset = $ref($panel['figures'], 'figures')) {
                // A group picture painted at the plate's camera: it covers the whole stage.
                $layers[] = ['asset' => $asset, 'x' => 50, 'y' => 50, 'height' => 100, 'depth' => 1.0, 'anim' => 'fade']
                    + (isset($panel['mouths']) ? ['speaks' => $panel['mouths']] : []);
            }

            // A power-meter moment (MomentSpec): its shape in story.json, its words in text/{lang}.json.
            // `ship` points at one of this panel's ships; a ship not painted yet moves nothing.
            $moment = null;
            if (isset($panel['moment'])) {
                $m = $panel['moment'];
                $said = $text['moments'][$m['id']] ?? throw new UnexpectedValueException("Tasman text/{$lang}.json has no moment {$m['id']}.");
                $ship = fn (array $part): ?string => isset($part['ship'], $panel['ships'][$part['ship']])
                    ? $ref($panel['ships'][$part['ship']]['file'], 'props') : null;
                $moment = [
                    'name' => $said['name'], 'meter_label' => $said['meter_label'], 'prompt' => $said['prompt'],
                    'words' => ['right' => $said['right'], 'wrong' => $said['wrong']],
                    'after' => $said['after'], 'why' => $said['why'] ?? '',
                    'react' => ['layer' => $ship($m['react'] ?? [])] + array_diff_key($m['react'] ?? [], ['ship' => 1]),
                    'payoff' => ['layer' => $ship($m['payoff'] ?? [])] + array_diff_key($m['payoff'] ?? [], ['ship' => 1]),
                    // A harbour race: its lanes and lines in story.json, the narrator's line after it here.
                    'race' => isset($m['race']) ? $m['race'] + ['after' => $said['race_after'] ?? '', 'after_solo' => $said['race_after_solo'] ?? ''] : null,
                ] + array_diff_key($m, array_flip(['id', 'react', 'payoff', 'race']));
                $moment = array_filter($moment, fn ($v): bool => $v !== null);
            }

            $backdrop = $ref($panel['plate'], 'backdrops');
            // A camera needs a picture to move over; a panel still being painted plays without one.
            $pictured = $backdrop !== null || $layers !== [];
            $panels[$scene['id']][] = array_filter([
                'type' => 'story',
                'chapter' => $words['title'],
                'location' => $words['date_ui'] ?: null,
                'backdrop' => $backdrop,
                'layers' => $layers ?: null,
                'lines' => $lines ?: [['narrator', $words['title']]],
                'camera' => $pictured ? ($panel['camera'] ?? null) : null,
                'entry' => $pictured ? ($panel['entry'] ?? null) : null,
                'moment' => $moment,
            ], fn ($v): bool => $v !== null);
        }
    }

    $scenes = [];
    foreach ($story['sequence'] as $step) {
        if (str_starts_with($step, 'game:')) {
            $game = $text['games'][substr($step, 5)] ?? throw new UnexpectedValueException("Tasman text/{$lang}.json has no {$step}.");
            $scenes[] = ['type' => 'team'] + $game;
        } else {
            array_push($scenes, ...($panels[$step] ?? throw new UnexpectedValueException("Tasman story.json has no scene {$step}.")));
        }
    }

    return [
        'key' => "Abel Tasman, de reis naar het onbekende ({$lang})",
        'title' => $text['title'],
        // The line under the title on the title screen: the lesson's central question.
        'details' => $text['intro'] ?? null,
        // "What you can expect" on the title screen: 1-3 short lines (the banner's white strip).
        // A language without them leaves the teacher's own lines alone.
        ...(isset($text['expect']) ? ['expect' => $text['expect']] : []),
        'subject' => 'history',
        'language' => $lang,
        'translation_group' => 'tasman-standard',
        'grade_level' => '7',
        'tone' => 'adventurous',
        'avatar' => 'serge-de-beer',
        'scenes' => $scenes,
        'cast' => array_map(
            fn (array $c): array => ['voice' => array_filter((array) ($c['voice'] ?? []), 'is_string')],
            array_diff_key($cast, ['_note' => 1, 'narrator' => 1]),
        ),
    ];
};
