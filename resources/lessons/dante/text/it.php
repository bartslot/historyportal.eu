<?php

declare(strict_types=1);

/** Dante Alighieri, testo italiano (lingua principale della lezione). */
return [
    'title' => "Dante Alighieri: la vita di un poeta in esilio",
    'grade_level' => '7',
    'scenes' => [
        'pre-quiz' => [
            'chapter' => "Che cosa sai già?",
            'questions' => [
                [
                    'q' => "Dante ha inventato la lingua italiana?",
                    'o' => [
                        "Sì, l'ha creata da solo scrivendo la Commedia",
                        "No, ma la sua opera ha aiutato il toscano a diventare la base dell'italiano",
                        "Sì, su ordine del papa",
                        "No, l'italiano è nato solo nel Novecento",
                    ],
                    'c' => 1,
                    'e' => "Prima di Dante si scriveva già in volgare. La Commedia, insieme alle opere di altri scrittori toscani, aiutò il toscano a diventare il modello dell'italiano.",
                ],
                [
                    'q' => "In quale città è nato Dante?",
                    'o' => ["Ravenna", "Roma", "Firenze", "Verona"],
                    'c' => 2,
                    'e' => "Dante è nato a Firenze nel 1265 ed è morto a Ravenna nel 1321.",
                ],
                [
                    'q' => "Come chiamava Dante la sua opera più famosa?",
                    'o' => ["Comedìa", "Divina Commedia", "Inferno", "Vita nova"],
                    'c' => 0,
                    'e' => "Dante la chiamava Comedìa: la parola Divina è stata aggiunta più tardi.",
                ],
                [
                    'q' => "Dante ha vissuto tutta la vita a Firenze?",
                    'o' => [
                        "Sì, non ne è mai uscito",
                        "Sì, tranne un breve viaggio a Roma",
                        "No, si è trasferito a Parigi per studiare",
                        "No, è stato esiliato e non è più tornato",
                    ],
                    'c' => 3,
                    'e' => "Dal 1302 Dante visse in esilio e non rivide mai più Firenze.",
                ],
                [
                    'q' => "In quale lingua è scritta la Commedia?",
                    'o' => ["In latino", "In greco antico", "Nel volgare fiorentino", "In francese"],
                    'c' => 2,
                    'e' => "Dante scelse il volgare fiorentino, la lingua parlata dalla gente, invece del latino.",
                ],
            ],
        ],

        'firenze-1265' => [
            'chapter' => "Un bambino a Firenze",
            'location' => 'Firenze',
            'script' => "Siamo a Firenze, nel 1265. Tra maggio e giugno nasce un bambino: si chiama Dante Alighieri. La sua famiglia fa parte della piccola nobiltà. Ha un nome rispettato, ma non è ricca. Firenze invece è ricchissima. Le strade sono affollate di mercanti, banchieri e botteghe. Le famiglie potenti costruiscono alte case a torre. Mercanti e artigiani si riuniscono nelle arti, le associazioni dei mestieri. E in tutta Europa gira una moneta d'oro famosa: il fiorino. Qui comincia la nostra storia.",
        ],

        'poesia-beatrice' => [
            'chapter' => "Poesia, amicizia e Beatrice",
            'location' => 'Firenze',
            'script' => "Da giovane Dante scopre la poesia. Il suo amico più caro è Guido Cavalcanti, un poeta più grande di lui. Dante lo chiama il suo primo amico. Con altri giovani scrivono in un modo nuovo, dolce e raffinato, che oggi chiamiamo dolce stil novo. Il tema più importante è l'amore. Qualche anno dopo il 1290 Dante compone la Vita nova, poesie e prose per Beatrice. Di solito si pensa a Bice Portinari, morta nel 1290. Ma attenzione: è un libro di letteratura, non un diario.",
        ],

        'campaldino-1289' => [
            'chapter' => "La battaglia di Campaldino",
            'location' => 'Campaldino',
            'script' => "L'11 giugno 1289, nella piana di Campaldino, si scontrano due eserciti. Da una parte ci sono i Guelfi di Firenze, dall'altra i Ghibellini di Arezzo. Vincono i fiorentini. Secondo i biografi, tra i cavalieri c'è anche Dante, che ha poco più di vent'anni. Lo racconta più di un secolo dopo lo storico Leonardo Bruni. Proviamo a immaginarlo in sella, con l'armatura, nella polvere e nel rumore. Dante non è solo un uomo di libri. Partecipa alla vita della sua città, anche quando c'è da combattere.",
        ],

        'mappa-fazioni' => [
            'chapter' => "Guelfi e Ghibellini",
            'location' => 'Toscana',
            'script' => "Guardiamo la mappa. Nell'Italia di Dante due grandi partiti si contendono le città. In generale i Guelfi stanno dalla parte del papa, che vive a Roma, e i Ghibellini dalla parte dell'imperatore. Firenze è guelfa. Arezzo, sconfitta a Campaldino, è ghibellina. Siena e Pisa sono città vicine, a volte alleate e a volte nemiche. Dopo il 1289 però i Guelfi fiorentini litigano tra loro. Si dividono in Bianchi, guidati dalla famiglia Cerchi, e Neri, guidati dalla famiglia Donati. Questa rivalità cambierà la vita di Dante.",
            'labels' => [
                'firenze' => "Firenze, città guelfa",
                'arezzo' => "Arezzo, ghibellina nel 1289",
                'campaldino' => "Campaldino, 11 giugno 1289",
                'siena' => "Siena, vicina e rivale",
                'pisa' => "Pisa, repubblica marinara",
                'roma' => "Roma, sede del papa",
            ],
        ],

        'priore-1300' => [
            'chapter' => "Dante al governo",
            'location' => 'Firenze',
            'script' => "Per fare politica a Firenze bisogna essere iscritti a un'arte. Verso il 1295 Dante entra nell'Arte dei Medici e Speziali, quella di chi prepara medicine e vende spezie. Nel 1300 viene eletto priore, uno dei pochi cittadini che governano la città. L'incarico dura due mesi, dal 15 giugno al 15 agosto. Per fermare gli scontri, i priori mandano in esilio i capi di tutte e due le fazioni. Tra loro c'è Guido Cavalcanti, il primo amico di Dante. Guido si ammala e muore quella stessa estate.",
        ],

        'esilio-1302' => [
            'chapter' => "La condanna e l'esilio",
            'location' => 'Firenze',
            'script' => "Nel 1301 Firenze manda Dante a Roma, in ambasciata da papa Bonifacio ottavo. In quei mesi entra in città Carlo di Valois, un principe francese, e i Neri prendono il potere. Il 27 gennaio 1302 Dante viene condannato per baratteria, cioè per aver usato il suo incarico per guadagnare denaro, e deve pagare una multa. In realtà è un'accusa politica: chi vince colpisce i nemici. Il 10 marzo arriva una condanna a morte, se mai tornerà. Dante non rivedrà mai più Firenze.",
        ],

        'mappa-esilio' => [
            'chapter' => "In viaggio da esule",
            'location' => 'Italia',
            'script' => "Dove va un uomo che non può tornare a casa? L'Italia di allora non è un solo paese. È divisa in tanti piccoli stati, ognuno con i suoi signori. Dante passa di corte in corte. A Verona è ospite prima di Bartolomeo della Scala, poi di Cangrande, della stessa famiglia. In Lunigiana lo accolgono i Malaspina. Passa per il Casentino. Probabilmente vive per un periodo a Bologna e a Padova. Alla fine si ferma a Ravenna, protetto da Guido Novello da Polenta. Ovunque vada, resta un ospite.",
            'labels' => [
                'firenze' => "Firenze, esiliato nel 1302",
                'verona' => "Verona, presso gli Scaligeri",
                'lunigiana' => "Lunigiana, presso i Malaspina",
                'casentino' => "Casentino, tra i monti toscani",
                'bologna' => "Bologna, probabilmente",
                'padova' => "Padova, probabilmente",
                'ravenna' => "Ravenna, l'ultimo rifugio",
            ],
        ],

        'commedia-nasce' => [
            'chapter' => "Nasce la Commedia",
            'location' => 'In esilio',
            'script' => "L'esilio è doloroso, ma Dante non smette di scrivere. Tra il 1303 e il 1307 circa lavora a due opere. Il Convivio è un banchetto di sapere per chi non conosce il latino. Il De vulgari eloquentia, scritto in latino, parla della lingua di tutti i giorni. Poi, verso il 1306, comincia un progetto enorme: la Commedia. Ci lavorerà fino alla morte. Nel 1315 Firenze gli offre il perdono, ma solo con un'umiliazione pubblica. Dante rifiuta. Preferisce restare lontano.",
        ],

        'commedia-galleria' => [
            'chapter' => "Dentro la Commedia",
            'location' => 'Inferno, Purgatorio, Paradiso',
            'title' => "La Commedia",
            'date_label' => "circa 1306-1321",
            'story' => "Un viaggio nell'aldilà in tre cantiche: Inferno, Purgatorio e Paradiso. Cento canti in endecasillabi e terzine. Virgilio guida Dante, poi arriva Beatrice. Il titolo originale era Comedìa.",
            'script' => "La Commedia racconta un viaggio immaginario nell'aldilà. Dante attraversa tre regni: l'Inferno, il Purgatorio e il Paradiso. Sono le tre cantiche, con cento canti in tutto. I versi si chiamano endecasillabi e sono raccolti a tre a tre, in terzine, con rime che si intrecciano. A guidarlo c'è prima il poeta latino Virgilio, poi Beatrice. Lungo la strada incontra persone vere del suo tempo. Dante la chiamava Comedìa. La parola Divina arrivò dopo, grazie agli elogi di Boccaccio, e finì nel titolo di un'edizione del 1555.",
        ],

        'volgare' => [
            'chapter' => "La lingua di tutti",
            'location' => 'Italia',
            'script' => "Ai tempi di Dante i libri importanti si scrivono in latino. Ma il latino lo capiscono in pochi. Dante sceglie invece il volgare fiorentino, la lingua che si parla per strada, così più persone possono leggerlo o ascoltarlo. Allora, Dante ha inventato l'italiano? No. Prima di lui si scriveva già in volgare. Però, insieme ad altri scrittori toscani, come Petrarca e Boccaccio, Dante aiutò il toscano a diventare un modello. Più tardi gli studiosi lo scelsero come base dell'italiano scritto, e poi della lingua che parliamo oggi.",
        ],

        'ravenna-1321' => [
            'chapter' => "Gli ultimi giorni a Ravenna",
            'location' => 'Ravenna',
            'script' => "Nel 1321 Dante vive a Ravenna. Il signore della città lo manda in ambasciata a Venezia. Dopo questo viaggio si ammala. Muore a Ravenna nella notte tra il 13 e il 14 settembre 1321, a cinquantasei anni. Viene sepolto a Ravenna. Il piccolo tempio che vediamo oggi sulla sua tomba fu costruito molto più tardi, tra il 1780 e il 1781. Firenze ha chiesto più volte di riavere i suoi resti. Ma Dante è rimasto a Ravenna, la città che lo aveva accolto.",
        ],

        'eredita' => [
            'chapter' => "Dante oggi",
            'location' => 'Italia e il mondo',
            'script' => "Settecento anni dopo, Dante è ancora con noi. Si studia a scuola, e la Commedia è tradotta in moltissime lingue. Anche le parole di tutti i giorni lo ricordano. Il modo di dire senza infamia e senza lode nasce da un verso del terzo canto dell'Inferno. Dallo stesso canto viene anche guarda e passa: Dante scrive non ragioniam di lor, ma guarda e passa. Nel 2021 l'Italia ha ricordato i settecento anni dalla sua morte. E dal 2020, ogni 25 marzo, si celebra il Dantedì, la giornata dedicata a lui.",
        ],

        'post-quiz' => [
            'chapter' => "Che cosa hai imparato?",
            'questions' => [
                [
                    'q' => "Quale frase sulla lingua italiana è corretta?",
                    'o' => [
                        "Dante l'ha inventata dal nulla",
                        "Il latino e l'italiano erano la stessa lingua",
                        "Il volgare esisteva già, ma l'opera di Dante aiutò il toscano a diventare la base dell'italiano",
                        "L'italiano deriva dal francese dei re",
                    ],
                    'c' => 2,
                    'e' => "Dante non ha inventato l'italiano: la sua opera, insieme a quelle di Petrarca e Boccaccio, aiutò il toscano a diventare un modello, scelto poi dagli studiosi.",
                ],
                [
                    'q' => "Com'era la Firenze in cui nacque Dante nel 1265?",
                    'o' => [
                        "Una città ricca di mercanti e banchieri, con il fiorino d'oro",
                        "Un piccolo villaggio di pescatori",
                        "La capitale dell'Italia unita",
                        "Una città governata dall'imperatore da Ravenna",
                    ],
                    'c' => 0,
                    'e' => "Firenze era una città ricca e affollata, famosa per il commercio, le banche e il fiorino d'oro.",
                ],
                [
                    'q' => "Perché Dante scrisse la Commedia in volgare e non in latino?",
                    'o' => [
                        "Perché non conosceva il latino",
                        "Perché il papa gli proibì il latino",
                        "Perché il volgare era più corto da scrivere",
                        "Perché così più persone potevano leggerla",
                    ],
                    'c' => 3,
                    'e' => "Il latino lo capivano in pochi, il volgare fiorentino era la lingua che la gente parlava davvero.",
                ],
                [
                    'q' => "Da dove viene la parola Divina nel titolo della Commedia?",
                    'o' => [
                        "L'ha scelta Dante fin dall'inizio",
                        "È stata aggiunta dopo, e compare in un'edizione del 1555",
                        "L'ha voluta papa Bonifacio ottavo",
                        "Vuol dire che l'opera parla solo di angeli",
                    ],
                    'c' => 1,
                    'e' => "Dante la chiamava Comedìa: Divina nasce dagli elogi di Boccaccio ed entra nel titolo con l'edizione del 1555.",
                ],
                [
                    'q' => "Di che cosa fu accusato Dante nel 1302?",
                    'o' => [
                        "Di aver perso la battaglia di Campaldino",
                        "Di aver rubato libri al papa",
                        "Di aver offeso Guido Cavalcanti",
                        "Di baratteria, un'accusa che in realtà era politica",
                    ],
                    'c' => 3,
                    'e' => "Quando i Neri presero il potere, condannarono i loro avversari: l'accusa di corruzione serviva a colpire Dante.",
                ],
                [
                    'q' => "Nel 1315 Firenze offrì a Dante di tornare. Che cosa fece?",
                    'o' => [
                        "Rifiutò, perché avrebbe dovuto umiliarsi in pubblico",
                        "Tornò subito a casa",
                        "Accettò, ma morì durante il viaggio",
                        "Mandò Beatrice al suo posto",
                    ],
                    'c' => 0,
                    'e' => "Dante rifiutò il perdono a quelle condizioni e rimase in esilio fino alla morte.",
                ],
            ],
        ],
    ],
];
