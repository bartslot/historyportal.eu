<?php

declare(strict_types=1);

/** Dante Alighieri, English text (adapted from the Italian source, it.php). */
return [
    'title' => "Dante Alighieri: the life of a poet in exile",
    'grade_level' => '7',
    'scenes' => [
        'pre-quiz' => [
            'chapter' => "What do you already know?",
            'questions' => [
                [
                    'q' => "Did Dante invent the Italian language?",
                    'o' => [
                        "Yes, he created it on his own by writing the Commedia",
                        "No, but his work helped Tuscan become the basis of Italian",
                        "Yes, on the orders of the Pope",
                        "No, Italian only appeared in the twentieth century",
                    ],
                    'c' => 1,
                    'e' => "People were already writing in the vernacular before Dante. The Commedia, together with the work of other Tuscan writers, helped Tuscan become the model for Italian.",
                ],
                [
                    'q' => "In which city was Dante born?",
                    'o' => ["Ravenna", "Rome", "Florence", "Verona"],
                    'c' => 2,
                    'e' => "Dante was born in Florence in 1265 and died in Ravenna in 1321.",
                ],
                [
                    'q' => "What did Dante call his most famous work?",
                    'o' => ["Comedìa", "Divine Comedy", "Inferno", "Vita nova"],
                    'c' => 0,
                    'e' => "Dante called it Comedìa. The word Divine was added later.",
                ],
                [
                    'q' => "Did Dante live in Florence all his life?",
                    'o' => [
                        "Yes, he never left it",
                        "Yes, apart from a short trip to Rome",
                        "No, he moved to Paris to study",
                        "No, he was exiled and never went back",
                    ],
                    'c' => 3,
                    'e' => "From 1302 Dante lived in exile and never saw Florence again.",
                ],
                [
                    'q' => "What language is the Commedia written in?",
                    'o' => ["Latin", "Ancient Greek", "The everyday language of Florence", "French"],
                    'c' => 2,
                    'e' => "Dante chose the vernacular of Florence, the language ordinary people spoke, instead of Latin.",
                ],
            ],
        ],

        'firenze-1265' => [
            'chapter' => "A child in Florence",
            'location' => 'Florence',
            'script' => "We are in Florence in 1265. Sometime between May and June, a baby boy is born. His name is Dante Alighieri. His family belongs to the minor nobility. They have a respected name, but they are not rich. Florence, on the other hand, is very rich indeed. Its streets are crowded with merchants, bankers and workshops. Powerful families build tall tower houses. Merchants and craftsmen join guilds, the associations of each trade. And all over Europe people use a famous gold coin: the florin. This is where our story begins.",
        ],

        'poesia-beatrice' => [
            'chapter' => "Poetry, friendship and Beatrice",
            'location' => 'Florence',
            'script' => "As a young man, Dante discovers poetry. His dearest friend is Guido Cavalcanti, a poet older than him. Dante calls him his first friend. With other young poets he writes in a new way, gentle and refined, which today we call the dolce stil novo, the sweet new style. Their most important theme is love. A few years after 1290, Dante writes the Vita nova, poems and prose for Beatrice. She is usually identified as Bice Portinari, who died in 1290. But careful: this is literature, not a diary.",
        ],

        'il-foglio' => [
            'chapter' => "The sheet that comes back",
            'location' => 'Florence',
            'lines' => [
                ['beatrice', "Good morning. Yes, I mean you."],
                ['dante', "Good m..."],
                ['narrator', "In the Vita nova, Dante tells of that greeting, and of the dream that came after it."],
                ['dante', "Love was holding my heart. He woke Beatrice and made her eat it. In a dream! And then he wept. Somebody tell me what that means."],
                ['dante', "«To every captive soul and gentle heart»."],
                ['dante', "A sonnet for the poets: my dream in fourteen lines. Now you answer me."],
                ['dante', "Dante da Maiano says I'm raving and should go and see a doctor."],
                ['dante', "I asked the poets. I didn't ask for a doctor's appointment."],
                ['guido', "«You saw, it seems to me, all worth there is»."],
                ['guido', "Love took your heart away without hurting you. That is what I see in your dream."],
                ['dante', "He answers me in verse. He listened."],
                ['narrator', "Later Dante will call Guido «the first of my friends». He says that answer was almost the beginning of their friendship."],
            ],
        ],

        'campaldino-1289' => [
            'chapter' => "The Battle of Campaldino",
            'location' => 'Campaldino',
            'script' => "On the eleventh of June 1289, on the plain of Campaldino, two armies clash. On one side are the Guelfs of Florence, on the other the Ghibellines of Arezzo. The Florentines win. According to his biographers, Dante is among the horsemen, just over twenty years old. The historian Leonardo Bruni reports this over a century later. Picture him in the saddle, in armour, amid the dust and noise. Dante is not just a man of books. He takes part in his city's life, even when that means fighting.",
        ],

        'mappa-fazioni' => [
            'chapter' => "Guelfs and Ghibellines",
            'location' => 'Tuscany',
            'script' => "Let's look at the map. In Dante's Italy, two great parties compete for control of the cities. Generally, the Guelfs side with the Pope, who lives in Rome, and the Ghibellines side with the Emperor. Florence is Guelf. Arezzo, beaten at Campaldino, is Ghibelline. Siena and Pisa are neighbouring cities, sometimes allies and sometimes enemies. After 1289, though, the Florentine Guelfs start quarrelling among themselves. They split into the Whites, led by the Cerchi family, and the Blacks, led by the Donati family. This rivalry will change Dante's life.",
            'labels' => [
                'firenze' => "Florence, a Guelf city",
                'arezzo' => "Arezzo, Ghibelline in 1289",
                'campaldino' => "Campaldino, 11 June 1289",
                'siena' => "Siena, neighbour and rival",
                'pisa' => "Pisa, a sea-trading republic",
                'roma' => "Rome, home of the Pope",
            ],
        ],

        'priore-1300' => [
            'chapter' => "Dante in government",
            'location' => 'Florence',
            'script' => "To be in politics in Florence, you must belong to a guild. Around 1295 Dante joins the guild of Physicians and Apothecaries, the people who prepare medicines and sell spices. In 1300 he is elected prior, one of a few citizens who govern the city. The post lasts two months, from the fifteenth of June to the fifteenth of August. To stop the fighting, the priors send the leaders of both factions into exile. Among them is Guido Cavalcanti, Dante's first friend. Guido falls ill and dies that same summer.",
        ],

        'esilio-1302' => [
            'chapter' => "The sentence and the exile",
            'location' => 'Florence',
            'script' => "In 1301 Florence sends Dante to Rome as an ambassador to Pope Boniface the Eighth. During those months Charles of Valois, a French prince, enters the city, and the Blacks seize power. On the twenty-seventh of January 1302, Dante is convicted of barratry, which means using his office to make money, and must pay a fine. In truth it is a political charge: the winners strike at their enemies. On the tenth of March comes a death sentence, should he ever return. Dante will never see Florence again.",
        ],

        'mappa-esilio' => [
            'chapter' => "On the road in exile",
            'location' => 'Italy',
            'script' => "Where does a man go when he cannot return home? Italy then is not one country. It is divided into many small states, each with its own lords. Dante moves from court to court. In Verona he stays first with Bartolomeo della Scala, then with Cangrande, of the same family. In Lunigiana the Malaspina take him in. He crosses the Casentino. He probably spends time in Bologna and Padua. In the end he settles in Ravenna, protected by Guido Novello da Polenta. Wherever he goes, he remains a guest.",
            'labels' => [
                'firenze' => "Florence, exiled in 1302",
                'verona' => "Verona, with the Scaligeri",
                'lunigiana' => "Lunigiana, with the Malaspina",
                'casentino' => "Casentino, in the Tuscan hills",
                'bologna' => "Bologna, probably",
                'padova' => "Padua, probably",
                'ravenna' => "Ravenna, his last refuge",
            ],
        ],

        'commedia-nasce' => [
            'chapter' => "The Commedia begins",
            'location' => 'In exile',
            'script' => "Exile is painful, but Dante does not stop writing. Between about 1303 and 1307 he works on two books. The Convivio is a banquet of knowledge for people who do not know Latin. The De vulgari eloquentia, written in Latin, is about the everyday language people speak. Then, around 1306, he begins an enormous project: the Commedia. He will work on it until he dies. In 1315 Florence offers to pardon him, but only if he accepts a public humiliation. Dante refuses. He would rather stay away.",
        ],

        'commedia-galleria' => [
            'chapter' => "Inside the Commedia",
            'location' => 'Hell, Purgatory, Paradise',
            'title' => "The Commedia",
            'date_label' => "about 1306-1321",
            'story' => "A journey through the afterlife in three parts: Hell, Purgatory and Paradise. One hundred cantos in lines of eleven syllables, grouped in threes. Virgil guides Dante, then Beatrice takes over. The original title was Comedìa.",
            'script' => "The Commedia describes an imaginary journey into the afterlife. Dante travels through three realms: Hell, Purgatory and Paradise. These are its three parts, with one hundred cantos in all. The lines have eleven syllables and are grouped in threes, called terzine, with rhymes that weave together. His first guide is the Latin poet Virgil, then Beatrice. Along the way he meets real people from his own time. Dante called it Comedìa. The word Divine came later, thanks to Boccaccio's praise, and reached the title in an edition of 1555.",
        ],

        'volgare' => [
            'chapter' => "Everyone's language",
            'location' => 'Italy',
            'script' => "In Dante's time, important books are written in Latin. But very few people understand Latin. Instead, Dante chooses the vernacular of Florence, the everyday language people speak in the street, so more people can read it or hear it. So, did Dante invent Italian? No. People were already writing in the vernacular before him. But together with other Tuscan writers, such as Petrarch and Boccaccio, Dante helped Tuscan become a model. Later, scholars chose it as the basis of written Italian, and then of the language Italians speak today.",
        ],

        'ravenna-1321' => [
            'chapter' => "The last days in Ravenna",
            'location' => 'Ravenna',
            'script' => "In 1321 Dante is living in Ravenna. The lord of the city sends him on a mission to Venice. After this journey he falls ill. He dies in Ravenna during the night between the thirteenth and the fourteenth of September 1321, at the age of fifty-six. He is buried in Ravenna. The small temple we see over his tomb today was built much later, between 1780 and 1781. Florence has asked many times to have his remains back. But Dante has stayed in Ravenna, the city that welcomed him.",
        ],

        'eredita' => [
            'chapter' => "Dante today",
            'location' => 'Italy and the world',
            'script' => "Seven hundred years later, people still read Dante. Children study him at school, and the Commedia has been translated into many languages. Everyday Italian remembers him. The saying senza infamia e senza lode, without shame or praise, comes from the third canto of Hell. So does guarda e passa: Dante writes non ragioniam di lor, ma guarda e passa, meaning let us not speak of them, but look and pass. In 2021 Italy marked seven centuries since his death. Since 2020, every twenty-fifth of March is Dantedì, Dante's day.",
        ],

        'post-quiz' => [
            'chapter' => "What have you learned?",
            'questions' => [
                [
                    'q' => "Which sentence about the Italian language is correct?",
                    'o' => [
                        "Dante invented it out of nothing",
                        "Latin and Italian were the same language",
                        "The vernacular already existed, but Dante's work helped Tuscan become the basis of Italian",
                        "Italian comes from the French spoken by kings",
                    ],
                    'c' => 2,
                    'e' => "Dante did not invent Italian. His work, together with that of Petrarch and Boccaccio, helped Tuscan become a model, which scholars later chose.",
                ],
                [
                    'q' => "What was Florence like when Dante was born there in 1265?",
                    'o' => [
                        "A rich city full of merchants and bankers, with the gold florin",
                        "A small fishing village",
                        "The capital of a united Italy",
                        "A city ruled by the Emperor from Ravenna",
                    ],
                    'c' => 0,
                    'e' => "Florence was a rich, crowded city, famous for its trade, its banks and its gold florin.",
                ],
                [
                    'q' => "Why did Dante write the Commedia in the vernacular and not in Latin?",
                    'o' => [
                        "Because he did not know Latin",
                        "Because the Pope banned him from using Latin",
                        "Because the vernacular was quicker to write",
                        "Because that way more people could read it",
                    ],
                    'c' => 3,
                    'e' => "Very few people understood Latin, while the vernacular of Florence was the language people really spoke.",
                ],
                [
                    'q' => "Where does the word Divine in the title of the Commedia come from?",
                    'o' => [
                        "Dante chose it from the very beginning",
                        "It was added later, and appears in an edition from 1555",
                        "Pope Boniface the Eighth insisted on it",
                        "It means the work is only about angels",
                    ],
                    'c' => 1,
                    'e' => "Dante called it Comedìa. Divine comes from Boccaccio's praise and entered the title with the edition of 1555.",
                ],
                [
                    'q' => "What was Dante accused of in 1302?",
                    'o' => [
                        "Losing the Battle of Campaldino",
                        "Stealing books from the Pope",
                        "Insulting Guido Cavalcanti",
                        "Barratry, a charge that was really political",
                    ],
                    'c' => 3,
                    'e' => "When the Blacks took power, they condemned their opponents. The charge of corruption was a way to strike at Dante.",
                ],
                [
                    'q' => "In 1315 Florence offered to let Dante come back. What did he do?",
                    'o' => [
                        "He refused, because he would have had to humiliate himself in public",
                        "He went straight home",
                        "He accepted, but died on the journey",
                        "He sent Beatrice in his place",
                    ],
                    'c' => 0,
                    'e' => "Dante refused the pardon on those terms and stayed in exile until his death.",
                ],
            ],
        ],
    ],
];
