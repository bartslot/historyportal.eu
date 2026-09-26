<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Dante asset pack (history-line@1)
|--------------------------------------------------------------------------
| Everything the Dante lesson draws, generated ONCE and kept in the shared
| library (collection "history-line") so every language version, and every
| later lesson set in medieval Italy, reuses the same assets.
|
| sheets  → one fal call each, sliced into isolated cut-outs (transparent outside,
|           white paper inside) → library category/subcategory, one asset per cell.
| plates  → one fal call each, a wide EMPTY stage (no main characters) used as a
|           scene backdrop; figures are placed on top as layers.
| sources → optional real references (Wikimedia Commons, public domain) sent after
|           the two style anchors, so architecture and dress follow the evidence.
|
| Era guard for Florence before 1300: NO cathedral dome (1436), NO Giotto bell tower
| (1334), NO Palazzo Vecchio (begun 1299), NO plate armour, NO sallets.
*/

return [
    'collection' => 'history-line',
    'era' => 'c. 1265-1321',
    'place' => 'Tuscany and northern Italy',

    'sheets' => [
        [
            'name' => 'dante-circle', 'category' => 'figures', 'subcategory' => 'dante', 'grid' => '2x2', 'figures' => true,
            'era' => 'c. 1300', 'place' => 'Florence',
            'items' => [
                'dante-giovane' => 'young Dante Alighieri about 20 years old, slim, beardless, long lucco robe and close-fitting cap, holding a small book, thoughtful',
                'dante-esule' => 'Dante Alighieri about 45, gaunt face, strong aquiline nose, long plain robe with a hood (cappuccio) wrapped around the head, walking staff, travel bag',
                'beatrice' => 'young Florentine woman of about 20, long gamurra dress with fitted sleeves, light veil over braided hair, calm and dignified',
                'guido-cavalcanti' => 'young Florentine nobleman poet, short cloak over a tunic, hose, soft cap, proud posture',
            ],
        ],
        [
            'name' => 'dante-power', 'category' => 'figures', 'subcategory' => 'power', 'grid' => '2x2', 'figures' => true,
            'era' => 'c. 1300', 'place' => 'Florence and Rome',
            'items' => [
                'virgilio' => 'the Roman poet Virgil as medieval artists imagined him: long ancient robe, mantle, laurel wreath, holding a scroll, a guide gesturing forward',
                'papa-bonifacio' => 'Pope Boniface VIII: papal cope, tall conical tiara of c. 1300, gloved hand raised, seated on nothing (standing)',
                'priore' => 'Florentine prior (city magistrate) c. 1300: long dignified robe, cloak, cap, holding a folded document',
                'messo' => 'city messenger c. 1300: short tunic, hose, satchel, holding a sealed folded letter with a wax seal, no writing',
            ],
        ],
        [
            'name' => 'campaldino', 'category' => 'figures', 'subcategory' => 'soldiers', 'grid' => '2x2', 'figures' => true,
            'era' => 'c. 1289', 'place' => 'Tuscany, battle of Campaldino',
            'items' => [
                'cavaliere-guelfo' => 'mounted Florentine Guelf cavalryman of 1289 on a horse, flat-topped great helm, mail hauberk, surcoat, lance upright, shield; side view',
                'fante' => 'Italian foot soldier of 1289: kettle hat, padded gambeson, mail coif, tall pavise shield resting on the ground, spear',
                'balestriere' => 'Italian crossbowman of 1289: cervelliera skullcap, gambeson, loading a crossbow',
                'cavallo' => 'riderless medieval warhorse with saddle and bridle, standing, side view',
            ],
        ],
        [
            'name' => 'florence-people', 'category' => 'figures', 'subcategory' => 'citizens', 'grid' => '2x2', 'figures' => true,
            'era' => 'c. 1300', 'place' => 'Florence',
            'items' => [
                'mercante' => 'Florentine merchant c. 1300: long robe, belt with purse, counting coins in one hand',
                'donna-fiorentina' => 'Florentine woman c. 1300 carrying a basket, long dress, head covered with a simple veil',
                'scriba' => 'scribe c. 1300 standing at a slanted writing lectern, quill in hand, parchment',
                'frate' => 'Franciscan friar c. 1300: rough habit with rope belt, hood down, sandals, hands folded',
            ],
        ],
        [
            'name' => 'dante-poses', 'category' => 'figures', 'subcategory' => 'dante', 'grid' => '2x2', 'figures' => true,
            'era' => 'c. 1289-1315', 'place' => 'Tuscany and northern Italy',
            'items' => [
                'dante-cammina' => 'Dante Alighieri about 45 walking into exile, side view facing right, gaunt face, strong aquiline nose, long plain robe, hood wrapped around the head, walking staff, travel bag, full body mid-stride',
                'dante-cavaliere' => 'young Dante Alighieri aged 24 as a Florentine cavalryman of 1289 on a horse, mail hauberk, surcoat, flat-topped great helm carried in the crook of his arm so his beardless face shows, side view facing left',
                'dante-scrive' => 'Dante Alighieri about 45 seated on a wooden chair writing in a large codex on his knees with a quill, hood around the head, full figure including chair legs and feet',
                'dante-legge' => 'Dante Alighieri about 50 standing, reading aloud from an open book held in both hands, laurel-less plain hood, long robe, full body',
            ],
        ],
        [
            'name' => 'objects', 'category' => 'props', 'subcategory' => 'medieval', 'grid' => '3x3', 'figures' => false,
            'era' => 'c. 1300', 'place' => 'Italy',
            'items' => [
                'codice-aperto' => 'open handwritten medieval codex, pages drawn as blank lines with no readable letters',
                'penna-calamaio' => 'goose quill standing in an inkpot',
                'fiorino' => 'gold florin coin of Florence showing a lily, no letters',
                'stendardo' => 'medieval banner on a pole with a plain cross, no letters',
                'lanterna' => 'iron and horn lantern with a candle',
                'pergamena-sigillata' => 'rolled parchment tied with cord and a hanging wax seal, no writing',
                'bisaccia' => 'leather travel bag with a strap',
                'bastone' => 'wooden walking staff',
                'corona-alloro' => 'laurel wreath',
            ],
        ],
        [
            'name' => 'nature', 'category' => 'nature', 'subcategory' => 'tuscany', 'grid' => '3x3', 'figures' => false,
            'era' => 'timeless', 'place' => 'Tuscany',
            'items' => [
                'cipresso' => 'tall Tuscan cypress tree, full height',
                'ulivo' => 'olive tree with a twisted trunk, full height',
                'quercia' => 'broad oak tree, full height',
                'cespuglio' => 'low bush',
                'nuvola-1' => 'long flat cumulus cloud, outline only',
                'nuvola-2' => 'round puffy cloud, outline only',
                'nuvola-3' => 'small wispy cloud, outline only',
                'stormo' => 'small flock of five birds in flight, simple strokes',
                'erba' => 'tuft of tall grass and wild flowers',
            ],
        ],
        [
            'name' => 'buildings', 'category' => 'architecture', 'subcategory' => 'florence', 'grid' => '2x2', 'figures' => false,
            'era' => 'c. 1265-1300', 'place' => 'Florence',
            'items' => [
                'casa-torre' => 'Florentine medieval tower house of rough stone, tall and narrow, few small windows, wooden balcony',
                'battistero' => 'the octagonal Baptistery of San Giovanni in Florence with its green-and-white marble banding drawn as lines, as it looked c. 1300',
                'porta-citta' => 'medieval city gate tower with a round arch and a short stretch of crenellated wall',
                'chiesa-romanica' => 'small Tuscan Romanesque church facade with a round window and arcades',
            ],
        ],
    ],

    'plates' => [
        [
            'slug' => 'firenze-strada', 'category' => 'backdrops', 'subcategory' => 'florence',
            'prompt' => 'A street in Florence around 1280, seen at eye level: rough stone tower houses, wooden shop shutters and awnings, a paved street leading to the octagonal Baptistery of San Giovanni in the distance, Tuscan hills beyond. Empty street, no people in the foreground.',
            'sources' => [], // the only good Baptistery photo is CC BY-SA; the prompt carries it
            'constraints' => 'No cathedral dome, no bell tower by Giotto, no Palazzo Vecchio: they did not exist yet.',
        ],
        [
            'slug' => 'lungarno', 'category' => 'backdrops', 'subcategory' => 'florence',
            'prompt' => 'The bank of the river Arno in Florence around 1290: a riverside path with a low wall, a stone bridge with shops, tower houses along the far bank, open sky. Empty foreground for figures.',
            'sources' => ['commons:Henry Holiday - Dante and Beatrice - Google Art Project.jpg'],
            'constraints' => 'Keep the riverside architecture only, leave out every figure from the reference. No cathedral dome.',
        ],
        [
            'slug' => 'campaldino-piana', 'category' => 'backdrops', 'subcategory' => 'tuscany',
            'prompt' => 'The wide plain of Campaldino in the Casentino valley, Tuscany, in June 1289: open fields, the river Arno, the castle of Poppi on a hill in the distance, low Apennine mountains. Empty plain for figures.',
            'sources' => [],
            'constraints' => 'No battle, no soldiers, no bodies.',
        ],
        [
            'slug' => 'sala-priori', 'category' => 'backdrops', 'subcategory' => 'florence',
            'prompt' => 'Interior of a medieval council hall in Florence around 1300: timber beamed ceiling, tall arched windows, wooden benches and a long table, a painted heraldic lily on the wall. Empty room.',
            'sources' => [],
            'constraints' => 'No readable writing on any document or wall.',
        ],
        [
            'slug' => 'strada-appennino', 'category' => 'backdrops', 'subcategory' => 'italy',
            'prompt' => 'A lonely mule track winding through the Apennine mountains of central Italy around 1305, a small hill town with walls on a far ridge, open sky. Empty road for a walking figure.',
            'sources' => [],
            'constraints' => '',
        ],
        [
            'slug' => 'scrittoio', 'category' => 'backdrops', 'subcategory' => 'interiors',
            'prompt' => 'A quiet medieval study around 1310: a wooden writing desk under an arched window, a candle, stacked codices, a chair, stone walls. Empty chair.',
            'sources' => [],
            'constraints' => 'No readable letters on any page.',
        ],
        [
            'slug' => 'ravenna', 'category' => 'backdrops', 'subcategory' => 'ravenna',
            'prompt' => 'Ravenna around 1320: the brick church of San Francesco with its bell tower, a small square, low brick houses, flat marshy land and pine trees beyond. Empty square.',
            'sources' => [], // every San Francesco photo on Commons is CC BY-SA
            'constraints' => 'No modern buildings, no cars, no signs.',
        ],
    ],

    // Real artworks converted into the house style (they already hold their own figures).
    'conversions' => [
        ['slug' => 'dore-inferno', 'category' => 'backdrops', 'subcategory' => 'commedia', 'source' => 'commons:Gustave Doré - Dante Alighieri - Inferno - Plate 1 (I found myself within a forest dark...).jpg', 'constraints' => 'Dark forest scene: keep the figures and trees, lighten the dense engraving into open line work.'],
        ['slug' => 'dore-purgatorio', 'category' => 'backdrops', 'subcategory' => 'commedia', 'source' => 'commons:Gustove Dore, The Divine Comedy, Purgatory, plate 79, The Boat of Souls.jpg', 'constraints' => 'Keep the angel boat, the souls and the sea; open up the dense engraving into line work.'],
        ['slug' => 'dore-paradiso', 'category' => 'backdrops', 'subcategory' => 'commedia', 'source' => 'commons:Paradiso Canto 31 (148200393).jpg', 'constraints' => 'Keep the circles of light as clean concentric lines, no solid black.'],
        ['slug' => 'michelino-tre-regni', 'category' => 'backdrops', 'subcategory' => 'commedia', 'source' => 'commons:Dante Domenico di Michelino Duomo Florence.jpg', 'constraints' => 'Keep Dante, the book, hell, the mountain of Purgatory and the city. The cathedral dome is in the 1465 painting and may stay here.'],
    ],
];
