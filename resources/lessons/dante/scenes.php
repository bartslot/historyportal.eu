<?php

declare(strict_types=1);

/**
 * Dante Alighieri: the visual skeleton, shared by every language. Keyed by scene id, in play order.
 * The words (chapter, location, script, questions, label names) live in text/{lang}.php.
 *
 * Every picture comes from the shared history-line library (resources/art/manifests/dante.php →
 * `php artisan art:make dante` → `php artisan icons:import --collection=history-line`): an empty
 * backdrop plus cut-out figures placed as layers, so the same street, clouds and people are reused
 * across scenes and by later lessons. Layer x/y is the CENTRE of the cut-out in % of the stage and
 * height is % of stage height, so a figure standing on ground line G has y = G - height / 2. A
 * half-length figure (cut at the knee in its sheet) sits with its bottom edge on the frame edge.
 */
$h = 'history-line';

/** A cloud that drifts slowly; depth < 1 keeps it far away in the parallax. */
$cloud = fn (int $n, float $x, float $y, float $height) => [
    'asset' => "{$h}/nature/tuscany/nuvola-{$n}", 'x' => $x, 'y' => $y, 'height' => $height,
    'depth' => 0.3, 'ambient' => 'drift', 'anim' => 'fade',
];
$birds = fn (float $x, float $y) => [
    'asset' => "{$h}/nature/tuscany/stormo", 'x' => $x, 'y' => $y, 'height' => 7,
    'depth' => 0.5, 'ambient' => 'flutter', 'anim' => 'fade', 'anim_delay' => 1.2,
];
/** A standing person: $ground is where the feet are, in % of stage height. */
$person = fn (string $ref, float $x, float $ground, float $height, float $delay = 0.3, array $extra = []) => [
    'asset' => "{$h}/figures/{$ref}", 'x' => $x, 'y' => $ground - $height / 2, 'height' => $height,
    'depth' => 1.0, 'anim' => 'fade', 'anim_delay' => $delay, 'ambient' => 'bob', 'ambient_amount' => 0.3,
] + $extra;

return [
    'pre-quiz' => ['type' => 'quiz', 'when' => 'pre'],

    'firenze-1265' => [
        'type' => 'story', 'year' => 1265,
        'backdrop' => "{$h}/backdrops/florence/firenze-strada",
        'layers' => [
            $cloud(1, 46, 7, 8),
            $cloud(2, 64, 13, 7),
            $birds(55, 22),
            $person('citizens/frate', 75, 93, 28, 0.9, ['depth' => 0.9]),
            $person('citizens/mercante', 30, 92, 42, 0.4),
            $person('citizens/donna-fiorentina', 64, 92, 40, 0.7),
        ],
    ],
    'poesia-beatrice' => [
        'type' => 'story', 'year' => 1285,
        'backdrop' => "{$h}/backdrops/florence/lungarno",
        'layers' => [
            $cloud(3, 30, 10, 8),
            $birds(70, 16),
            $person('dante/guido-cavalcanti', 88, 100, 50, 0.9, ['depth' => 1.05]),
            $person('dante/beatrice', 63, 100, 64, 1.4, ['depth' => 1.1]),
            // Half-length: bottom edge on the frame edge.
            ['asset' => "{$h}/figures/dante/dante-giovane", 'x' => 26, 'y' => 64, 'height' => 72,
                'depth' => 1.15, 'anim' => 'slide-right', 'anim_delay' => 0.3],
        ],
    ],
    // Told in lines, not one script (SceneDialogue): a figure layer that `speaks` gets that
    // speaker's balloons. Guido has no layer: his answer arrives on paper, so his balloon speaks
    // from off-frame.
    'il-foglio' => [
        'type' => 'story', 'year' => 1283,
        'backdrop' => "{$h}/backdrops/florence/lungarno",
        'layers' => [
            $cloud(2, 44, 9, 8),
            $person('dante/beatrice', 68, 100, 64, 0.3, ['depth' => 1.1, 'speaks' => 'beatrice']),
            ['asset' => "{$h}/figures/dante/dante-giovane", 'x' => 24, 'y' => 64, 'height' => 72,
                'depth' => 1.15, 'anim' => 'slide-right', 'anim_delay' => 0.3, 'speaks' => 'dante'],
        ],
    ],
    'campaldino-1289' => [
        'type' => 'story', 'year' => 1289,
        'backdrop' => "{$h}/backdrops/tuscany/campaldino-piana",
        'layers' => [
            $cloud(1, 30, 10, 10),
            $cloud(2, 78, 7, 9),
            $person('soldiers/cavaliere-guelfo', 70, 80, 34, 0.9, ['depth' => 0.8]),
            $person('soldiers/fante', 86, 84, 34, 1.1, ['depth' => 0.9]),
            ['asset' => "{$h}/props/medieval/stendardo", 'x' => 54, 'y' => 60, 'height' => 30,
                'depth' => 0.9, 'anim' => 'fade', 'anim_delay' => 1.3, 'ambient' => 'breeze', 'ambient_amount' => 1.4],
            $person('dante/dante-cavaliere', 30, 100.5, 60, 0.3, ['depth' => 1.1, 'ambient_amount' => 0.5]),
            ['asset' => "{$h}/nature/tuscany/erba", 'x' => 8, 'y' => 92, 'height' => 16,
                'depth' => 1.4, 'ambient' => 'breeze'],
        ],
    ],
    'mappa-fazioni' => [
        'type' => 'map', 'year' => 1295, 'qid' => 'Q38', 'projection' => 'mercator',
        'labels' => [
            'firenze' => [11.2558, 43.7696],
            'arezzo' => [11.8807, 43.4633],
            'campaldino' => [11.7422, 43.7244],
            'siena' => [11.3308, 43.3188],
            'pisa' => [10.4017, 43.7228],
            'roma' => [12.4964, 41.9028],
        ],
    ],
    'priore-1300' => [
        'type' => 'story', 'year' => 1300,
        'backdrop' => "{$h}/backdrops/florence/sala-priori",
        'layers' => [
            $person('power/priore', 30, 94, 56, 0.4),
            $person('dante/dante-legge', 58, 94, 58, 0.8),
            $person('power/messo', 84, 94, 50, 1.4, ['anim' => 'slide-left']),
        ],
    ],
    'esilio-1302' => [
        'type' => 'story', 'year' => 1302,
        'backdrop' => "{$h}/backdrops/italy/strada-appennino",
        'layers' => [
            $cloud(1, 42, 8, 9),
            $cloud(3, 68, 14, 7),
            $birds(80, 20),
            ['asset' => "{$h}/nature/tuscany/cipresso", 'x' => 88, 'y' => 58, 'height' => 52,
                'depth' => 1.0, 'ambient' => 'breeze'],
            $person('dante/dante-cammina', 42, 90, 46, 0.4, ['anim' => 'slide-right', 'anim_duration' => 2200]),
            ['asset' => "{$h}/nature/tuscany/erba", 'x' => 14, 'y' => 93, 'height' => 15,
                'depth' => 1.4, 'ambient' => 'breeze'],
        ],
    ],
    'mappa-esilio' => [
        'type' => 'map', 'year' => 1305, 'qid' => 'Q38', 'projection' => 'mercator',
        'labels' => [
            'firenze' => [11.2558, 43.7696],
            'verona' => [10.9916, 45.4384],
            'lunigiana' => [9.9478, 44.2167],
            'casentino' => [11.8167, 43.7333],
            'bologna' => [11.3426, 44.4949],
            'padova' => [11.8768, 45.4064],
            'ravenna' => [12.1994, 44.4184],
        ],
    ],
    'commedia-nasce' => [
        'type' => 'story', 'year' => 1306,
        'backdrop' => "{$h}/backdrops/interiors/scrittoio",
        'layers' => [
            $person('dante/dante-scrive', 40, 96, 62, 0.3, ['ambient' => 'none']),
        ],
    ],
    'commedia-galleria' => [
        'type' => 'gallery', 'year' => 1310,
        'images' => [
            "asset:{$h}/backdrops/commedia/dore-inferno",
            "asset:{$h}/backdrops/commedia/dore-purgatorio",
            "asset:{$h}/backdrops/commedia/dore-paradiso",
        ],
    ],
    'volgare' => [
        'type' => 'story', 'year' => 1312,
        // The same Florentine street and townspeople as the opening scene: now they can read him.
        'backdrop' => "{$h}/backdrops/florence/firenze-strada",
        'layers' => [
            $cloud(2, 52, 9, 9),
            $person('citizens/frate', 78, 93, 28, 1.2, ['depth' => 0.9]),
            $person('citizens/mercante', 22, 93, 42, 0.8),
            $person('citizens/donna-fiorentina', 70, 93, 40, 1.0),
            $person('dante/dante-legge', 47, 95, 54, 0.3),
        ],
    ],
    'ravenna-1321' => [
        'type' => 'story', 'year' => 1321,
        'backdrop' => "{$h}/backdrops/ravenna/ravenna",
        'layers' => [
            $cloud(1, 82, 7, 8),
            $birds(30, 18),
            ['asset' => "{$h}/nature/tuscany/cipresso", 'x' => 90, 'y' => 60, 'height' => 50,
                'depth' => 1.0, 'ambient' => 'breeze'],
            ['asset' => "{$h}/figures/dante/dante-esule", 'x' => 24, 'y' => 64, 'height' => 72,
                'depth' => 1.15, 'anim' => 'fade', 'anim_delay' => 0.4, 'anim_duration' => 1800],
        ],
    ],
    'eredita' => [
        'type' => 'story', 'year' => 2021,
        'backdrop' => "{$h}/backdrops/commedia/michelino-tre-regni",
        'layers' => [
            ['asset' => "{$h}/props/medieval/corona-alloro", 'x' => 88, 'y' => 16, 'height' => 18,
                'depth' => 0.8, 'anim' => 'pop', 'anim_delay' => 2.5, 'ambient' => 'bob', 'ambient_amount' => 0.6],
        ],
    ],

    'post-quiz' => ['type' => 'quiz', 'when' => 'post'],
];
