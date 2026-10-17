<x-layouts.landing :title="__('About')">
    <x-slot:head>
        <x-seo
            page="about"
            :title="__('From idea to classroom')"
            :description="__('Plan a history lesson, check it, then teach it with your class.')"
            :graph="\App\Support\Seo::withFaq()"
        />
    </x-slot:head>

    <x-landing.header />

    @php
        // The teacher's journey, Figma "From idea to classroom" (node 1977:218). Bart 2026-10-15: "implement
        // the design, but give it more clarity, less words": each stage keeps its name, its time and what it
        // hands you; the explanatory lines, phase badges and outcome chips are gone. On a phone a stage is a
        // card; from md up it is a row (picture | stage | output), as in the design.
        $stages = [
            ['phase' => 'Frame',  'title' => 'Describe the lesson',   'time' => '1–3 min',   'icon' => 'pencil',       'output' => 'Lesson brief',           'key' => false],
            ['phase' => 'Source', 'title' => 'Review the story plan', 'time' => '10–15 min', 'icon' => 'squares-2x2',  'output' => 'Evidence-led story map', 'key' => false],
            ['phase' => 'Watch',  'title' => 'Watch the first draft', 'time' => '3–5 min',   'icon' => 'eye',          'output' => 'Playable first cut',     'key' => false],
            ['phase' => 'Shape',  'title' => 'Direct and edit',       'time' => '5–10 min',  'icon' => 'sparkles',     'output' => 'Directed timeline',      'key' => true],
            ['phase' => 'Verify', 'title' => 'Preview and review',    'time' => '3–5 min',   'icon' => 'check-circle', 'output' => 'Review checklist',       'key' => false],
            ['phase' => 'Teach',  'title' => 'Start class',           'time' => '10 min',    'icon' => 'academic-cap', 'output' => 'Live classroom session', 'key' => true],
        ];
        // stages 04 and 05 are the revise loop: on desktop they sit together beside the loop bracket
        $loopFrom = 3;
        $loopTo = 4;
        $label = 'text-xs font-semibold uppercase tracking-wider';
    @endphp

    {{-- relative: the layout's fixed atmosphere layers would otherwise paint over (and dim) the page --}}
    <main class="relative bg-base-100 text-base-content">
        <div class="mx-auto w-full max-w-xl px-5 pb-16 pt-32 md:max-w-5xl md:px-10 lg:pt-40">

            {{-- ── Introduction ─────────────────────────────────────────────── --}}
            <section aria-labelledby="about-title" class="md:max-w-3xl" data-reveal-section>
                <div class="flex items-center gap-3" data-reveal="text">
                    <span class="h-0.5 w-8 bg-accent"></span>
                    <span class="{{ $label }} text-accent">{{ __("Teacher's lesson creation journey") }}</span>
                </div>

                <h1 id="about-title" data-reveal="heading" class="font-history mt-4 text-5xl font-semibold leading-tight md:text-7xl">
                    {{ __('From idea to classroom') }}
                </h1>

                <p data-reveal="text" class="mt-4 text-lg leading-relaxed text-base-content/70 md:text-xl">
                    {{ __('Plan a history lesson, check it, then teach it with your class.') }}
                </p>
            </section>

            {{-- ── How it works: the product tour, playing in the page ───────── --}}
            <section id="how-it-works" class="mt-10 scroll-mt-28 md:mt-14" aria-labelledby="about-how" data-reveal-section>
                <h2 id="about-how" data-reveal="heading" class="font-history text-3xl md:text-4xl">{{ __('How it works') }}</h2>
                <div data-reveal="text" class="mt-6">
                    <x-landing.product-tour inline />
                </div>
            </section>

            <hr class="mt-10 border-base-300 md:mt-14">

            {{-- ── Six stage journey ────────────────────────────────────────── --}}
            <section class="mt-10 md:mt-14" aria-labelledby="about-workflow">
                <div class="flex flex-col gap-2 md:flex-row md:items-end md:justify-between" data-reveal-section>
                    <div>
                        <span class="{{ $label }} text-accent">{{ __('The workflow') }}</span>
                        <h2 id="about-workflow" data-reveal="heading" class="font-history mt-2 text-4xl md:text-5xl">{{ __('In less than 1 hour') }}</h2>
                    </div>
                    <span class="{{ $label }} text-base-content/50">{{ __('For a 10-minute lesson') }}</span>
                </div>

                <ol class="mt-6 md:mt-8">
                    @foreach ($stages as $i => $stage)
                        @php $n = str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT); @endphp

                        {{-- the loop group opens before stage 04: on a wide screen a bracket in the margin joins 04 and 05 --}}
                        @if ($i === $loopFrom)
                            <li class="relative" data-reveal-section>
                                <ol>
                        @endif

                        <li data-reveal-section>
                            <article data-reveal="stage" @class([
                                'card relative overflow-hidden bg-base-200 md:card-side md:h-44 md:items-center',
                                'border-2 border-accent' => $stage['key'],
                                'border border-base-300' => ! $stage['key'],
                            ])>
                                <figure class="relative h-44 shrink-0 md:h-full md:w-56">
                                    <img src="{{ asset('images/about/stage-'.($i + 1).'.webp') }}" alt=""
                                         class="h-full w-full object-cover" loading="lazy" decoding="async">
                                </figure>

                                <span data-reveal-number class="absolute left-4 top-[8.5rem] grid size-14 place-items-center rounded-full border border-base-300 bg-base-100 text-xl font-bold md:top-auto md:bottom-3">{{ $n }}</span>

                                <div class="card-body gap-0 p-5 pt-8 md:flex-row md:items-center md:gap-6 md:p-6">
                                    <div class="md:flex-1">
                                        <div class="flex items-center gap-2">
                                            <span class="font-mono text-xs tracking-wider text-accent">{{ __('Stage') }} {{ $n }}</span>
                                            <span class="h-px w-4 bg-base-content/30"></span>
                                            <span class="{{ $label }} text-base-content/50">{{ __($stage['phase']) }}</span>
                                        </div>
                                        <h3 class="font-history mt-2 text-3xl">{{ __($stage['title']) }}</h3>
                                        <span class="badge badge-outline mt-3 border-base-300 {{ $label }} text-accent">{{ __($stage['time']) }}</span>
                                    </div>

                                    <div class="mt-4 flex items-center gap-3 rounded-box border border-base-300 bg-base-100 p-3.5 md:mt-0 md:w-64 md:shrink-0">
                                        <span class="grid size-11 shrink-0 place-items-center rounded-box border border-base-300 bg-base-200 text-accent">
                                            <x-dynamic-component :component="'icons.'.$stage['icon']" class="h-6 w-6" />
                                        </span>
                                        <div class="min-w-0">
                                            <span class="{{ $label }} text-base-content/50">{{ __('Output') }}</span>
                                            <p class="text-base">{{ __($stage['output']) }}</p>
                                        </div>
                                    </div>
                                </div>
                            </article>

                            {{-- up to lg the loop is a short note under stage 04 --}}
                            @if ($i === $loopFrom)
                                <div class="mt-3 flex items-center gap-3 rounded-full border border-accent/60 bg-base-100 px-4 py-2.5 lg:hidden">
                                    <x-icons.arrow-path class="h-5 w-5 shrink-0 text-accent" />
                                    <span class="{{ $label }} text-accent">{{ __('Revise') }}</span>
                                </div>
                            @endif

                            @unless ($loop->last || $i === $loopTo)
                                <div class="flex flex-col items-center py-2" aria-hidden="true" data-reveal="line">
                                    <span class="h-5 w-0.5 bg-accent/70"></span>
                                    <x-icons.chevron-down class="h-4 w-4 text-accent" />
                                </div>
                            @endunless
                        </li>

                        {{-- the loop group closes after stage 05: the bracket, then the arrow on to stage 06 --}}
                        @if ($i === $loopTo)
                                </ol>
                                <div class="absolute inset-y-0 left-full ml-4 hidden w-14 flex-col items-center justify-center gap-2 py-16 lg:flex" aria-hidden="true" data-reveal="line">
                                    <span class="w-1/2 flex-1 rounded-r-2xl border-y-2 border-r-2 border-accent/60"></span>
                                    <x-icons.arrow-path class="h-5 w-5 text-accent" />
                                    <span class="{{ $label }} text-accent">{{ __('Revise') }}</span>
                                </div>
                            </li>
                            <li class="flex flex-col items-center py-2" aria-hidden="true" data-reveal-section>
                                <div class="flex flex-col items-center" data-reveal="line">
                                <span class="h-5 w-0.5 bg-accent/70"></span>
                                <x-icons.chevron-down class="h-4 w-4 text-accent" />
                                </div>
                            </li>
                        @endif
                    @endforeach
                </ol>
            </section>

            {{-- ── Class participation ─────────────────────────────────────── --}}
            <section class="mt-2 flex flex-col items-center text-center" aria-labelledby="about-participation" data-reveal-section>
                <span class="h-8 w-0.5 bg-accent/70" aria-hidden="true"></span>
                <span data-reveal="text" class="{{ $label }} mt-4 text-accent">{{ __('Classroom participation') }}</span>
                <h2 id="about-participation" data-reveal="heading" class="font-history mt-3 text-3xl md:text-4xl">{{ __('Choose the route that fits the room') }}</h2>
            </section>

            <div data-reveal-section>
            <div class="mt-7 flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-6" data-reveal="tiers">
                @foreach ([
                    ['label' => 'Option · connected', 'title' => 'Phones allowed', 'icon' => 'icons.device-phone-mobile', 'steps' => ['Scan the class QR code and join the session', 'Watch the board, respond, watch the board'], 'key' => true],
                    ['label' => 'Option · print',     'title' => 'No phones',      'icon' => 'icons.printer',             'steps' => ['Print the ready-made PDF handouts', 'Watch the board, discuss, answer on paper'], 'key' => false],
                ] as $route)
                    @unless ($loop->first)
                        <div class="divider my-0 {{ $label }} text-base-content/50 md:hidden">{{ __('or') }}</div>
                    @endunless
                    <div @if ($route['key']) data-featured @endif @class([
                        'card bg-base-200 p-5 md:p-7',
                        'border-2 border-accent' => $route['key'],
                        'border border-base-300' => ! $route['key'],
                    ])>
                        <div class="flex items-center justify-between gap-4">
                            <div>
                                <span class="{{ $label }} text-accent">{{ __($route['label']) }}</span>
                                <h3 class="font-history mt-1 text-3xl">{{ __($route['title']) }}</h3>
                            </div>
                            <span class="grid size-14 shrink-0 place-items-center rounded-box border border-base-300 bg-base-100 text-accent">
                                <x-dynamic-component :component="$route['icon']" class="h-6 w-6" />
                            </span>
                        </div>
                        <ol class="mt-5 flex flex-col gap-3">
                            @foreach ($route['steps'] as $step)
                                <li class="flex gap-3">
                                    <span class="font-mono text-xs leading-6 text-accent">{{ str_pad((string) $loop->iteration, 2, '0', STR_PAD_LEFT) }}</span>
                                    <span class="text-base text-base-content/70">{{ __($step) }}</span>
                                </li>
                            @endforeach
                        </ol>
                    </div>
                @endforeach
            </div>
            </div>

            <div class="flex justify-center" aria-hidden="true"><span class="h-10 w-0.5 bg-accent/70"></span></div>

            {{-- ── Learning outcome ─────────────────────────────────────────── --}}
            <section data-reveal-section class="rounded-box bg-selected p-6 text-base-100 md:flex md:items-center md:gap-7 md:px-10 md:py-8">
                <span data-reveal="cta" class="grid size-14 shrink-0 place-items-center rounded-full bg-base-100 text-base-content md:size-16">
                    <x-icons.arrow-path class="h-7 w-7" />
                </span>
                <div class="mt-5 md:mt-0" data-reveal="text">
                    <span class="{{ $label }}">{{ __('Continuous practice') }}</span>
                    <h2 class="font-history mt-2 text-3xl font-semibold md:text-4xl">{{ __('Review learning, improve, reuse') }}</h2>
                    <p class="mt-2 text-base text-base-100/75">{{ __('Carry evidence from this class into the next lesson.') }}</p>
                </div>
            </section>
        </div>
    </main>

    <x-landing.faq />

    <x-landing.footer />

</x-layouts.landing>
