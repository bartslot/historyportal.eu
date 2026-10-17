<?php

declare(strict_types=1);

return [

    /*
    |--------------------------------------------------------------------------
    | Landing-page demo lesson
    |--------------------------------------------------------------------------
    |
    | The lesson the hero animation pretends to build, and the one a visitor gets
    | a private copy of when they press Configure. Matched on title so the demo
    | survives a rebuild of the lesson (which changes its id and lesson_code).
    |
    */

    'lesson_title' => env('DEMO_LESSON_TITLE', 'Abel Tasman: two voyages to the unknown south'),

    /*
    |--------------------------------------------------------------------------
    | What the hero types
    |--------------------------------------------------------------------------
    |
    | The learning goal the demo types out: the CURRICULUM TOPIC a teacher has to
    | teach, never the lesson's title (Bart, 2026-10-13: "Het leerdoel is niet de
    | titel van de les"). The teacher types "De VOC en ontdekkingsreizen"; the
    | lesson that answers it is Abel Tasman. It has to fit the lesson above,
    | because the buttons underneath open exactly that lesson. When DemoLesson
    | falls back to another lesson, `goals` below is looked up by that lesson's
    | title, so the words never promise the wrong thing.
    |
    */

    'lesson_goal' => env('DEMO_LESSON_GOAL', 'The VOC and the voyages of discovery'),

    // Hand-picked square footage for the default lesson's ring, if there is any. Beats scraping
    // the lesson's own artwork: chosen to sit next to each other, already cropped.
    'lesson_footage' => 'public/lessons/tasman/animation',

    /*
    |--------------------------------------------------------------------------
    | Which lesson each LANGUAGE sees
    |--------------------------------------------------------------------------
    |
    | Keyed by language, not by country, because language is the thing that must
    | never be wrong. A Dutch teacher opening the landing page and being handed an
    | English lesson is not a slightly worse demo — it is the wrong product. So the
    | rule is strict: a visitor is only ever offered a lesson in their own
    | language, or the English one. Never a third language.
    |
    | Matched on title so a rebuild (which changes id and lesson_code) keeps
    | working, and DemoLesson checks the winning lesson's `language` column really
    | does match before it hands it over — a title can be edited, a column cannot
    | drift by accident.
    |
    | An entry naming a lesson nobody has written yet costs nothing: it falls
    | through to English, which is the documented behaviour rather than an
    | accident.
    |
    | English is deliberately NOT listed here. It comes from `lesson_title` and
    | `lesson_goal` above, so DEMO_LESSON_TITLE stays the one env var that pins
    | the default demo, and English has a single source of truth.
    |
    | The hero's animation tiles come from whichever lesson wins:
    | run `lessons:build-warp-atlas --all` after changing this map.
    |
    */

    'by_language' => [
        'nl' => ['title' => 'Abel Tasman: De reis naar het onbekende', 'footage' => 'public/lessons/tasman/animation'],
        'fr' => ['title' => 'La Révolution française et l\'ascension de Napoléon'],
        // Both from resources/lessons/dante: the titles must match text/{de,it}.php exactly.
        'de' => ['title' => 'Dante Alighieri: das Leben eines Dichters im Exil'],
        'it' => ['title' => 'Dante Alighieri: la vita di un poeta in esilio'],
    ],

    /*
    |--------------------------------------------------------------------------
    | The leerdoel behind each lesson
    |--------------------------------------------------------------------------
    |
    | What the hero types is a learning goal in Bart's style: the curriculum TOPIC,
    | short ("De VOC en ontdekkingsreizen", Bart 2026-10-15), never the lesson's title. Dutch lessons hang off a window of the Canon van
    | Nederland (canonvannederland.nl); the rest off the matching curriculum
    | topic. Keyed by exact lesson title, written in the lesson's own language,
    | so the hero never promises the lesson in a language it is not in.
    |
    | A lesson missing here types its title (DemoLesson::goal).
    |
    */

    'goals' => [
        // Dutch lessons (Canon van Nederland)
        'Abel Tasman: De reis naar het onbekende' => 'De VOC en ontdekkingsreizen',
        'De reis van Abel Tasman' => 'De VOC en ontdekkingsreizen',
        'Dante Alighieri: het leven van een dichter in ballingschap' => 'Literatuur in de late middeleeuwen',
        'Dante Alighieri: het avontuur van het leven' => 'Literatuur in de late middeleeuwen',

        // English lessons (Canon windows written in English keep an English goal: the goal is in
        // the lesson's own language, or the hero promises a language the lesson is not in)
        'Abel Tasman: two voyages to the unknown south' => 'The VOC and the voyages of discovery',
        'The VOC: the world\'s first multinational' => 'The VOC and world trade',
        'The Hunebedden: the oldest monuments in the Netherlands' => 'The first farmers and their monuments',
        'William of Orange and the Dutch Revolt' => 'The Dutch Revolt',
        'Michiel de Ruyter and the Wars at Sea' => 'The Dutch Republic at war at sea',
        'Dutch Slavery: the trade, the resistance, the reckoning' => 'Slavery and the Dutch colonies',
        'The Flood of 1953 and the Delta Works' => 'Living with water',
        'The Batavian Republic: A Quest for Liberty' => 'The first constitution of the Netherlands',
        'Dante Alighieri: the life of a poet in exile' => 'Literature in the late Middle Ages',
        'Rembrandt and the Dutch Golden Age' => 'The Dutch Golden Age',
        'Vincent van Gogh: a life in ten years' => 'Art at the end of the 19th century',
        'Anne Frank and the Secret Annex' => 'The Holocaust in the Netherlands',
        'Columbus and the Crossing of 1492' => 'Voyages of discovery and first contact',
        'Abraham Lincoln' => 'The American Civil War and the end of slavery',
        'The Colosseum' => 'Power and entertainment in Ancient Rome',
        'Gladiators' => 'Daily life in Ancient Rome',
        'The Punic Wars' => 'Rome against Carthage',
        'The Silk Road' => 'Trade between East and West',

        // Other languages
        'La Révolution française et l\'ascension de Napoléon' => 'La Révolution française et l\'Empire',
        'Dante Alighieri: das Leben eines Dichters im Exil' => 'Literatur im Spätmittelalter',
        'Dante Alighieri: la vita di un poeta in esilio' => 'La letteratura del tardo Medioevo',
    ],

    /*
    |--------------------------------------------------------------------------
    | What language a country implies
    |--------------------------------------------------------------------------
    |
    | Only consulted when the browser did not ask for one of our languages. A
    | teacher in Amsterdam whose laptop is set to English still teaches in Dutch,
    | so the country gets them the Dutch lesson; a French visitor is matched on
    | EITHER signal, which is what "in France, or with a French browser" means.
    |
    | Anything not listed is English.
    |
    */

    'country_language' => [
        'NL' => 'nl', 'BE' => 'nl',
        'FR' => 'fr',
        'DE' => 'de', 'AT' => 'de', 'CH' => 'de',
        'IT' => 'it',
    ],

    /*
    |--------------------------------------------------------------------------
    | Guest sandbox
    |--------------------------------------------------------------------------
    |
    | Guest accounts and their lesson copies are deleted this many hours after
    | they were created (demo:prune-guests, scheduled hourly). Long enough for
    | somebody to wander off and come back to the tab, short enough that the
    | table never becomes a graveyard.
    |
    */

    'guest_ttl_hours' => (int) env('DEMO_GUEST_TTL_HOURS', 24),

];
