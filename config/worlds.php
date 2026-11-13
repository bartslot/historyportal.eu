<?php

declare(strict_types=1);

/*
 * The ready-made worlds a teacher can put under a stage25d scene (Bart 11-11: "a combination of the backdrop: sky, far
 * plane and the ground plane with blocking planes"). A world is a period library (bundle) and the parts of a set that
 * make the place: sky, terrain (groundSlots), ground strips (groundBands) and the backdrop and screens standing in it
 * (layers). Picking one puts those parts in the scene and keeps every layer the teacher placed (EditsStage25d
 * pickStage25dWorld). Its layers arrive as ordinary layers marked world: true, so each can still be moved, swapped or
 * deleted. look: scene look values the world needs (only the panel's keys). thumb: a 320x180 render of the world on a
 * stage, in public/worlds/.
 *
 * The splat worlds (public/worlds/*.spz) are no longer offered: they cost too much (Bart 11-11). A scene that has one
 * keeps showing it (config.stage25d.world); picking a world or None takes it away.
 */
return [
    'stormy-sea' => [
        'label' => 'Stormy sea', 'bundle' => 'tasman-1642', 'thumb' => 'worlds/stormy-sea.webp',
        'set' => [
            'sky' => 'sky-storm-01',
            'groundSlots' => [['asset' => 'sea-terrain-rough-02', 'from_m' => 0]],
            'layers' => [
                ['asset' => 'bg-sea-storm-01', 'depth' => 'bg', 'x' => 0.5],
                ['asset' => 'wave-band-far-01', 'depth' => 'mid', 'x' => 0.5, 'z' => 70],
                ['asset' => 'wave-band-mid-01', 'depth' => 'mid', 'x' => 0.5, 'z' => 40],
            ],
        ],
    ],
    'calm-sea' => [
        'label' => 'Calm sea', 'bundle' => 'tasman-1642', 'thumb' => 'worlds/calm-sea.webp', 'look' => ['grass' => 0],
        'set' => [
            'sky' => 'sky-clear-01',
            'groundSlots' => [['asset' => 'sea-terrain-swell-02', 'from_m' => 0]],
            'layers' => [['asset' => 'bg-sea-calm-01', 'depth' => 'bg', 'x' => 0.5]],
        ],
    ],
    'farmland' => [
        'label' => 'Farmland', 'bundle' => 'nl-prehistory', 'thumb' => 'worlds/farmland.webp',
        'set' => [
            'sky' => 'sky-summer-01',
            'groundSlots' => [['asset' => 'terrain-meadow-02', 'from_m' => 0], ['asset' => 'terrain-grain-field-02', 'from_m' => 30]],
            'layers' => [['asset' => 'bg-farmland-01', 'depth' => 'bg', 'x' => 0.5]],
        ],
    ],
    'forest-edge' => [
        'label' => 'Forest edge', 'bundle' => 'nl-prehistory', 'thumb' => 'worlds/forest-edge.webp',
        'set' => [
            'sky' => 'sky-summer-01',
            'groundSlots' => [['asset' => 'terrain-woodland-floor-02', 'from_m' => 0]],
            'groundBands' => [['asset' => 'trb-woodland-grass-band-01', 'z' => 30, 'scale' => 0.4]],
            'layers' => [
                ['asset' => 'trb-forest-backdrop-01', 'depth' => 'bg', 'x' => 0.5, 'scale' => 0.764],
                ['asset' => 'trb-woodland-screen-01', 'depth' => 'mid', 'x' => 0.5, 'z' => 32],
            ],
        ],
    ],
    'heath' => [
        'label' => 'Heath', 'bundle' => 'nl-prehistory', 'thumb' => 'worlds/heath.webp',
        'set' => [
            'sky' => 'sky-overcast-01',
            'groundSlots' => [['asset' => 'terrain-heath-02', 'from_m' => 0]],
            'layers' => [['asset' => 'trb-forest-backdrop-01', 'depth' => 'bg', 'x' => 0.5, 'scale' => 0.764]],
        ],
    ],
    'polder' => [
        'label' => 'Polder', 'bundle' => 'nl-golden-age', 'thumb' => 'worlds/polder.webp',
        'set' => [
            'sky' => 'sky-wind-01',
            'groundSlots' => [['asset' => 'terrain-polder-02', 'from_m' => 0]],
            'layers' => [['asset' => 'bg-city-01', 'depth' => 'bg', 'x' => 0.5]],
        ],
    ],
    'dunes' => [
        'label' => 'Dunes', 'bundle' => 'nl-golden-age', 'thumb' => 'worlds/dunes.webp',
        'set' => [
            'sky' => 'sky-summer-01',
            'groundSlots' => [['asset' => 'terrain-dunes-02', 'from_m' => 0]],
            'layers' => [['asset' => 'bg-coast-01', 'depth' => 'bg', 'x' => 0.5]],
        ],
    ],
    'alpine-pass' => [
        'label' => 'Alpine pass', 'bundle' => 'punic-alps-218', 'thumb' => 'worlds/alpine-pass.webp',
        'set' => [
            'sky' => 'sky-overcast-01',
            'groundSlots' => [['asset' => 'terrain-alpine-scree-01', 'from_m' => 0]],
            'groundBands' => [['asset' => 'pa-deep-pass-path-strip-01', 'z' => 30]],
            'layers' => [
                ['asset' => 'pa-snowy-peaks-backdrop-01', 'depth' => 'bg', 'x' => 0.5],
                ['asset' => 'pa-scree-bank-screen-01', 'depth' => 'mid', 'x' => 0.5, 'z' => 38],
            ],
        ],
    ],
    'mesopotamian-fields' => [
        'label' => 'Mesopotamian fields', 'bundle' => 'babylonia-old-babylonian', 'thumb' => 'worlds/mesopotamian-fields.webp',
        'set' => [
            'sky' => 'sky-hot-01',
            'groundSlots' => [['asset' => 'terrain-alluvial-plain-01', 'from_m' => 0]],
            'groundBands' => [['asset' => 'bb-cultivated-field-strip-01', 'z' => 30]],
            'layers' => [
                ['asset' => 'bb-alluvial-backdrop-01', 'depth' => 'bg', 'x' => 0.5],
                ['asset' => 'bb-canal-bank-screen-01', 'depth' => 'mid', 'x' => 0.5, 'z' => 16],
                ['asset' => 'bb-date-palm-01', 'depth' => 'mid', 'x' => 0.22, 'z' => 14],
                ['asset' => 'bb-date-palm-01', 'depth' => 'mid', 'x' => 0.78, 'z' => 19, 'flip' => true],
            ],
        ],
    ],
    'euphrates' => [
        'label' => 'Euphrates', 'bundle' => 'near-east-neolithic', 'thumb' => 'worlds/euphrates.webp',
        'set' => [
            'sky' => 'sky-hot-01',
            'groundSlots' => [['asset' => 'terrain-river-mud-02', 'from_m' => 0]],
            'layers' => [['asset' => 'river-euphrates-01', 'depth' => 'bg', 'x' => 0.5]],
        ],
    ],
    'desert' => [
        'label' => 'Desert', 'bundle' => 'near-east-neolithic', 'thumb' => 'worlds/desert.webp',
        'set' => [
            'sky' => 'sky-hot-01',
            'groundSlots' => [['asset' => 'terrain-desert-gravel-02', 'from_m' => 0]],
            'layers' => [['asset' => 'hills-dry-01', 'depth' => 'bg', 'x' => 0.5]],
        ],
    ],
    // Bart 11-13: the herders' camp as a real 3D place. No painted backdrop card (its painted ground slid against the
    // floor on every camera move): the steppe floor carries the land, its far edge and the dry hills stand on the
    // horizon on their own (far-edge.ts), the trampled verge and the tents stand on the ground at their distances.
    'mesopotamian-tent-camp' => [
        'label' => 'Mesopotamian tent camp', 'bundle' => 'babylonia-old-babylonian', 'thumb' => 'worlds/mesopotamian-tent-camp.webp',
        'set' => [
            'sky' => 'sky-hot-01',
            'groundSlots' => [['asset' => 'terrain-dry-steppe-01', 'from_m' => 0]],
            'groundBands' => [['asset' => 'bb-trampled-verge-strip-01', 'z' => 30]],
            'layers' => [
                ['asset' => 'bb-herder-tent-01', 'depth' => 'mid', 'x' => 0.75, 'z' => 22],
                ['asset' => 'bb-herder-tent-02', 'depth' => 'mid', 'x' => 0.86, 'z' => 24],
                ['asset' => 'bb-campfire-01', 'depth' => 'mid', 'x' => 0.55, 'z' => 22],
                ['asset' => 'bb-thorn-pen-01', 'depth' => 'mid', 'x' => 0.94, 'z' => 22],
            ],
        ],
    ],
];
