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
        // Who speaks in the scenes told in lines (SceneDialogue): Azure voices, never American, each
        // distinct from the narrator of that language.
        'cast' => [
            'dante' => ['voice' => [
                'it' => 'it-IT-Giuseppe:DragonHDLatestNeural', 'en' => 'en-GB-Ryan:DragonHDLatestNeural',
                'de' => 'de-DE-Klaus:MAI-Voice-2', 'nl' => 'nl-NL-Sander:MAI-Voice-2',
            ]],
            'beatrice' => ['voice' => [
                'it' => 'it-IT-Isabella:DragonHDLatestNeural', 'en' => 'en-GB-Ada:DragonHDLatestNeural',
                'de' => 'de-DE-Seraphina:DragonHDLatestNeural', 'nl' => 'nl-NL-Fleur:MAI-Voice-2',
            ]],
            'guido' => ['voice' => [
                'it' => 'it-IT-Luca:MAI-Voice-2', 'en' => 'en-GB-ElliotNeural',
                'de' => 'de-DE-KillianNeural', 'nl' => 'nl-NL-MaartenNeural',
            ]],
        ],
        // Dutch lessons are read by Ron Slot's cloned ElevenLabs voice (house rule); the other
        // languages have no narrator and fall through to Azure's native HD voice for the locale.
    ] + ($lang === 'nl' ? ['avatar' => 'ron-slot'] : []);
};
