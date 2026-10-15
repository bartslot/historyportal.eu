<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Facades\File;

/**
 * The click-through product tour on the About page: real screenshots of the app, one part of each
 * highlighted, a card with Back / Next beside it. A visitor sees how History Portal works without an
 * account and without touching the backend; every picture is a static file.
 *
 * Screenshots and the highlight rectangles are captured together by `php artisan help:screenshots`
 * (see CaptureHelpScreenshots + tests/playwright/help-screenshots.spec.ts). The rectangle is measured
 * from the element's real position in the page, so a recapture after a UI change moves the highlight
 * with it. A step whose rectangle is missing shows a centred card over the picture instead.
 */
final class ProductTour
{
    public const EXTENSION = '.jpg';

    /**
     * What the capture command shoots. `page` names the screen, `highlight` is the CSS selector of
     * the element the step spotlights; `a || b` takes the first one that is on screen. Pages and
     * lessons are resolved in the capture command.
     */
    public const SHOTS = [
        'tour-create' => [
            'page' => 'create',
            'highlights' => ['topic' => '#lw-topic', 'voyage' => '[data-tour="voyage-start"]'],
        ],
        'tour-story' => ['page' => 'wizard-story', 'highlights' => ['arc' => '[data-tour="story-arc"]']],
        'tour-generate' => [
            'page' => 'wizard-generate',
            'highlights' => ['workshop' => '[aria-labelledby="generation-process-title"]'],
        ],
        'tour-editor' => [
            'page' => 'wizard-editor',
            'highlights' => [
                'rail' => '#timeline-track',
                'canvas' => '#lesson-canvas-root',
                'inspector' => '[x-ref="inspectorPanel"]',
                'publish' => '[data-tour="publish"]',
            ],
        ],
        // Poster title screens carry the code on the QR plate; plain ones print it under the title.
        'tour-title' => ['page' => 'player-title', 'highlights' => ['code' => '[data-title-qr] || [data-title-code]']],
        'tour-scene' => ['page' => 'player-scene', 'highlights' => ['controls' => '[data-player-chrome="bottom"]']],
        'tour-quiz' => ['page' => 'player-quiz', 'highlights' => ['quiz' => '.qz-card']],
    ];

    /**
     * The steps, in order. `placement` is the preferred side of the card, as in the welcome tour.
     *
     * @return list<array{shot: string, highlight: ?string, placement: string, title: string, body: string}>
     */
    public static function definitions(): array
    {
        return [
            self::step('tour-create', 'topic', 'bottom',
                __('Start with what your class is studying'),
                __('Pick a topic from the catalog. Every fact comes from checked source text.')),
            self::step('tour-create', 'voyage', 'bottom',
                __('Or follow a real voyage'),
                __('Sail an actual expedition across the map, ready to edit in seconds.')),
            self::step('tour-story', 'arc', 'bottom',
                __('Choose how the story unfolds'),
                __('A hero\'s journey, a mystery, or a story in which your class decides which way it goes.')),
            self::step('tour-generate', 'workshop', 'left',
                __('Watch the first draft appear'),
                __('Script, pictures, narration and quiz are drafted from the source text in a few minutes.')),
            self::step('tour-editor', 'rail', 'right',
                __('The whole lesson, scene by scene'),
                __('Open any scene to change it. Nothing is final until you say so.')),
            self::step('tour-editor', 'canvas', 'bottom',
                __('See each scene the way your class will'),
                __('What you change here is exactly what appears on the board.')),
            self::step('tour-editor', 'inspector', 'left',
                __('Swap a picture in one click'),
                __('Real paintings and maps from museum collections, matched to the period of the scene.')),
            self::step('tour-editor', 'publish', 'left',
                __('Your class sees it when you are ready'),
                __('Nothing reaches your students until you publish the lesson.')),
            self::step('tour-title', 'code', 'bottom',
                __('Your class joins with one code'),
                __('Put the lesson on the board, or let students open it on their own laptop, tablet or phone.')),
            self::step('tour-scene', 'controls', 'top',
                __('The narrator tells the story'),
                __('Painted scenes and a narrator carry the lesson. Pause, go back or turn on subtitles whenever you want.')),
            self::step('tour-quiz', 'quiz', 'right',
                __('Then your class plays'),
                __('Quizzes and team games check what stuck, and the answers come back to you as results.')),
        ];
    }

    /**
     * Steps ready for the page: each with its picture URL and highlight rectangle in percent of the
     * picture. Steps whose picture has never been captured are left out, so a fresh checkout shows
     * a shorter tour rather than broken images.
     *
     * @return list<array{image: string, rect: ?array{x: float, y: float, w: float, h: float}, placement: string, title: string, body: string}>
     */
    public static function steps(?string $locale = null): array
    {
        $steps = [];

        foreach (self::definitions() as $step) {
            $found = HelpMedia::find($step['shot'], $locale, self::EXTENSION);

            if ($found === null) {
                continue;
            }

            $steps[] = [
                'image' => asset($found['relative']).'?v='.File::lastModified(public_path($found['relative'])),
                // Rectangles come from the same language as the picture, never from another set.
                'rect' => self::rect($found['locale'], $step['shot'], $step['highlight']),
                'placement' => $step['placement'],
                'title' => $step['title'],
                'body' => $step['body'],
            ];
        }

        return $steps;
    }

    /** File the capture writes next to a picture: highlight name => rectangle in percent. */
    public static function rectsPath(string $locale, string $shot): string
    {
        return HelpMedia::directoryFor($locale)."/{$shot}.rects.json";
    }

    /** @return array{x: float, y: float, w: float, h: float}|null */
    private static function rect(string $locale, string $shot, ?string $highlight): ?array
    {
        $path = self::rectsPath($locale, $shot);

        if ($highlight === null || ! File::exists($path)) {
            return null;
        }

        $rect = json_decode(File::get($path), true)[$highlight] ?? null;

        if (! is_array($rect)) {
            return null;
        }

        $values = array_map(fn ($key) => $rect[$key] ?? null, ['x', 'y', 'w', 'h']);

        // A rectangle with a missing or nonsense side would spotlight nothing; centre the card instead.
        foreach ($values as $value) {
            if (! is_numeric($value) || $value < 0 || $value > 100) {
                return null;
            }
        }

        [$x, $y, $w, $h] = array_map('floatval', $values);

        return $w > 0 && $h > 0 ? ['x' => $x, 'y' => $y, 'w' => $w, 'h' => $h] : null;
    }

    /** @return array{shot: string, highlight: ?string, placement: string, title: string, body: string} */
    private static function step(string $shot, ?string $highlight, string $placement, string $title, string $body): array
    {
        return compact('shot', 'highlight', 'placement', 'title', 'body');
    }
}
