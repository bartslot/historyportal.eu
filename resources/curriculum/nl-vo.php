<?php

declare(strict_types=1);

// The Dutch curriculum a history lesson can connect to (Bart, 2026-10-17: "every kerndoel has its
// own page, a database entry where we connect the lessons, so later on we can generate lessons with
// competences that are missing"). `php artisan curriculum:import` writes this into curriculum_goals.
//
// Text is official and verbatim; only `title` on a kerndoel is our own short label (36, 37 and 40
// are Bart's own wording from the Tasman guide).
// - Kerndoelen onderbouw vo, Mens en maatschappij 36-47: Uitvoeringsbesluit WVO 2020, bijlage 1,
//   onderdeel E, the text for the European Netherlands. Unchanged by the 2026 renewal, which only
//   covered Nederlands and rekenen-wiskunde (Stb. 2026, 198).
// - Tijdvakken: kerndoel 37. Kenmerkende aspecten: syllabus geschiedenis vwo CE 2025, bijlage 3.
// - Canon: canonvannederland.nl, the 50 vensters (2020 edition).

$kerndoelen_source = 'https://wetten.overheid.nl/BWBR0045787';
$syllabus_source = 'https://examenblad.nl/2025/vwo/documenten/syllabus-geschiedenis-vwo';
$canon_source = 'https://www.canonvannederland.nl/nl/';

$kerndoelen = [
    36 => ['Vragen stellen en een standpunt onderbouwen', 'De leerling leert betekenisvolle vragen te stellen over maatschappelijke kwesties en verschijnselen, daarover een beargumenteerd standpunt in te nemen en te verdedigen, en daarbij respectvol met kritiek om te gaan.'],
    37 => ['Gebeurtenissen en personen in hun historische tijd plaatsen', "De leerling leert een kader van tien tijdvakken te gebruiken om gebeurtenissen, ontwikkelingen en personen in hun tijd te plaatsen. De leerling leert hierbij over kenmerkende aspecten van de volgende tijdvakken: tijd van jagers en boeren (prehistorie tot 3000 voor Chr.); tijd van Grieken en Romeinen (3000 voor Chr.-500 na Chr.); tijd van monniken en ridders (500–1000); tijd van steden en staten (1000–1500); tijd van ontdekkers en hervormers (1500–1600); tijd van regenten en vorsten (1600–1700); tijd van pruiken en revoluties (1700–1800); tijd van burgers en stoommachines (1800–1900); tijd van wereldoorlogen (1900–1950), en tijd van televisie en computer (1950–heden).\n\nDe leerling leert daarbij in elk geval de relatie te leggen tussen de gebeurtenissen en ontwikkelingen in de 20e eeuw (waaronder de Wereldoorlogen en de Holocaust), en hedendaagse ontwikkelingen. De vensters van de canon van Nederland dienen als uitgangspunt ter illustratie van de tijdvakken."],
    38 => ['Verschijnselen plaatsen in de eigen omgeving, Nederland, Europa en de wereld', 'De leerling leert een eigentijds beeld van de eigen omgeving, Nederland, Europa en de wereld te gebruiken om verschijnselen en ontwikkelingen in hun omgeving te plaatsen.'],
    39 => ['Een eenvoudig onderzoek uitvoeren en presenteren', 'De leerling leert een eenvoudig onderzoek uit te voeren naar een actueel maatschappelijk verschijnsel en de uitkomsten daarvan te presenteren.'],
    40 => ['Historische bronnen gebruiken', 'De leerling leert historische bronnen te gebruiken om zich een beeld van een tijdvak te vormen of antwoorden te vinden op vragen, en hij leert daarbij ook de eigen cultuurhistorische omgeving te betrekken.'],
    41 => ['De atlas en kaarten gebruiken', 'De leerling leert de atlas als informatiebron te gebruiken en kaarten te lezen en te analyseren om zich te oriënteren, zich een beeld van een gebied te vormen of antwoorden op vragen te vinden.'],
    42 => ['Effecten van keuzes in de eigen omgeving herkennen', 'De leerling leert in eigen ervaringen en in de eigen omgeving effecten te herkennen van keuzes op het gebied van werk en zorg, wonen en recreëren, consumeren en budgetteren, verkeer en milieu.'],
    43 => ['Cultuur, levensbeschouwing en respect voor verschillen', 'De leerling leert over overeenkomsten, verschillen en veranderingen in cultuur en levensbeschouwing in Nederland, leert eigen en andermans leefwijze daarmee in verband te brengen, leert de betekenis voor de samenleving te zien van respect voor elkaars opvattingen en leefwijzen, en leert respectvol om te gaan met seksualiteit en met diversiteit binnen de samenleving, waaronder seksuele diversiteit.'],
    44 => ['Het Nederlandse politieke bestel als democratie', 'De leerling leert op hoofdlijnen hoe het Nederlandse politieke bestel als democratie functioneert en leert zien hoe mensen op verschillende manieren bij politieke processen betrokken kunnen zijn.'],
    45 => ['De betekenis van Europese samenwerking en de Europese Unie', 'De leerling leert de betekenis van Europese samenwerking en de Europese Unie te begrijpen voor zichzelf, Nederland en de wereld.'],
    46 => ['Welvaart en armoede in de wereld', 'De leerling leert over de verdeling van welvaart en armoede over de wereld, hij leert de betekenis daarvan te zien voor de bevolking en het milieu, en relaties te leggen met het (eigen) leven in Nederland.'],
    47 => ['Spanningen en conflicten in de wereld plaatsen', 'De leerling leert actuele spanningen en conflicten in de wereld te plaatsen tegen hun achtergrond, en leert daarbij de doorwerking ervan op individuen en samenleving (nationaal, Europees en internationaal), de grote onderlinge afhankelijkheid in de wereld, het belang van mensenrechten en de betekenis van internationale samenwerking te zien.'],
];

// [title, period, kenmerkende aspecten]
$tijdvakken = [
    1 => ['Tijd van jagers en boeren', 'prehistorie tot 3000 voor Chr.', [
        'de levenswijze van jagers-verzamelaars',
        'het ontstaan van landbouw en landbouwsamenlevingen',
        'het ontstaan van de eerste stedelijke gemeenschappen',
    ]],
    2 => ['Tijd van Grieken en Romeinen', '3000 voor Chr.-500 na Chr.', [
        'de ontwikkeling van wetenschappelijk denken en het denken over burgerschap en politiek in de Griekse stadstaat',
        'de klassieke vormentaal van de Grieks-Romeinse cultuur',
        'de groei van het Romeinse imperium waardoor de Grieks-Romeinse cultuur zich in Europa verspreidde',
        'de confrontatie tussen de Grieks-Romeinse cultuur en de Germaanse cultuur van Noordwest-Europa',
        'de ontwikkeling van het jodendom en het christendom als de eerste monotheïstische godsdiensten',
    ]],
    3 => ['Tijd van monniken en ridders', '500–1000', [
        'de verspreiding van het christendom in geheel Europa',
        'het ontstaan en de verspreiding van de islam',
        'de vrijwel volledige vervanging in West-Europa van de agrarisch-urbane cultuur door een zelfvoorzienende agrarische cultuur, georganiseerd via hofstelsel en horigheid',
        'het ontstaan van feodale verhoudingen in het bestuur',
    ]],
    4 => ['Tijd van steden en staten', '1000–1500', [
        'de opkomst van handel en ambacht die de basis legde voor het herleven van een agrarisch-urbane samenleving',
        'de opkomst van de stedelijke burgerij en de toenemende zelfstandigheid van steden',
        'het conflict in de christelijke wereld over de vraag of de wereldlijke dan wel de geestelijke macht het primaat behoorde te hebben',
        'de expansie van de christelijke wereld naar buiten toe, onder andere in de vorm van de kruistochten',
        'het begin van staatsvorming en centralisatie',
    ]],
    5 => ['Tijd van ontdekkers en hervormers', '1500–1600', [
        'het begin van de Europese overzeese expansie',
        'het veranderende mens- en wereldbeeld van de renaissance en het begin van een nieuwe wetenschappelijke belangstelling',
        'de hernieuwde oriëntatie op het erfgoed van de klassieke Oudheid',
        'de protestantse reformatie die splitsing van de christelijke kerk in West-Europa tot gevolg had',
        'het conflict in de Nederlanden dat resulteerde in de stichting van een Nederlandse staat',
    ]],
    6 => ['Tijd van regenten en vorsten', '1600–1700', [
        'het streven van vorsten naar absolute macht',
        'de bijzondere plaats in staatkundig opzicht en de bloei in economisch en cultureel opzicht van de Nederlandse Republiek',
        'wereldwijde handelscontacten, handelskapitalisme en het begin van een wereldeconomie',
        'de wetenschappelijke revolutie',
    ]],
    7 => ['Tijd van pruiken en revoluties', '1700–1800', [
        "rationeel optimisme en 'verlicht denken' dat werd toegepast op alle terreinen van de samenleving: godsdienst, politiek, economie en sociale verhoudingen",
        'voortbestaan van het ancien régime met pogingen om het vorstelijk bestuur op eigentijdse verlichte wijze vorm te geven (verlicht absolutisme)',
        'uitbouw van de Europese overheersing, met name in de vorm van plantagekoloniën en de daarmee verbonden transatlantische slavenhandel, en de opkomst van het abolitionisme',
        'de democratische revoluties in westerse landen met als gevolg discussies over grondwetten, grondrechten en staatsburgerschap',
    ]],
    8 => ['Tijd van burgers en stoommachines', '1800–1900', [
        'de industriële revolutie die in de westerse wereld de basis legde voor een industriële samenleving',
        "discussies over de 'sociale kwestie'",
        'de moderne vorm van imperialisme die verband hield met de industrialisatie',
        'de opkomst van emancipatiebewegingen',
        'voortschrijdende democratisering, met deelname van steeds meer mannen en vrouwen aan het politieke proces',
        'de opkomst van politiek-maatschappelijke stromingen: liberalisme, nationalisme, socialisme, confessionalisme en feminisme',
    ]],
    9 => ['Tijd van wereldoorlogen', '1900–1950', [
        'de rol van moderne propaganda- en communicatiemiddelen en vormen van massaorganisatie',
        'het in praktijk brengen van de totalitaire ideologieën communisme en fascisme/nationaalsocialisme',
        'de crisis van het wereldkapitalisme',
        'het voeren van twee wereldoorlogen',
        'racisme en discriminatie die leidden tot genocide, in het bijzonder op de joden',
        'de Duitse bezetting van Nederland',
        'verwoestingen op niet eerder vertoonde schaal door massavernietigingswapens en de betrokkenheid van de burgerbevolking bij oorlogvoering',
        'vormen van verzet tegen het West-Europese imperialisme',
    ]],
    10 => ['Tijd van televisie en computer', '1950–heden', [
        'de verdeling van de wereld in twee ideologische blokken in de greep van een wapenwedloop en de daaruit voortvloeiende dreiging van een atoomoorlog',
        'de dekolonisatie die een eind maakte aan de westerse hegemonie in de wereld',
        'de eenwording van Europa',
        'de toenemende westerse welvaart die vanaf de jaren zestig van de twintigste eeuw aanleiding gaf tot ingrijpende sociaal-culturele veranderingsprocessen',
        'de ontwikkeling van pluriforme en multiculturele samenlevingen',
    ]],
];

// [title, period, canonvannederland.nl slug]
$canon = [
    1 => ['Trijntje', '± 5500 voor Christus', 'trijntje'],
    2 => ['Hunebedden', '± 3000 voor Christus', 'hunebedden'],
    3 => ['De Romeinse Limes', '47 - ± 350', 'romeinselimes'],
    4 => ['Willibrord', '658 - 739', 'willibrord'],
    5 => ['Karel de Grote', '742 - 814', 'kareldegrote'],
    6 => ['Hebban olla vogala', '± 1075', 'hebbanollavogala'],
    7 => ['De Hanze', '1356 - ± 1450', 'hanze'],
    8 => ['Jeroen Bosch', '± 1450 - 1516', 'jeroenbosch'],
    9 => ['Maria van Bourgondië', '1457 - 1482', 'mariavanbourgondie'],
    10 => ['Erasmus', '± 1469 - 1536', 'erasmus'],
    11 => ['De Opstand', '1566 - 1581', 'opstand'],
    12 => ['Willem van Oranje', '1533 - 1584', 'willemvanoranje'],
    13 => ['Johan van Oldenbarnevelt', '1547 - 1619', 'johanvanoldenbarnevelt'],
    14 => ['VOC en WIC', '1602 - 1799', 'vocenwic'],
    15 => ['De Beemster', '1612', 'beemster'],
    16 => ['Hugo de Groot', '1583 - 1645', 'hugodegroot'],
    17 => ['De Statenbijbel', '1637', 'statenbijbel'],
    18 => ['Rembrandt', '± 1606 - 1669', 'rembrandt'],
    19 => ['De Atlas Maior van Blaeu', '1662', 'atlasmaior'],
    20 => ['Michiel de Ruyter', '1607 - 1676', 'michielderuyter'],
    21 => ['Christiaan Huygens', '1629 - 1695', 'christiaanhuygens'],
    22 => ['Spinoza', '1632 - 1677', 'spinoza'],
    23 => ['Slavernij', '± 1637 - 1863', 'slavernij'],
    24 => ['Eise Eisinga', '1744 - 1828', 'eiseeisinga'],
    25 => ['Sara Burgerhart', '1782', 'saraburgerhart'],
    26 => ['De patriotten', '1780 - 1795', 'patriotten'],
    27 => ['Napoleon Bonaparte', '1769 - 1821', 'napoleon'],
    28 => ['Koning Willem I', '1772 - 1843', 'koningwillem1'],
    29 => ['De eerste spoorlijn', '1839', 'eerstespoorlijn'],
    30 => ['De Grondwet', '1848', 'grondwet'],
    31 => ['Max Havelaar', '1860', 'maxhavelaar'],
    32 => ['Het Kinderwetje van Van Houten', '1863 - 1901', 'kinderwetje'],
    33 => ['Vincent van Gogh', '1853 - 1890', 'vincentvangogh'],
    34 => ['Aletta Jacobs', '1854 - 1929', 'alettajacobs'],
    35 => ['De Eerste Wereldoorlog', '1914 - 1918', 'eerstewereldoorlog'],
    36 => ['Anton de Kom', '1898 - 1945', 'antondekom'],
    37 => ['De Tweede Wereldoorlog', '1940 - 1945', 'tweedewereldoorlog'],
    38 => ['Anne Frank', '1929 - 1945', 'annefrank'],
    39 => ['Indonesië', '1945 - 1949', 'indonesie'],
    40 => ['De watersnood', '1 februari 1953', 'watersnood'],
    41 => ['De televisie', 'vanaf 1948', 'televisie'],
    42 => ['Haven van Rotterdam', 'vanaf ± 1880', 'havenvanrotterdam'],
    43 => ['Marga Klompé', '1912 - 1986', 'margaklompe'],
    44 => ['De gastarbeiders', 'vanaf 1960', 'gastarbeiders'],
    45 => ['Annie M.G. Schmidt', '1911 - 1995', 'anniemgschmidt'],
    46 => ['Kolen en gas', '1974 - 2023', 'kolenengas'],
    47 => ['Het Caribisch gebied', '1975-2010', 'caribischgebied'],
    48 => ['Srebrenica', '1995', 'srebrenica'],
    49 => ['Europa', 'vanaf 1945', 'europa'],
    50 => ['Het Oranjegevoel', 'vanaf 1974', 'oranjegevoel'],
];

$goals = [];

foreach ($kerndoelen as $number => [$title, $body]) {
    $goals[] = ['type' => 'kerndoel', 'code' => (string) $number, 'title' => $title, 'body' => $body, 'period' => null, 'parent' => null, 'source_url' => $kerndoelen_source];
}

foreach ($tijdvakken as $number => [$title, $period, $aspects]) {
    $goals[] = ['type' => 'tijdvak', 'code' => (string) $number, 'title' => $title, 'body' => null, 'period' => $period, 'parent' => null, 'source_url' => $syllabus_source];
    foreach ($aspects as $i => $aspect) {
        $goals[] = ['type' => 'kenmerkend_aspect', 'code' => $number.'.'.($i + 1), 'title' => $aspect, 'body' => null, 'period' => $period, 'parent' => 'tijdvak:'.$number, 'source_url' => $syllabus_source];
    }
}

foreach ($canon as $number => [$title, $period, $slug]) {
    $goals[] = ['type' => 'canonvenster', 'code' => (string) $number, 'title' => $title, 'body' => null, 'period' => $period, 'parent' => null, 'source_url' => $canon_source.$slug];
}

return $goals;
