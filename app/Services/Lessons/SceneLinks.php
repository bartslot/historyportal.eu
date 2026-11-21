<?php

declare(strict_types=1);

namespace App\Services\Lessons;

/**
 * Scene links: choices at the end of a scene that jump to any scene of the same lesson, the way a Twine
 * passage links to other passages (Bart 2026-11-21). Stored on the scene as config.links = [{label, to}]
 * and config.ending = true; the player reads them in resources/js/scene/scene-links.js.
 *
 * A link with no words, when it is the only one, is a straight jump with no stop. A link to a scene that is
 * not in the lesson is dropped here, and the player skips one that went missing later.
 */
final class SceneLinks
{
    /** A scene shows at most this many choices: more do not fit one class screen. */
    public const MAX_LINKS = 6;

    /** The words on one button. */
    public const LABEL_MAX = 120;

    /**
     * The links worth keeping: a known target and a trimmed label, at most MAX_LINKS.
     * A blank target is kept while the teacher is still picking one (`to` null), so a new row does not vanish.
     *
     * @param  mixed  $links  whatever config.links holds
     * @param  list<int>  $sceneIds  the lesson's scenes
     * @return list<array{label: string, to: int|null}>
     */
    public static function clean(mixed $links, array $sceneIds): array
    {
        if (! is_array($links)) {
            return [];
        }
        $known = array_flip(array_map('intval', $sceneIds));
        $out = [];
        foreach ($links as $link) {
            if (! is_array($link)) {
                continue;
            }
            $to = is_numeric($link['to'] ?? null) ? (int) $link['to'] : null;
            if ($to !== null && ! isset($known[$to])) {
                $to = null;
            }
            $out[] = ['label' => self::label($link['label'] ?? ''), 'to' => $to];
            if (count($out) === self::MAX_LINKS) {
                break;
            }
        }

        return $out;
    }

    public static function label(mixed $text): string
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', strip_tags(is_scalar($text) ? (string) $text : '')));

        return mb_substr($text, 0, self::LABEL_MAX);
    }

    /**
     * The scene config with these links (and the ending flag) written in; an empty list or a false
     * ending removes the key, so a scene without links looks exactly as it did before.
     *
     * @param  array<string, mixed>|null  $config
     * @param  list<array{label: string, to: int|null}>  $links
     * @return array<string, mixed>
     */
    public static function into(?array $config, array $links, bool $ending): array
    {
        $config ??= [];
        unset($config['links'], $config['ending']);
        if ($links !== []) {
            $config['links'] = array_values($links);
        } else {
            // What the narrator says over the choices goes with them (App\Services\Lessons\ChoicePrompt).
            unset($config['links_prompt'], $config['links_audio']);
        }
        if ($ending) {
            $config['ending'] = true;
        }

        return $config;
    }
}
