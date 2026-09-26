<?php

declare(strict_types=1);

/**
 * Dante Alighieri in any language: the visual skeleton (scenes.php, one per scene id, in play
 * order) merged with that language's words (text/{lang}.php). A text out of step with the
 * skeleton throws, so a language can never ship a lesson with a scene quietly missing.
 *
 * $text is injectable for tests; normally it is read from text/{lang}.php.
 */
return function (string $lang, ?array $text = null): array {
    $skeleton = require __DIR__.'/scenes.php';
    $text ??= require __DIR__."/text/{$lang}.php";
    $words = (array) ($text['scenes'] ?? []);

    $missing = array_diff(array_keys($skeleton), array_keys($words));
    $extra = array_diff(array_keys($words), array_keys($skeleton));
    if ($missing || $extra) {
        throw new UnexpectedValueException("Dante text/{$lang}.php is out of step with scenes.php"
            .($missing ? '; missing: '.implode(', ', $missing) : '')
            .($extra ? '; not in the skeleton: '.implode(', ', $extra) : ''));
    }

    $scenes = [];
    foreach ($skeleton as $id => $visual) {
        $scene = ['id' => $id] + $visual + $words[$id];

        // Coordinates come from the skeleton, the words from the text: ['firenze' => [lng, lat]]
        // + ['firenze' => 'Florence'] → the composer's [['Florence', lng, lat], ...].
        if (isset($visual['labels'])) {
            $names = (array) ($words[$id]['labels'] ?? []);
            $scene['labels'] = [];
            foreach ($visual['labels'] as $key => [$lng, $lat]) {
                $scene['labels'][] = [$names[$key] ?? throw new UnexpectedValueException(
                    "Dante text/{$lang}.php: scene '{$id}' has no label for '{$key}'."
                ), $lng, $lat];
            }
        }

        $scenes[] = $scene;
    }

    return [
        'key' => "Dante Alighieri ({$lang})",
        'title' => $text['title'],
        'subject' => 'history',
        'language' => $lang,
        'translation_group' => 'dante',
        'grade_level' => (string) $text['grade_level'],
        'scenes' => $scenes,
    ];
};
