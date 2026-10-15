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
    | The learning goal the demo types out. It has to describe the lesson above,
    | because the buttons underneath open exactly that lesson. When the configured
    | lesson is not available and DemoLesson falls back to another one, the hero
    | types THAT lesson's title instead, so the words never promise the wrong thing.
    |
    */

    'lesson_goal' => env('DEMO_LESSON_GOAL', 'Explain why the Dutch East India Company sent Abel Tasman into the unknown south'),

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
        'nl' => ['title' => 'De reis van Abel Tasman', 'footage' => 'public/lessons/tasman/animation'],
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
    | What the hero types is a learning goal a teacher would actually write,
    | not the lesson's title. Dutch lessons hang off a window of the Canon van
    | Nederland (canonvannederland.nl); the rest off the matching curriculum
    | topic. Keyed by exact lesson title, written in the lesson's own language,
    | so the hero never promises the lesson in a language it is not in.
    |
    | A lesson missing here types its title (DemoLesson::goal).
    |
    */

    'goals' => [
        // Canon van Nederland
        'De reis van Abel Tasman' => 'Ik kan uitleggen waarom de VOC Abel Tasman naar het onbekende Zuidland stuurde (Canon: de VOC)',
        'Abel Tasman: De reis naar het onbekende' => 'Ik kan uitleggen waarom de VOC Abel Tasman naar het onbekende Zuidland stuurde (Canon: de VOC)',
        'The VOC: the world\'s first multinational' => 'Ik kan uitleggen hoe de VOC handel dreef in Azië en wie daarvoor betaalde (Canon: de VOC)',
        'The Hunebedden: the oldest monuments in the Netherlands' => 'Ik kan vertellen wie de hunebedden bouwden en hoe we dat weten (Canon: Hunebedden)',
        'William of Orange and the Dutch Revolt' => 'Ik kan uitleggen waarom Willem van Oranje in opstand kwam tegen Spanje (Canon: Willem van Oranje)',
        'Michiel de Ruyter and the Wars at Sea' => 'Ik kan uitleggen waarom de Republiek oorlog voerde op zee (Canon: Michiel de Ruyter)',
        'Dutch Slavery: the trade, the resistance, the reckoning' => 'Ik kan uitleggen welke rol Nederland had in de slavenhandel en hoe tot slaaf gemaakten zich verzetten (Canon: Slavernij)',
        'The Flood of 1953 and the Delta Works' => 'Ik kan uitleggen hoe de watersnood van 1953 leidde tot de Deltawerken (Canon: De watersnood)',
        'Dante Alighieri: het leven van een dichter in ballingschap' => 'Ik kan uitleggen hoe Dante in ballingschap de Commedia schreef',
        'Dante Alighieri: het avontuur van het leven' => 'Ik kan uitleggen hoe Dante in ballingschap de Commedia schreef',

        // Other languages
        'Abel Tasman: two voyages to the unknown south' => 'Explain why the Dutch East India Company sent Abel Tasman into the unknown south',
        'La Révolution française et l\'ascension de Napoléon' => 'Expliquer comment la Révolution française a ouvert la voie au pouvoir de Bonaparte',
        'Dante Alighieri: das Leben eines Dichters im Exil' => 'Erklären, wie Dante im Exil die Commedia schrieb',
        'Dante Alighieri: la vita di un poeta in esilio' => 'Spiegare come Dante scrisse la Commedia in esilio',
        'Dante Alighieri: the life of a poet in exile' => 'Explain how Dante wrote the Commedia in exile',
        'Rembrandt and the Dutch Golden Age' => 'Explain how a country without a court made Rembrandt possible',
        'Vincent van Gogh: a life in ten years' => 'Explain how Van Gogh developed his style in only ten years',
        'Anne Frank and the Secret Annex' => 'Explain how Jews in occupied Amsterdam were persecuted, through Anne Frank\'s diary',
        'Columbus and the Crossing of 1492' => 'Explain what the voyage of 1492 meant for Europe and for the Taíno',
        'Abraham Lincoln' => 'Explain how Abraham Lincoln held the Union together and ended slavery',
        'The Colosseum' => 'Explain what the Colosseum tells us about power and entertainment in Rome',
        'Gladiators' => 'Separate the facts about gladiators from the myths',
        'The Punic Wars' => 'Explain why Rome and Carthage fought for the Mediterranean',
        'The Silk Road' => 'Explain how goods, ideas and diseases travelled along the Silk Road',
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
