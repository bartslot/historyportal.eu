<?php

declare(strict_types=1);

/**
 * The controlled vocabulary every lesson is described with.
 *
 * One file, so a filter, a shelf, a search facet and an export pack all agree on what the
 * categories ARE. Free-text columns (grade_level holds "6", "K-7" and "Age 10"; era holds one long
 * sentence) stay as the teacher's own words — App\Services\LessonTaxonomy normalises them onto
 * these keys, and nothing downstream has to guess again.
 *
 * The facet names follow LRMI / schema.org LearningResource, which is what other education
 * catalogues index on, so a feed can be published without re-mapping later:
 *   about            → subject + region + period + theme
 *   learningResourceType → format
 *   interactivityType    → interactivity
 *   educationalLevel     → grade band
 *   typicalAgeRange      → grade band ages
 *
 * Keys are stable identifiers — store and filter on those, never on the label. Labels are English
 * source strings passed through __() so the five shipped languages translate them.
 */
return [

    /*
    |--------------------------------------------------------------------------
    | Subject
    |--------------------------------------------------------------------------
    | The vertical a lesson belongs to. History is the only one live today; the
    | rest are the roadmap in CLAUDE.md and are listed so a filter built now
    | keeps working when they arrive.
    */
    'subjects' => [
        'history' => ['label' => 'History', 'live' => true],
        'science' => ['label' => 'Science', 'live' => false],
        'literature' => ['label' => 'Literature', 'live' => false],
        'civics' => ['label' => 'Civics', 'live' => false],
    ],

    /*
    |--------------------------------------------------------------------------
    | Period
    |--------------------------------------------------------------------------
    | The ten tijdvakken every Dutch history classroom is organised around, which
    | is also a clean world-history periodisation. `to` is exclusive. A lesson is
    | placed by its year when it has one, so this needs no authoring.
    */
    'periods' => [
        'hunters-farmers' => ['label' => 'Hunters and farmers', 'from' => -3000000, 'to' => -3000],
        'greeks-romans' => ['label' => 'Greeks and Romans', 'from' => -3000, 'to' => 500],
        'monks-knights' => ['label' => 'Monks and knights', 'from' => 500, 'to' => 1000],
        'cities-states' => ['label' => 'Cities and states', 'from' => 1000, 'to' => 1500],
        'discoverers-reformers' => ['label' => 'Discoverers and reformers', 'from' => 1500, 'to' => 1600],
        'regents-rulers' => ['label' => 'Regents and rulers', 'from' => 1600, 'to' => 1700],
        'wigs-revolutions' => ['label' => 'Wigs and revolutions', 'from' => 1700, 'to' => 1800],
        'citizens-steam' => ['label' => 'Citizens and steam engines', 'from' => 1800, 'to' => 1900],
        'world-wars' => ['label' => 'World wars', 'from' => 1900, 'to' => 1950],
        'television-computer' => ['label' => 'Television and computer', 'from' => 1950, 'to' => 2100],
    ],

    /*
    | The period of each history-line library folder (the folder under the category:
    | figures/tasman, backdrops/dante …), for the era chips in the editor's Assets tab.
    | A picture's own `era` in meta.json wins over its folder; a folder that is not
    | listed here and a picture without an era are timeless (shown under every era).
    | Values are keys of `periods` above. See App\Support\LibraryEra.
    */
    /*
    | The tijdvakken of a group in a collection whose pictures carry no era of their own (the
    | line-art icons): by subcategory, else category. A list of `periods` keys; [] is deep time
    | (dinosaurs: no human history, shown only under "All times"); a group not listed is timeless.
    | Same chips, same filter as the history-line library. See App\Support\LibraryEra::groupEras().
    */
    'group_eras' => [
        'line-art' => [
            'Dinosaurs' => [],
            'Prehistoric' => ['hunters-farmers'],
            'Cave drawings' => ['hunters-farmers'],
            'Civilisation' => ['hunters-farmers'],
            'Hunters & Farmers' => ['hunters-farmers'],
            'Stone Age' => ['hunters-farmers'],
            'Civilisations' => ['hunters-farmers', 'greeks-romans'],
            'Egyptians' => ['hunters-farmers', 'greeks-romans'],
        ],
    ],

    'library_eras' => [
        'tasman' => 'regents-rulers',
        'dante' => 'cities-states',
        'dante-comic' => 'cities-states',
        'commedia' => 'cities-states',
        'florence' => 'cities-states',
        'tuscany' => 'cities-states',
        'ravenna' => 'cities-states',
        'italy' => 'cities-states',
        'medieval' => 'cities-states',
    ],

    /*
    |--------------------------------------------------------------------------
    | Region
    |--------------------------------------------------------------------------
    | Where a lesson is set. Keywords classify a lesson that has no stored region
    | — the same trick CanonThemeCatalog::placeShelves used, but over the whole
    | world rather than three European countries, so "The Silk Road" stops being
    | filed under Europe. Order matters: the first match wins, so the specific
    | (Netherlands) sits above the general (Europe).
    */
    'regions' => [
        'netherlands' => [
            'label' => 'Netherlands',
            'keywords' => ['nederland', 'netherlands', 'dutch', 'holland', 'utrecht', 'amsterdam',
                'rotterdam', 'brielle', 'oranje', 'domtoren', 'voc', 'watersnood', 'texel'],
        ],
        'europe' => [
            'label' => 'Europe',
            'keywords' => ['europe', 'europa', 'france', 'frankrijk', 'napoleon', 'paris', 'spain',
                'spanje', 'britain', 'england', 'london', 'germany', 'duitsland', 'italy', 'italie',
                'rome', 'roman', 'greece', 'griekenland', 'athens', 'portugal', 'lisbon', 'venice'],
        ],
        'asia' => [
            'label' => 'Asia',
            'keywords' => ['asia', 'azie', 'china', 'chinese', 'japan', 'india', 'indies', 'indie',
                'mongol', 'silk road', 'zijderoute', 'batavia', 'persia', 'jerusalem', 'ottoman'],
        ],
        'africa' => [
            'label' => 'Africa',
            'keywords' => ['africa', 'afrika', 'egypt', 'egypte', 'nile', 'cape', 'kaap', 'mali',
                'ethiopia', 'carthage', 'sahara'],
        ],
        'americas' => [
            'label' => 'Americas',
            'keywords' => ['america', 'amerika', 'united states', 'mexico', 'aztec', 'inca', 'maya',
                'brazil', 'caribbean', 'suriname', 'columbus', 'new york', 'nieuw-amsterdam'],
        ],
        'oceania' => [
            'label' => 'Oceania',
            'keywords' => ['australia', 'australie', 'new zealand', 'nieuw-zeeland', 'pacific',
                'tasman', 'polynesia', 'maori'],
        ],
        'global' => [
            'label' => 'Global',
            'keywords' => ['world', 'wereld', 'global', 'trade route', 'empire'],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Format  (schema.org learningResourceType)
    |--------------------------------------------------------------------------
    | WHAT KIND of lesson this is, derived from the scenes it actually contains
    | and the game columns — never authored, so it cannot go stale. A lesson
    | carries every format that applies: a narrated voyage that ends in a quiz
    | is all three.
    */
    'formats' => [
        'narrated-story' => ['label' => 'Narrated story', 'scene_kinds' => ['narration']],
        'voyage' => ['label' => 'Voyage', 'scene_kinds' => ['voyage']],
        'atlas' => ['label' => 'Historical map', 'scene_kinds' => ['map']],
        'gallery' => ['label' => 'Image gallery', 'scene_kinds' => ['gallery']],
        'quiz' => ['label' => 'Quiz', 'scene_kinds' => ['game']],
        'class-game' => ['label' => 'Class game', 'scene_kinds' => []],
    ],

    /*
    |--------------------------------------------------------------------------
    | Interactivity  (schema.org interactivityType)
    |--------------------------------------------------------------------------
    | Whether the class watches, does, or both. Derived from the formats above:
    | a lesson with a quiz or a game is 'active', narration alone is
    | 'expositive', and the two together are 'mixed'.
    */
    'interactivity' => [
        'expositive' => ['label' => 'Watch'],
        'active' => ['label' => 'Do'],
        'mixed' => ['label' => 'Watch and do'],
    ],

    /*
    |--------------------------------------------------------------------------
    | Grade band  (schema.org educationalLevel + typicalAgeRange)
    |--------------------------------------------------------------------------
    | grade_level is free text — "6", "K-7", "Age 10", "groep 7" — so a filter
    | cannot use it directly. These bands are what a teacher actually picks from;
    | LessonTaxonomy reads whatever number it can find and lands on one.
    |
    | The ranges must not overlap, or the same class falls in two bands and the
    | first one listed silently wins. Grades are read as Dutch groep (1-8 is
    | primary, which is the product's home market), so "grade 7" is a primary
    | class; secondary starts at 9.
    */
    'grade_bands' => [
        'primary-lower' => ['label' => 'Primary, lower (age 6-8)', 'ages' => [6, 8], 'grades' => [1, 3]],
        'primary-upper' => ['label' => 'Primary, upper (age 9-12)', 'ages' => [9, 12], 'grades' => [4, 8]],
        'secondary-lower' => ['label' => 'Secondary, lower (age 13-15)', 'ages' => [13, 15], 'grades' => [9, 10]],
        'secondary-upper' => ['label' => 'Secondary, upper (age 16-18)', 'ages' => [16, 18], 'grades' => [11, 12]],
    ],
];
