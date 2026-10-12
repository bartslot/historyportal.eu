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
        if ($path === null) {
            return null;
        }
        $ref = "history-line/{$kind}/tasman/".pathinfo($path, PATHINFO_FILENAME);

        return is_file($library.'/'.substr($ref, strlen('history-line/')).'.webp') ? $ref : null;
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
                $lines[] = [$line['speaker'], $words['lines'][$line['id']] ?? throw new UnexpectedValueException(
                    "Tasman text/{$lang}.json has no line {$line['id']}."
                )];
            }

            $layers = [];
            foreach ($panel['ships'] as $ship) {
                if ($asset = $ref($ship, 'props')) {
                    $layers[] = ['asset' => $asset, 'x' => 50, 'y' => 46, 'height' => 40, 'depth' => 0.6,
                        'ambient' => 'bob', 'ambient_amount' => 0.6, 'anim' => 'fade'];
                }
            }
            if ($asset = $ref($panel['figures'], 'figures')) {
                // A group picture painted at the plate's camera: it covers the whole stage.
                $layers[] = ['asset' => $asset, 'x' => 50, 'y' => 50, 'height' => 100, 'depth' => 1.0, 'anim' => 'fade']
                    + (isset($panel['mouths']) ? ['speaks' => $panel['mouths']] : []);
            }

            $panels[$scene['id']][] = array_filter([
                'type' => 'story',
                'chapter' => $words['title'],
                'location' => $words['date_ui'] ?: null,
                'backdrop' => $ref($panel['plate'], 'backdrops'),
                'layers' => $layers ?: null,
                'lines' => $lines ?: [['narrator', $words['title']]],
                'camera' => $panel['camera'] ?? null,
                'entry' => $panel['entry'] ?? null,
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
        'subject' => 'history',
        'language' => $lang,
        'translation_group' => 'tasman-standard',
        'grade_level' => '7',
        'tone' => 'adventurous',
        'avatar' => 'robin-meesterverteller',
        'scenes' => $scenes,
        'cast' => array_map(
            fn (array $c): array => ['voice' => array_filter((array) ($c['voice'] ?? []), 'is_string')],
            array_diff_key($cast, ['_note' => 1, 'narrator' => 1]),
        ),
    ];
};
