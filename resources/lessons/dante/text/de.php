<?php

declare(strict_types=1);

/** Dante Alighieri, deutscher Text (adaptiert aus it.php). */
return [
    'title' => "Dante Alighieri: das Leben eines Dichters im Exil",
    'grade_level' => '7',
    'scenes' => [
        'pre-quiz' => [
            'chapter' => "Was weißt du schon?",
            'questions' => [
                [
                    'q' => "Hat Dante die italienische Sprache erfunden?",
                    'o' => [
                        "Ja, er hat sie ganz allein erschaffen, als er die Commedia schrieb",
                        "Nein, aber sein Werk half dem Toskanischen, zur Grundlage des Italienischen zu werden",
                        "Ja, im Auftrag des Papstes",
                        "Nein, Italienisch ist erst im zwanzigsten Jahrhundert entstanden",
                    ],
                    'c' => 1,
                    'e' => "Schon vor Dante schrieb man in der Volkssprache. Die Commedia half zusammen mit den Werken anderer toskanischer Schriftsteller dem Toskanischen, zum Vorbild für das Italienische zu werden.",
                ],
                [
                    'q' => "In welcher Stadt wurde Dante geboren?",
                    'o' => ["Ravenna", "Rom", "Florenz", "Verona"],
                    'c' => 2,
                    'e' => "Dante wurde 1265 in Florenz geboren und starb 1321 in Ravenna.",
                ],
                [
                    'q' => "Wie nannte Dante sein berühmtestes Werk?",
                    'o' => ["Comedìa", "Göttliche Komödie", "Inferno", "Vita nova"],
                    'c' => 0,
                    'e' => "Dante nannte es Comedìa. Das Wort göttlich kam erst später dazu.",
                ],
                [
                    'q' => "Hat Dante sein ganzes Leben in Florenz verbracht?",
                    'o' => [
                        "Ja, er hat die Stadt nie verlassen",
                        "Ja, bis auf eine kurze Reise nach Rom",
                        "Nein, er zog zum Studieren nach Paris",
                        "Nein, er wurde verbannt und kam nie zurück",
                    ],
                    'c' => 3,
                    'e' => "Ab 1302 lebte Dante in der Verbannung und sah Florenz nie wieder.",
                ],
                [
                    'q' => "In welcher Sprache ist die Commedia geschrieben?",
                    'o' => ["Auf Latein", "Auf Altgriechisch", "In der Volkssprache von Florenz", "Auf Französisch"],
                    'c' => 2,
                    'e' => "Dante wählte die Volkssprache von Florenz, also die Sprache, die die Leute sprachen, und nicht Latein.",
                ],
            ],
        ],

        'firenze-1265' => [
            'chapter' => "Ein Kind in Florenz",
            'location' => 'Florenz',
            'script' => "Wir sind in Florenz, im Jahr 1265. Zwischen Mai und Juni kommt ein Junge zur Welt. Er heißt Dante Alighieri. Seine Familie gehört zum niederen Adel. Ihr Name hat einen guten Ruf, aber reich ist sie nicht. Florenz dagegen ist sehr reich. In den Straßen drängen sich Kaufleute, Bankiers und Werkstätten. Mächtige Familien bauen hohe Wohntürme. Kaufleute und Handwerker schließen sich in Zünften zusammen. Und in ganz Europa ist eine berühmte Goldmünze unterwegs, der Florin. Hier beginnt unsere Geschichte.",
        ],

        'poesia-beatrice' => [
            'chapter' => "Dichtung, Freundschaft und Beatrice",
            'location' => 'Florenz',
            'script' => "Als junger Mann entdeckt Dante die Dichtung. Sein engster Freund ist Guido Cavalcanti, ein Dichter, der älter ist als er. Dante nennt ihn seinen ersten Freund. Mit anderen jungen Leuten schreiben sie auf eine neue Art, sanft und fein. Heute nennen wir das den dolce stil novo, den süßen neuen Stil. Das wichtigste Thema ist die Liebe. Einige Jahre nach 1290 schreibt Dante die Vita nova, Gedichte und Prosa für Beatrice. Meistens denkt man dabei an Bice Portinari, die 1290 starb. Aber Vorsicht, das ist Literatur und kein Tagebuch.",
        ],

        'campaldino-1289' => [
            'chapter' => "Die Schlacht von Campaldino",
            'location' => 'Campaldino',
            'script' => "Am elften Juni 1289 treffen in der Ebene von Campaldino zwei Heere aufeinander. Auf der einen Seite stehen die Guelfen aus Florenz, auf der anderen die Ghibellinen aus Arezzo. Die Florentiner gewinnen. Nach Angaben seiner Biografen reitet unter den Rittern auch Dante mit, gerade etwas über zwanzig Jahre alt. Das erzählt über hundert Jahre später Leonardo Bruni. Stellen wir ihn uns im Sattel vor, in Rüstung, mitten in Staub und Lärm. Dante ist nicht nur ein Mann der Bücher. Er lebt mit seiner Stadt, auch im Kampf.",
        ],

        'mappa-fazioni' => [
            'chapter' => "Guelfen und Ghibellinen",
            'location' => 'Toskana',
            'script' => "Schauen wir auf die Karte. In Dantes Italien streiten zwei große Parteien um die Städte. Im Großen und Ganzen halten die Guelfen zum Papst, der in Rom lebt, und die Ghibellinen zum Kaiser. Florenz ist guelfisch. Arezzo, das bei Campaldino verloren hat, ist ghibellinisch. Siena und Pisa sind Nachbarstädte, mal verbündet und mal verfeindet. Nach 1289 zerstreiten sich aber die Guelfen in Florenz untereinander. Sie spalten sich in die Weißen, angeführt von der Familie Cerchi, und die Schwarzen, angeführt von der Familie Donati. Dieser Streit wird Dantes Leben verändern.",
            'labels' => [
                'firenze' => "Florenz, guelfische Stadt",
                'arezzo' => "Arezzo, 1289 ghibellinisch",
                'campaldino' => "Campaldino, 11. Juni 1289",
                'siena' => "Siena, Nachbar und Rivale",
                'pisa' => "Pisa, Seerepublik",
                'roma' => "Rom, Sitz des Papstes",
            ],
        ],

        'priore-1300' => [
            'chapter' => "Dante in der Regierung",
            'location' => 'Florenz',
            'script' => "Wer in Florenz Politik machen will, braucht eine Zunft. Um 1295 tritt Dante in die Zunft der Ärzte und Apotheker ein, also der Leute, die Arzneien herstellen und Gewürze verkaufen. Im Jahr 1300 wird er zum Prior gewählt. Damit gehört er zu den wenigen Bürgern an der Regierung. Das Amt dauert zwei Monate, vom fünfzehnten Juni bis zum fünfzehnten August. Gegen die Kämpfe schicken die Prioren die Anführer beider Parteien in die Verbannung. Darunter ist Guido Cavalcanti, Dantes erster Freund. Guido wird krank und stirbt noch im selben Sommer.",
        ],

        'esilio-1302' => [
            'chapter' => "Das Urteil und die Verbannung",
            'location' => 'Florenz',
            'script' => "Im Jahr 1301 schickt Florenz Dante als Gesandten nach Rom, zu Papst Bonifatius dem Achten. In diesen Monaten zieht ein französischer Prinz in die Stadt ein, Karl von Valois, und die Schwarzen übernehmen die Macht. Am siebenundzwanzigsten Januar 1302 wird Dante wegen Bestechlichkeit verurteilt. Er soll sein Amt benutzt haben, um an Geld zu kommen, und muss eine Strafe zahlen. In Wahrheit ist das eine politische Anklage. Wer gewinnt, schlägt seine Gegner. Am zehnten März folgt ein Todesurteil, falls er jemals zurückkommt. Dante wird Florenz nie wiedersehen.",
        ],

        'mappa-esilio' => [
            'chapter' => "Unterwegs in der Verbannung",
            'location' => 'Italien',
            'script' => "Wohin geht ein Mensch, der nicht mehr nach Hause darf? Das Italien von damals ist kein einheitliches Land. Es besteht aus vielen kleinen Staaten mit eigenen Herren. Dante zieht von Hof zu Hof. In Verona ist er zuerst Gast von Bartolomeo della Scala, später von Cangrande aus derselben Familie. In der Lunigiana nehmen ihn die Malaspina auf. Er zieht durchs Casentino. Wahrscheinlich lebt er eine Zeit lang in Bologna und in Padua. Am Ende bleibt er in Ravenna, beschützt von Guido Novello da Polenta. Überall bleibt er ein Gast.",
            'labels' => [
                'firenze' => "Florenz, 1302 verbannt",
                'verona' => "Verona, bei den Scaligern",
                'lunigiana' => "Lunigiana, bei den Malaspina",
                'casentino' => "Casentino, in den Bergen der Toskana",
                'bologna' => "Bologna, wahrscheinlich",
                'padova' => "Padua, wahrscheinlich",
                'ravenna' => "Ravenna, die letzte Zuflucht",
            ],
        ],

        'commedia-nasce' => [
            'chapter' => "Die Commedia entsteht",
            'location' => 'In der Verbannung',
            'script' => "Trotz der Verbannung schreibt Dante weiter. Ungefähr zwischen 1303 und 1307 arbeitet er an zwei Werken. Das Convivio ist ein Gastmahl des Wissens für alle, die kein Latein können. De vulgari eloquentia ist auf Latein geschrieben und handelt von der Sprache des Alltags. Dann, um 1306, beginnt er ein riesiges Vorhaben, die Commedia. Auf Deutsch heißt sie heute Göttliche Komödie. Daran arbeitet er bis zu seinem Tod. 1315 bietet Florenz ihm Begnadigung an, aber nur mit einer öffentlichen Demütigung. Dante lehnt ab. Er bleibt lieber in der Ferne.",
        ],

        'commedia-galleria' => [
            'chapter' => "In der Commedia",
            'location' => 'Hölle, Fegefeuer, Paradies',
            'title' => "Die Commedia",
            'date_label' => "um 1306-1321",
            'story' => "Eine Reise ins Jenseits in drei Teilen: Hölle, Fegefeuer und Paradies. Hundert Gesänge in Elfsilbern und Terzinen. Vergil führt Dante, dann kommt Beatrice. Der ursprüngliche Titel war Comedìa.",
            'script' => "Die Commedia erzählt von einer erfundenen Reise ins Jenseits. Dante durchquert drei Reiche, die Hölle, das Fegefeuer und das Paradies. Das sind die drei Teile des Werks, mit zusammen hundert Gesängen. Die Verse heißen Elfsilber und stehen immer zu dritt in Terzinen, mit Reimen, die ineinandergreifen. Zuerst führt ihn der römische Dichter Vergil, später Beatrice. Unterwegs trifft er echte Menschen aus seiner Zeit. Dante nannte das Werk Comedìa. Das Wort Divina, also göttlich, kam später dazu, weil Boccaccio es so gelobt hatte, und landete 1555 im Titel einer Ausgabe.",
        ],

        'volgare' => [
            'chapter' => "Eine Sprache für alle",
            'location' => 'Italien',
            'script' => "Zu Dantes Zeit schreibt man wichtige Bücher auf Latein. Aber Latein verstehen nur wenige. Dante wählt stattdessen die Volkssprache von Florenz, die Sprache, die man auf der Straße spricht. So können ihn mehr Menschen lesen oder hören. Hat Dante also das Italienische erfunden? Nein. Schon vor ihm schrieb man in der Volkssprache. Aber zusammen mit anderen toskanischen Schriftstellern wie Petrarca und Boccaccio half Dante, das Toskanische zum Vorbild zu machen. Später wählten Gelehrte es als Grundlage des geschriebenen Italienisch und dann der heutigen Sprache.",
        ],

        'ravenna-1321' => [
            'chapter' => "Die letzten Tage in Ravenna",
            'location' => 'Ravenna',
            'script' => "Im Jahr 1321 lebt Dante in Ravenna. Der Herr der Stadt schickt ihn als Gesandten nach Venedig. Nach dieser Reise wird er krank. Er stirbt in Ravenna in der Nacht vom dreizehnten auf den vierzehnten September 1321, mit sechsundfünfzig Jahren. Begraben wird er in Ravenna. Der kleine Tempel, den wir heute über seinem Grab sehen, wurde viel später gebaut, zwischen 1780 und 1781. Florenz hat mehrmals verlangt, seine Gebeine zurückzubekommen. Aber Dante ist in Ravenna geblieben, in der Stadt, die ihn aufgenommen hatte.",
        ],

        'eredita' => [
            'chapter' => "Dante heute",
            'location' => 'Italien und die Welt',
            'script' => "Siebenhundert Jahre später ist Dante immer noch bei uns. Man liest ihn in der Schule, und die Commedia gibt es in vielen Sprachen. Auch Redewendungen erinnern an ihn. Der Ausdruck senza infamia e senza lode, ohne Schande und ohne Lob, stammt aus dem dritten Gesang der Hölle. Von dort kommt auch guarda e passa. Dante schreibt: non ragioniam di lor, ma guarda e passa. Also, reden wir nicht über sie, schau und geh weiter. 2021 gedachte Italien seines siebenhundertsten Todestags. Seit 2020 ist jeder fünfundzwanzigste März sein Gedenktag, der Dantedì.",
        ],

        'post-quiz' => [
            'chapter' => "Was hast du gelernt?",
            'questions' => [
                [
                    'q' => "Welcher Satz über die italienische Sprache stimmt?",
                    'o' => [
                        "Dante hat sie aus dem Nichts erfunden",
                        "Latein und Italienisch waren dieselbe Sprache",
                        "Die Volkssprache gab es schon, aber Dantes Werk half dem Toskanischen, zur Grundlage des Italienischen zu werden",
                        "Italienisch stammt vom Französisch der Könige ab",
                    ],
                    'c' => 2,
                    'e' => "Dante hat das Italienische nicht erfunden. Sein Werk half zusammen mit dem von Petrarca und Boccaccio, das Toskanische zum Vorbild zu machen, das Gelehrte später auswählten.",
                ],
                [
                    'q' => "Wie war das Florenz, in dem Dante 1265 geboren wurde?",
                    'o' => [
                        "Eine reiche Stadt voller Kaufleute und Bankiers, mit dem goldenen Florin",
                        "Ein kleines Fischerdorf",
                        "Die Hauptstadt eines geeinten Italiens",
                        "Eine Stadt, die der Kaiser von Ravenna aus regierte",
                    ],
                    'c' => 0,
                    'e' => "Florenz war eine reiche, volle Stadt, berühmt für Handel, Banken und den goldenen Florin.",
                ],
                [
                    'q' => "Warum schrieb Dante die Commedia in der Volkssprache und nicht auf Latein?",
                    'o' => [
                        "Weil er kein Latein konnte",
                        "Weil der Papst ihm Latein verboten hatte",
                        "Weil die Volkssprache kürzer zu schreiben war",
                        "Weil sie so mehr Menschen lesen konnten",
                    ],
                    'c' => 3,
                    'e' => "Latein verstanden nur wenige. Die Volkssprache von Florenz war die Sprache, die die Leute wirklich sprachen.",
                ],
                [
                    'q' => "Woher kommt das Wort göttlich im Titel Göttliche Komödie?",
                    'o' => [
                        "Dante hat es von Anfang an so gewollt",
                        "Es kam später dazu und steht in einer Ausgabe von 1555",
                        "Papst Bonifatius der Achte hat es verlangt",
                        "Es bedeutet, dass das Werk nur von Engeln handelt",
                    ],
                    'c' => 1,
                    'e' => "Dante nannte das Werk Comedìa. Göttlich geht auf das Lob von Boccaccio zurück und kam mit der Ausgabe von 1555 in den Titel.",
                ],
                [
                    'q' => "Was warf man Dante im Jahr 1302 vor?",
                    'o' => [
                        "Dass er die Schlacht von Campaldino verloren hatte",
                        "Dass er dem Papst Bücher gestohlen hatte",
                        "Dass er Guido Cavalcanti beleidigt hatte",
                        "Bestechlichkeit, aber in Wahrheit war die Anklage politisch",
                    ],
                    'c' => 3,
                    'e' => "Als die Schwarzen die Macht übernahmen, verurteilten sie ihre Gegner. Der Vorwurf der Bestechlichkeit sollte Dante treffen.",
                ],
                [
                    'q' => "1315 bot Florenz Dante an, zurückzukommen. Was tat er?",
                    'o' => [
                        "Er lehnte ab, weil er sich öffentlich hätte demütigen müssen",
                        "Er kehrte sofort nach Hause zurück",
                        "Er nahm an, starb aber auf der Reise",
                        "Er schickte Beatrice an seiner Stelle",
                    ],
                    'c' => 0,
                    'e' => "Dante lehnte die Begnadigung unter diesen Bedingungen ab und blieb bis zu seinem Tod in der Verbannung.",
                ],
            ],
        ],
    ],
];
