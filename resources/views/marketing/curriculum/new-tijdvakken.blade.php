{{-- Ten to six tijdvakken in primary school: the page teachers link to. Facts checked 2026-11-04
     against the sources listed at the bottom. Update the status list when the decree moves. --}}
@php
    $title = 'Van tien naar zes tijdvakken: wat verandert er op de basisschool';
    $description = \App\Support\OwnArticles::TIJDVAKKEN_EXCERPT;

    // Names, years and developments: SLO, Ontwikkelingen in de tijd (2022), table 1.
    // `current` is our own comparison by years, and the page says so.
    $eras = [
        ['name' => 'Tijd van jagers en boeren', 'years' => 'voor de introductie van het schrift', 'current' => ['1'], 'developments' => [
            1 => 'Ontstaan van landbouw en landbouwsamenlevingen',
        ]],
        ['name' => 'Tijd van oude rijken', 'years' => 'ca. 3000 v.Chr. tot 500 n.Chr.', 'current' => ['2'], 'developments' => [
            2 => 'Verspreiding van de Grieks-Romeinse cultuur',
            3 => 'Verspreiding van monotheïstische godsdiensten: jodendom, christendom en islam',
        ]],
        ['name' => 'Tijd van standen en steden', 'years' => '500 tot 1500', 'current' => ['3', '4'], 'developments' => [
            4 => 'Ontstaan van een standensamenleving',
            5 => 'Groei van handelsnetwerken en steden',
        ]],
        ['name' => 'Tijd van pakhuizen en plantages', 'years' => '1500 tot 1800', 'current' => ['5', '6', '7'], 'developments' => [
            6 => 'De Opstand en het ontstaan van de Republiek',
            7 => 'Europese expansie en mensenhandel tussen werelddelen',
            8 => 'Verstedelijking en culturele bloei in de Republiek',
            9 => 'Groeiende belangstelling voor wetenschap en uitvinding van nieuwe technieken',
        ]],
        ['name' => 'Tijd van burgers en stoommachines', 'years' => '1800 tot 1900', 'current' => ['8'], 'developments' => [
            10 => 'Industriële Revolutie',
            11 => 'Streven naar vrijheid en gelijkheid en ontstaan van parlementaire democratie',
        ]],
        ['name' => 'Tijd van wereldoorlogen en mensenrechten', 'years' => '1900 tot heden', 'current' => ['9', '10'], 'developments' => [
            12 => 'Tweede Wereldoorlog en Holocaust',
            13 => 'Dekolonisatie',
            14 => 'Verdergaande samenwerking rond wereldproblemen',
            15 => 'Groei van welvaart en diversiteit',
            16 => 'Ontstaan van een informatiesamenleving',
        ]],
    ];

    $sources = [
        ['label' => 'Brief van de staatssecretaris aan de Tweede Kamer, 6 oktober 2026 (Kamerstuk 31 293, nr. 898)', 'url' => 'https://zoek.officielebekendmakingen.nl/kst-1273745', 'for' => 'de voorhangprocedure en de streefdatum'],
        ['label' => 'SLO, Ontwikkelingen in de tijd (mei 2022)', 'url' => 'https://www.slo.nl/publish/pages/18734/ontwikkelingen-in-de-tijd.pdf', 'for' => 'de zes tijdvakken, de zestien ontwikkelingen en de reden voor minder tijdvakken'],
        ['label' => 'Kennisdomein, De tien tijdvakken en het plan voor zes (oktober 2026)', 'url' => 'https://www.kennisdomein.nl/wereld/tijdvakken/', 'for' => 'de zes tijdvakken in het conceptbesluit, de overgang tot 2031 en het eindexamen'],
        ['label' => 'Nationale Onderwijsgids, SLO brengt aantal tijdvakken terug (juni 2026)', 'url' => 'https://www.nationaleonderwijsgids.nl/basisonderwijs/slo-brengt-aantal-tijdvakken-geschiedenis-terug-van-tien-naar-zes/', 'for' => 'de rol van de Canon'],
    ];
@endphp

<x-layouts.landing :title="$title">
    <x-slot:head>
        <x-seo :title="$title" :description="$description" />
        <style>
            @media print {
                body > *:not(main), main ~ *, [data-no-print] { display: none !important; }
                * { color: #000 !important; background: transparent !important; border-color: #999 !important; }
                main { padding: 0 !important; max-width: none !important; }
                section { break-inside: avoid; }
            }
        </style>
    </x-slot:head>

    <x-landing.header />

    <main class="mx-auto max-w-2xl px-4 pb-24 pt-32 text-base-content/80 sm:px-6">
        <nav class="flex gap-4 text-sm" aria-label="Kruimelpad" data-no-print>
            <a href="{{ \App\Support\Seo::url('articles') }}" class="link link-hover">{{ __('Articles') }}</a>
            <a href="{{ route('public.curriculum') }}" class="link link-hover">Kerndoelen en tijdvakken</a>
        </nav>

        <h1 class="mt-6 font-history text-4xl font-light leading-tight tracking-tight text-white sm:text-5xl">Van tien naar zes tijdvakken</h1>
        <p class="mt-4 text-lg leading-relaxed">
            Het ministerie wil dat de basisschool vanaf 1 augustus 2027 met zes tijdvakken werkt in plaats van tien.
            Dat staat nog niet in de wet. Hier zie je welke tijdvakken samengaan, wat je klas per tijdvak leert en wat er al vaststaat.
        </p>
        <p class="mt-4 text-sm">Bijgewerkt op 4 november 2026.</p>
        <button type="button" onclick="window.print()" class="btn btn-ghost btn-sm mt-4 -ml-3" data-no-print>Print dit overzicht</button>

        <section class="mt-14">
            <h2 class="font-history text-2xl font-light text-white">Van tien naar zes</h2>
            <div class="mt-4 border-b border-white/10">
                @foreach ($eras as $number => $era)
                    <div class="border-t border-white/10 py-5">
                        <h3 class="font-semibold text-white">{{ $number + 1 }}. {{ $era['name'] }}</h3>
                        <p class="mt-1 text-sm">{{ $era['years'] }}</p>

                        <p class="mt-3 text-sm">
                            Nu:
                            @foreach ($era['current'] as $code)
                                <a data-old-tijdvak href="{{ route('public.curriculum.goal', $current[$code]->slug) }}" class="underline hover:text-white">{{ $current[$code]->code }}. {{ $current[$code]->title }}</a>@if (! $loop->last), @endif
                            @endforeach
                        </p>

                        <ol class="mt-3 space-y-1">
                            @foreach ($era['developments'] as $position => $development)
                                <li data-development>{{ $position }}. {{ $development }}</li>
                            @endforeach
                        </ol>
                    </div>
                @endforeach
            </div>
            <p class="mt-4 text-sm">
                De namen, jaartallen en ontwikkelingen komen van SLO. De koppeling met de tien tijdvakken van nu is onze eigen vergelijking op jaartallen.
                Ontwikkeling 3 en 11 staan volgens SLO bewust op de grens van twee tijdvakken.
            </p>
        </section>

        <section class="mt-14">
            <h2 class="font-history text-2xl font-light text-white">Waar het plan nu staat</h2>
            <ul class="mt-4 space-y-3">
                <li><strong class="text-white">Mei 2022.</strong> Een werkgroep van SLO adviseert zes tijdvakken met zestien historische ontwikkelingen.</li>
                <li><strong class="text-white">Voorjaar 2026.</strong> Het ministerie zet het conceptbesluit met de zes tijdvakken in internetconsultatie. Reageren kon tot 9 juni.</li>
                <li><strong class="text-white">6 oktober 2026.</strong> De staatssecretaris stuurt het ontwerpbesluit naar de Tweede en Eerste Kamer. Die konden tot en met 3 november reageren.</li>
                <li><strong class="text-white">Hierna.</strong> Het ontwerpbesluit gaat voor advies naar de Raad van State.</li>
                <li><strong class="text-white">1 augustus 2027.</strong> De streefdatum voor de nieuwe kerndoelen. Geen vaste datum dus.</li>
                <li><strong class="text-white">1 augustus 2031.</strong> Tot dan mogen scholen volgens het concept de oude kerndoelen blijven gebruiken.</li>
            </ul>
        </section>

        <section class="mt-14">
            <h2 class="font-history text-2xl font-light text-white">Waarom minder tijdvakken</h2>
            <p class="mt-4 leading-relaxed">
                Volgens de SLO-werkgroep sluiten tien tijdvakken ontwikkelingen op, terwijl veel daarvan over de grenzen heen lopen.
                Met minder tijdvakken en ontwikkelingen als basis komt dat verhaal voorop te staan.
                Daarom is ook de Tijd van Grieken en Romeinen breder geworden: de Tijd van oude rijken kijkt verder dan het Romeinse Rijk.
            </p>
        </section>

        <section class="mt-14">
            <h2 class="font-history text-2xl font-light text-white">Wat dit betekent voor je klas</h2>
            <ul class="mt-4 space-y-3">
                <li><strong class="text-white">Vandaag verandert er niets.</strong> In het geldende besluit staan voor de basisschool nog alle tien de tijdvakken.</li>
                <li><strong class="text-white">Je lessen blijven bruikbaar.</strong> Werk je nu met de tien? Bovenaan zie je onder welk nieuw tijdvak elk onderwerp straks valt.</li>
                <li><strong class="text-white">De Canon blijft.</strong> De vensters worden vooral voorbeelden: concrete verhalen om een ontwikkeling mee te bespreken.</li>
                <li><strong class="text-white">Op de middelbare school gaat het anders.</strong> SLO adviseert voor de onderbouw vijf periodes en 22 ontwikkelingen. Wie in 2027 eindexamen havo of vwo doet, leert nog alle tien de tijdvakken.</li>
            </ul>
            <p class="mt-6" data-no-print>
                Op de pagina van elk tijdvak hierboven staan de lessen die we erbij hebben.
                <a href="{{ route('public.lessons') }}" class="underline hover:text-white">Bekijk alle lessen</a>
            </p>
        </section>

        <section class="mt-14">
            <h2 class="font-history text-2xl font-light text-white">Bronnen</h2>
            <ul class="mt-4 space-y-2 text-sm">
                @foreach ($sources as $source)
                    <li>
                        <a href="{{ $source['url'] }}" class="underline hover:text-white" rel="noreferrer" target="_blank">{{ $source['label'] }}</a>:
                        {{ $source['for'] }}.
                    </li>
                @endforeach
            </ul>
        </section>
    </main>
</x-layouts.landing>
