<?php

declare(strict_types=1);

/**
 * Dante Alighieri: the visual skeleton, shared by every language. Keyed by scene id, in play order.
 * The words (chapter, location, script, questions, label names) live in text/{lang}.php.
 *
 * PLACEHOLDER imagery: story scenes use sourced `image` fallbacks so the lesson composes before
 * the history-line art pack exists. Swap in `backdrop` + `layers` once it does.
 */
return [
    'pre-quiz' => ['type' => 'quiz', 'when' => 'pre'],

    'firenze-1265' => [
        'type' => 'story', 'year' => 1265, 'prefer' => 'art',
        'image' => 'commons:Dante Domenico di Michelino Duomo Florence.jpg',
    ],
    'poesia-beatrice' => [
        'type' => 'story', 'year' => 1285, 'prefer' => 'art',
        'image' => 'Dante and Beatrice Henry Holiday',
    ],
    'campaldino-1289' => [
        'type' => 'story', 'year' => 1289, 'prefer' => 'art',
        'image' => 'Battle of Campaldino',
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
        'type' => 'story', 'year' => 1300, 'prefer' => 'art',
        'image' => 'Palazzo Vecchio Florence',
    ],
    'esilio-1302' => [
        'type' => 'story', 'year' => 1302, 'prefer' => 'art',
        'image' => 'Dante in exile',
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
        'type' => 'story', 'year' => 1306, 'prefer' => 'art',
        'image' => 'Dante Alighieri portrait Botticelli',
    ],
    'commedia-galleria' => [
        'type' => 'gallery', 'year' => 1310, 'prefer' => 'art',
        'images' => ['Gustave Doré Inferno', 'Botticelli Map of Hell', 'Dante and Virgil'],
    ],
    'volgare' => [
        'type' => 'story', 'year' => 1312, 'prefer' => 'art',
        'image' => 'Divina Commedia manuscript',
    ],
    'ravenna-1321' => [
        'type' => 'story', 'year' => 1321, 'prefer' => 'art',
        'image' => 'Tomba di Dante Ravenna',
    ],
    'eredita' => [
        'type' => 'story', 'year' => 2021, 'prefer' => 'photo',
        'image' => 'Dante statue Piazza Santa Croce Florence',
    ],

    'post-quiz' => ['type' => 'quiz', 'when' => 'post'],
];
