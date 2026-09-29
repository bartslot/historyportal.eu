<?php

declare(strict_types=1);

/** Dante Alighieri, Nederlandse tekst (bewerkt naar de Italiaanse hoofdtekst). */
return [
    'title' => "Dante Alighieri: het leven van een dichter in ballingschap",
    'grade_level' => '7',
    'scenes' => [
        'pre-quiz' => [
            'chapter' => "Wat weet je al?",
            'questions' => [
                [
                    'q' => "Heeft Dante de Italiaanse taal uitgevonden?",
                    'o' => [
                        "Ja, hij bedacht die helemaal zelf toen hij de Commedia schreef",
                        "Nee, maar zijn werk hielp het Toscaans om de basis van het Italiaans te worden",
                        "Ja, in opdracht van de paus",
                        "Nee, het Italiaans ontstond pas in de twintigste eeuw",
                    ],
                    'c' => 1,
                    'e' => "Voor Dante schreven mensen al in de volkstaal. De Commedia hielp, samen met het werk van andere Toscaanse schrijvers, het Toscaans om het voorbeeld voor het Italiaans te worden.",
                ],
                [
                    'q' => "In welke stad is Dante geboren?",
                    'o' => ["Ravenna", "Rome", "Florence", "Verona"],
                    'c' => 2,
                    'e' => "Dante werd in 1265 geboren in Florence en stierf in 1321 in Ravenna.",
                ],
                [
                    'q' => "Hoe noemde Dante zelf zijn beroemdste werk?",
                    'o' => ["Comedìa", "Divina Commedia", "Inferno", "Vita nova"],
                    'c' => 0,
                    'e' => "Dante noemde het Comedìa. Het woord Divina is er pas later bij gekomen.",
                ],
                [
                    'q' => "Heeft Dante zijn hele leven in Florence gewoond?",
                    'o' => [
                        "Ja, hij is er nooit weggeweest",
                        "Ja, op één korte reis naar Rome na",
                        "Nee, hij ging in Parijs studeren",
                        "Nee, hij werd verbannen en is nooit teruggekomen",
                    ],
                    'c' => 3,
                    'e' => "Vanaf 1302 leefde Dante in ballingschap en hij heeft Florence nooit meer teruggezien.",
                ],
                [
                    'q' => "In welke taal is de Commedia geschreven?",
                    'o' => ["In het Latijn", "In het Oudgrieks", "In de volkstaal van Florence", "In het Frans"],
                    'c' => 2,
                    'e' => "Dante koos voor de volkstaal van Florence, de taal die de mensen spraken, in plaats van het Latijn.",
                ],
            ],
        ],

        'firenze-1265' => [
            'chapter' => "Een jongetje in Florence",
            'location' => 'Florence',
            'script' => "We zijn in Florence, in het jaar 1265. Ergens tussen mei en juni wordt er een jongetje geboren. Hij heet Dante Alighieri. Zijn familie hoort bij de lage adel. Ze hebben een goede naam, maar rijk zijn ze niet. Florence zelf is juist schatrijk. De straten zitten vol kooplieden, bankiers en werkplaatsen. Machtige families bouwen hoge woontorens. Kooplieden en ambachtslieden zitten in gilden, de verenigingen van hun vak. En in heel Europa kennen ze een beroemde gouden munt: de florijn. Hier begint ons verhaal.",
        ],

        'poesia-beatrice' => [
            'chapter' => "Gedichten, vriendschap en Beatrice",
            'location' => 'Florence',
            'script' => "Als jonge man ontdekt Dante de poëzie. Zijn beste vriend is Guido Cavalcanti, een dichter die ouder is dan hij. Dante noemt hem zijn eerste vriend. Met andere jongeren schrijven ze op een nieuwe, zachte en verfijnde manier. Nu noemen we dat de dolce stil novo, de zoete nieuwe stijl. Het belangrijkste onderwerp is de liefde. Een paar jaar na 1290 schrijft Dante de Vita nova, gedichten en proza voor Beatrice. Meestal denkt men aan Bice Portinari, die in 1290 stierf. Maar let op: het is literatuur en geen dagboek.",
        ],

        'il-foglio' => [
            'chapter' => "Het blad dat terugkomt",
            'location' => 'Florence',
            'lines' => [
                ['beatrice', "Goedendag. Ja, u bedoel ik."],
                ['dante', "Goe..."],
                ['narrator', "In de Vita nova vertelt Dante over die groet, en over de droom die daarna kwam."],
                ['dante', "Amor had mijn hart in zijn hand. Hij maakte Beatrice wakker en liet haar het opeten. In een droom! En toen huilde hij. Kan iemand me uitleggen wat dat betekent?"],
                ['dante', "«Aan elke gevangen ziel en elk edel hart»."],
                ['dante', "Een sonnet voor de dichters: mijn droom in veertien regels. Geef mij maar antwoord."],
                ['dante', "Dante da Maiano zegt dat ik ijl en dat ik naar een dokter moet."],
                ['dante', "Ik vroeg het aan dichters. Niet om een afspraak bij de dokter."],
                ['guido', "«U zag, zo lijkt het mij, alle waarde»."],
                ['guido', "Amor heeft je hart meegenomen zonder je pijn te doen. Dat zie ik in je droom."],
                ['dante', "Hij antwoordt me in verzen. Hij heeft geluisterd."],
                ['narrator', "Later noemt Dante Guido «de eerste van mijn vrienden». Hij zegt dat dat antwoord bijna het begin van hun vriendschap was."],
            ],
        ],

        'campaldino-1289' => [
            'chapter' => "De slag bij Campaldino",
            'location' => 'Campaldino',
            'script' => "Op 11 juni 1289 botsen twee legers op de vlakte van Campaldino. Aan de ene kant staan de Guelfen uit Florence, aan de andere kant de Ghibellijnen uit Arezzo. De Florentijnen winnen. Volgens zijn biografen zit ook Dante tussen de ruiters. Hij is dan ruim twintig. Dat vertelt de geschiedschrijver Leonardo Bruni, ruim honderd jaar later. Stel je hem voor op zijn paard, in harnas, in het stof en het lawaai. Dante is dus geen boekenwurm alleen. Hij doet mee in zijn stad, ook als er gevochten moet worden.",
        ],

        'mappa-fazioni' => [
            'chapter' => "Guelfen en Ghibellijnen",
            'location' => 'Toscane',
            'script' => "Kijk naar de kaart. In het Italië van Dante strijden twee grote partijen om de steden. Meestal staan de Guelfen aan de kant van de paus, die in Rome woont, en de Ghibellijnen aan de kant van de keizer. Florence is Guelfs. Arezzo, dat bij Campaldino verloor, is Ghibellijns. Buursteden Siena en Pisa zijn soms bondgenoten, soms vijanden. Na 1289 krijgen de Florentijnse Guelfen onderling ruzie. Ze splitsen zich in de Witten, geleid door de familie Cerchi, en de Zwarten, geleid door de familie Donati. Die ruzie verandert Dantes leven.",
            'labels' => [
                'firenze' => "Florence, stad van de Guelfen",
                'arezzo' => "Arezzo, Ghibellijns in 1289",
                'campaldino' => "Campaldino, 11 juni 1289",
                'siena' => "Siena, buurstad en rivaal",
                'pisa' => "Pisa, republiek aan zee",
                'roma' => "Rome, waar de paus zetelt",
            ],
        ],

        'priore-1300' => [
            'chapter' => "Dante in het stadsbestuur",
            'location' => 'Florence',
            'script' => "Wie in Florence wil meebesturen, moet lid zijn van een gilde. Rond 1295 wordt Dante lid van het gilde van de artsen en apothekers, voor wie medicijnen maakt en specerijen verkoopt. In 1300 wordt hij gekozen tot prior, een van de weinige burgers die de stad besturen. Dat duurt twee maanden, van 15 juni tot 15 augustus. Om de gevechten te stoppen, sturen de priors de leiders van allebei de partijen in ballingschap. Een van hen is Guido Cavalcanti, Dantes eerste vriend. Guido wordt ziek en sterft diezelfde zomer.",
        ],

        'esilio-1302' => [
            'chapter' => "Veroordeeld en verbannen",
            'location' => 'Florence',
            'script' => "In 1301 stuurt Florence Dante als gezant naar Rome, naar paus Bonifatius de Achtste. In die maanden trekt Karel van Valois, een Franse prins, de stad binnen, en de Zwarten grijpen de macht. Op 27 januari 1302 wordt Dante veroordeeld voor corruptie: hij zou zijn ambt hebben gebruikt om geld te verdienen. Hij moet een boete betalen. Eigenlijk is het een politieke beschuldiging. Wie wint, pakt zijn tegenstanders aan. Op 10 maart volgt de doodstraf, als hij ooit terugkomt. Dante zal Florence nooit meer terugzien.",
        ],

        'mappa-esilio' => [
            'chapter' => "Op reis als balling",
            'location' => 'Italië',
            'script' => "Waar gaat iemand heen die niet meer naar huis mag? Italië is toen niet één land. Het bestaat uit veel kleine staten, elk met eigen heersers. Dante trekt van hof naar hof. In Verona is hij eerst te gast bij Bartolomeo della Scala, later bij Cangrande, uit dezelfde familie. In Lunigiana vangen de Malaspina hem op. Hij komt door de Casentino. Waarschijnlijk woont hij een tijd in Bologna en Padua. Uiteindelijk blijft hij in Ravenna, beschermd door Guido Novello da Polenta. Waar hij ook komt, hij blijft een gast.",
            'labels' => [
                'firenze' => "Florence, verbannen in 1302",
                'verona' => "Verona, bij de familie Della Scala",
                'lunigiana' => "Lunigiana, bij de Malaspina",
                'casentino' => "Casentino, in de Toscaanse bergen",
                'bologna' => "Bologna, waarschijnlijk",
                'padova' => "Padua, waarschijnlijk",
                'ravenna' => "Ravenna, zijn laatste toevluchtsoord",
            ],
        ],

        'commedia-nasce' => [
            'chapter' => "De Commedia ontstaat",
            'location' => 'In ballingschap',
            'script' => "De ballingschap doet pijn, maar Dante blijft schrijven. Ongeveer tussen 1303 en 1307 werkt hij aan twee boeken. Het Convivio is een soort feestmaal van kennis, voor mensen die geen Latijn kennen. Het boek De vulgari eloquentia is in het Latijn geschreven en gaat over de taal van elke dag. Rond 1306 begint hij aan een enorm project: de Commedia. Daar werkt hij aan tot zijn dood. In 1315 biedt Florence hem vergeving aan, maar alleen als hij zich in het openbaar vernedert. Dante weigert. Hij blijft liever ver weg.",
        ],

        'commedia-galleria' => [
            'chapter' => "In de Commedia",
            'location' => 'Hel, Vagevuur, Paradijs',
            'title' => "De Commedia",
            'date_label' => "rond 1306-1321",
            'story' => "Een reis door het hiernamaals in drie delen: de Hel, het Vagevuur en het Paradijs. Honderd zangen in regels van elf lettergrepen en terzinen. Vergilius leidt Dante, daarna komt Beatrice. De oorspronkelijke titel was Comedìa.",
            'script' => "De Commedia vertelt over een verzonnen reis door het hiernamaals. Dante trekt door drie rijken: de Hel, het Vagevuur en het Paradijs. Drie delen, samen honderd zangen. Elke versregel telt elf lettergrepen, en de regels staan in groepjes van drie, terzinen, met rijmen die in elkaar grijpen. Eerst is de Latijnse dichter Vergilius zijn gids, daarna Beatrice. Onderweg ontmoet hij echte mensen uit zijn tijd. Dante noemde het Comedìa. Het woord Divina kwam later, door de lof van Boccaccio, en stond in 1555 in de titel van een uitgave.",
        ],

        'volgare' => [
            'chapter' => "Een taal voor iedereen",
            'location' => 'Italië',
            'script' => "In Dantes tijd schrijf je belangrijke boeken in het Latijn. Maar weinig mensen begrijpen dat. Dante kiest de volkstaal van Florence, de taal van de straat. Zo kunnen meer mensen zijn werk lezen of horen. Heeft Dante dan het Italiaans uitgevonden? Nee. Voor hem schreven mensen ook al in de volkstaal. Maar samen met andere Toscaanse schrijvers, zoals Petrarca en Boccaccio, hielp Dante het Toscaans om een voorbeeld te worden. Later kozen geleerden het als basis voor het geschreven Italiaans, en daarna voor de taal die Italianen nu spreken.",
        ],

        'ravenna-1321' => [
            'chapter' => "De laatste dagen in Ravenna",
            'location' => 'Ravenna',
            'script' => "In 1321 woont Dante in Ravenna. De heer van de stad stuurt hem als gezant naar Venetië. Na die reis wordt hij ziek. Hij sterft in Ravenna, in de nacht van 13 op 14 september 1321. Hij is dan zesenvijftig jaar. Hij wordt in Ravenna begraven. Het kleine tempeltje dat nu op zijn graf staat, is pas veel later gebouwd, in 1780 en 1781. Florence heeft vaak gevraagd om zijn stoffelijk overschot terug te krijgen. Maar Dante is in Ravenna gebleven, de stad die hem had opgevangen.",
        ],

        'eredita' => [
            'chapter' => "Dante nu",
            'location' => 'Italië en de wereld',
            'script' => "Zevenhonderd jaar later is Dante er nog. Op school leer je over hem, en de Commedia is in veel talen vertaald. Ook Italiaanse uitdrukkingen komen van hem. Senza infamia e senza lode, zonder schande en zonder lof, komt uit de derde zang van de Hel. Guarda e passa ook, uit de regel non ragioniam di lor, ma guarda e passa. Laten we het niet over hen hebben, kijk en loop door. In 2021 herdacht Italië zijn zevenhonderdste sterfdag. Sinds 2020 is 25 maart elk jaar Dantedì, de dag van Dante.",
        ],

        'post-quiz' => [
            'chapter' => "Wat heb je geleerd?",
            'questions' => [
                [
                    'q' => "Welke zin over de Italiaanse taal klopt?",
                    'o' => [
                        "Dante heeft die uit het niets bedacht",
                        "Latijn en Italiaans waren dezelfde taal",
                        "De volkstaal bestond al, maar het werk van Dante hielp het Toscaans om de basis van het Italiaans te worden",
                        "Het Italiaans komt van het Frans van de koningen",
                    ],
                    'c' => 2,
                    'e' => "Dante heeft het Italiaans niet uitgevonden. Zijn werk hielp, samen met dat van Petrarca en Boccaccio, het Toscaans om een voorbeeld te worden, dat geleerden later kozen.",
                ],
                [
                    'q' => "Hoe zag het Florence eruit waar Dante in 1265 werd geboren?",
                    'o' => [
                        "Een rijke stad vol kooplieden en bankiers, met de gouden florijn",
                        "Een klein vissersdorp",
                        "De hoofdstad van een verenigd Italië",
                        "Een stad die de keizer vanuit Ravenna bestuurde",
                    ],
                    'c' => 0,
                    'e' => "Florence was een rijke, drukke stad, beroemd om de handel, de banken en de gouden florijn.",
                ],
                [
                    'q' => "Waarom schreef Dante de Commedia in de volkstaal en niet in het Latijn?",
                    'o' => [
                        "Omdat hij geen Latijn kende",
                        "Omdat de paus hem het Latijn verbood",
                        "Omdat de volkstaal korter was om te schrijven",
                        "Omdat meer mensen het dan konden lezen",
                    ],
                    'c' => 3,
                    'e' => "Latijn begrepen maar weinig mensen. De volkstaal van Florence was de taal die mensen echt spraken.",
                ],
                [
                    'q' => "Waar komt het woord Divina in de titel van de Commedia vandaan?",
                    'o' => [
                        "Dante koos het zelf, al vanaf het begin",
                        "Het kwam er later bij, en staat in een uitgave uit 1555",
                        "Paus Bonifatius de Achtste wilde het zo",
                        "Het betekent dat het boek alleen over engelen gaat",
                    ],
                    'c' => 1,
                    'e' => "Dante noemde het Comedìa. Divina komt uit de lof van Boccaccio en kwam in de titel terecht met de uitgave van 1555.",
                ],
                [
                    'q' => "Waarvan werd Dante in 1302 beschuldigd?",
                    'o' => [
                        "Dat hij de slag bij Campaldino had verloren",
                        "Dat hij boeken van de paus had gestolen",
                        "Dat hij Guido Cavalcanti had beledigd",
                        "Van corruptie, een beschuldiging die eigenlijk politiek was",
                    ],
                    'c' => 3,
                    'e' => "Toen de Zwarten de macht grepen, veroordeelden ze hun tegenstanders. De beschuldiging van corruptie was bedoeld om Dante te raken.",
                ],
                [
                    'q' => "In 1315 mocht Dante terugkomen naar Florence. Wat deed hij?",
                    'o' => [
                        "Hij weigerde, want hij had zich in het openbaar moeten vernederen",
                        "Hij ging meteen naar huis",
                        "Hij zei ja, maar stierf onderweg",
                        "Hij stuurde Beatrice in zijn plaats",
                    ],
                    'c' => 0,
                    'e' => "Dante weigerde de vergeving onder die voorwaarden en bleef tot zijn dood in ballingschap.",
                ],
            ],
        ],
    ],
];
