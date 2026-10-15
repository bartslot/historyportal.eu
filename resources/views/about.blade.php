<x-layouts.landing :title="__('About')">

    <x-landing.header />

    @php
        // The six stages of the teacher's journey (Figma "From idea to classroom", node 1978:1773).
        $stages = [
            ['phase' => 'Frame',  'title' => 'Describe the lesson',   'text' => 'Learning goal, focus, age group and duration',   'time' => '1–3 min',   'icon' => 'pencil',       'output' => 'Lesson brief',            'detail' => 'Audience, purpose and boundaries',     'key' => false],
            ['phase' => 'Source', 'title' => 'Review the story plan', 'text' => 'Story beats, sources and class activities',      'time' => '10–15 min', 'icon' => 'squares-2x2',  'output' => 'Evidence-led story map',  'detail' => 'Sequence, sources and participation',  'key' => false],
            ['phase' => 'Watch',  'title' => 'Watch the first draft', 'text' => 'Characters act, speak and show emotion',         'time' => '3–5 min',   'icon' => 'eye',          'output' => 'Playable first cut',      'detail' => 'Pacing, voice and historical setting', 'key' => false],
            ['phase' => 'Shape',  'title' => 'Direct and edit',       'text' => 'Change the story through chat or the timeline',  'time' => '5–10 min',  'icon' => 'sparkles',     'output' => 'Directed timeline',       'detail' => 'Prompts, scene edits and timing',      'key' => true],
            ['phase' => 'Verify', 'title' => 'Preview and review',    'text' => 'Check history, clarity, movement and timing',    'time' => '3–5 min',   'icon' => 'check-circle', 'output' => 'Review checklist',        'detail' => 'Accuracy, clarity and classroom pace', 'key' => false],
            ['phase' => 'Teach',  'title' => 'Start class',           'text' => 'The teacher controls the story on the board',    'time' => '10 min',    'icon' => 'academic-cap', 'output' => 'Live classroom session',  'detail' => 'Shared screen, teacher-led control',   'key' => true],
        ];
        $label = 'text-xs font-semibold uppercase tracking-wider';
    @endphp

    <main class="bg-base-100 text-base-content">
        <div class="mx-auto w-full max-w-xl px-5 pb-16 pt-32 lg:pt-40">

            {{-- ── Introduction ─────────────────────────────────────────────── --}}
            <section aria-labelledby="about-title">
                <div class="flex items-center gap-3">
                    <span class="h-0.5 w-8 bg-accent"></span>
                    <span class="{{ $label }} text-accent">{{ __("Teacher's lesson creation journey") }}</span>
                </div>

                <h1 id="about-title" class="font-history mt-4 text-5xl font-semibold leading-tight md:text-6xl">
                    {{ __('From idea to classroom') }}
                </h1>

                <p class="mt-4 text-lg leading-relaxed text-base-content/70">
                    {{ __('Build an evidence-led history lesson, shape its story, test it, then guide students through a shared classroom experience.') }}
                </p>

                <div class="mt-7 flex flex-wrap gap-2">
                    @foreach (['Create', 'Check', 'Teach', 'Reflect'] as $phase)
                        <span class="badge badge-outline border-base-300 bg-base-200 {{ $label }} text-base-content/70">{{ __($phase) }}</span>
                    @endforeach
                </div>

                {{-- The click-through product tour (feat/about-tour), built on the old About hero. --}}
                <div class="mt-7">
                    <x-landing.product-tour />
                </div>

                <hr class="mt-10 border-base-300">
            </section>

            {{-- ── Six stage journey ────────────────────────────────────────── --}}
            <section class="mt-10" aria-labelledby="about-workflow">
                <span class="{{ $label }} text-accent">{{ __('The workflow') }}</span>
                <h2 id="about-workflow" class="font-history mt-2 text-4xl">{{ __('In less than 1 hour') }}</h2>
                <div class="mt-3 flex items-center justify-between {{ $label }} text-base-content/50">
                    <span class="font-mono">01–06</span>
                    <span>{{ __('For a 10-minute lesson') }}</span>
                </div>

                <ol class="mt-6">
                    @foreach ($stages as $i => $stage)
                        @php $n = str_pad((string) ($i + 1), 2, '0', STR_PAD_LEFT); @endphp
                        <li>
                            <article @class([
                                'card relative overflow-hidden bg-base-200',
                                'border-2 border-accent' => $stage['key'],
                                'border border-base-300' => ! $stage['key'],
                            ])>
                                <img src="{{ asset('images/about/stage-'.($i + 1).'.webp') }}" alt=""
                                     class="h-44 w-full object-cover" loading="lazy" decoding="async">

                                <span class="absolute left-4 top-[8.5rem] grid size-14 place-items-center rounded-full border border-base-300 bg-base-100 text-xl font-bold">{{ $n }}</span>

                                <div class="card-body gap-0 p-5 pt-8">
                                    <div class="flex items-center gap-2">
                                        <span class="font-mono text-xs tracking-wider text-accent">{{ __('Stage') }} {{ $n }}</span>
                                        <span class="h-px w-4 bg-base-content/30"></span>
                                        <span class="{{ $label }} text-base-content/50">{{ __($stage['phase']) }}</span>
                                    </div>
                                    <h3 class="font-history mt-2 text-3xl">{{ __($stage['title']) }}</h3>
                                    <p class="mt-2 text-base text-base-content/70">{{ __($stage['text']) }}</p>
                                    <span class="badge badge-outline mt-3 border-base-300 {{ $label }} text-accent">{{ __($stage['time']) }}</span>

                                    <div class="mt-4 flex items-center gap-3 rounded-box border border-base-300 bg-base-100 p-3.5">
                                        <span class="grid size-11 shrink-0 place-items-center rounded-box border border-base-300 bg-base-200 text-accent">
                                            <x-dynamic-component :component="'icons.'.$stage['icon']" class="h-6 w-6" />
                                        </span>
                                        <div class="min-w-0">
                                            <span class="{{ $label }} text-base-content/50">{{ __('Output') }}</span>
                                            <p class="text-base">{{ __($stage['output']) }}</p>
                                            <p class="text-xs text-base-content/50">{{ __($stage['detail']) }}</p>
                                        </div>
                                    </div>
                                </div>
                            </article>

                            @if ($stage['phase'] === 'Shape')
                                <div class="mt-3 flex items-center gap-3 rounded-full border border-accent/60 bg-base-100 px-4 py-3">
                                    <x-icons.arrow-path class="h-5 w-5 shrink-0 text-accent" />
                                    <div>
                                        <span class="{{ $label }} text-accent">{{ __('Revise') }}</span>
                                        <p class="text-sm text-base-content/70">{{ __('Direct, preview and repeat until the lesson is ready.') }}</p>
                                    </div>
                                </div>
                            @endif

                            @unless ($loop->last)
                                <div class="flex flex-col items-center py-2" aria-hidden="true">
                                    <span class="h-5 w-0.5 bg-accent/70"></span>
                                    <x-icons.chevron-down class="h-4 w-4 text-accent" />
                                </div>
                            @endunless
                        </li>
                    @endforeach
                </ol>
            </section>

            {{-- ── Class participation ─────────────────────────────────────── --}}
            <section class="mt-2 flex flex-col items-center text-center" aria-labelledby="about-participation">
                <span class="h-8 w-0.5 bg-accent/70" aria-hidden="true"></span>

                <div class="mt-4 flex gap-3" aria-hidden="true">
                    @foreach ([['icons.book-open', 'Branching story'], ['icons.chat-bubble-left-right', 'Debate']] as [$icon, $name])
                        <div class="flex w-32 flex-col items-center gap-2 rounded-box border border-base-300 bg-base-200 px-3 py-4">
                            <x-dynamic-component :component="$icon" class="h-7 w-7 text-accent" />
                            <span class="text-xs font-semibold text-base-content/80">{{ __($name) }}</span>
                        </div>
                    @endforeach
                </div>

                <span class="{{ $label }} mt-4 text-accent">{{ __('Classroom participation') }}</span>
                <h2 id="about-participation" class="font-history mt-3 text-3xl">{{ __('Choose the route that fits the room') }}</h2>
            </section>

            <div class="mt-7 flex flex-col gap-4">
                @foreach ([
                    ['label' => 'Option · connected', 'title' => 'Phones allowed', 'icon' => 'icons.device-phone-mobile', 'steps' => ['Scan the class QR code and join the session', 'Watch the board, respond, watch the board'], 'key' => true],
                    ['label' => 'Option · print',     'title' => 'No phones',      'icon' => 'icons.printer',             'steps' => ['Print the ready-made PDF handouts', 'Watch the board, discuss, answer on paper'], 'key' => false],
                ] as $route)
                    @unless ($loop->first)
                        <div class="divider my-0 {{ $label }} text-base-content/50">{{ __('or') }}</div>
                    @endunless
                    <div @class([
                        'card bg-base-200 p-5',
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

            <div class="flex justify-center" aria-hidden="true"><span class="h-10 w-0.5 bg-accent/70"></span></div>

            {{-- ── Learning outcome ─────────────────────────────────────────── --}}
            <section class="rounded-box bg-base-content p-6 text-base-100">
                <div class="flex items-center gap-4">
                    <span class="grid size-14 shrink-0 place-items-center rounded-full bg-base-100 text-base-content">
                        <x-icons.arrow-path class="h-7 w-7" />
                    </span>
                    <span class="{{ $label }}">{{ __('Continuous practice') }}</span>
                </div>
                <h2 class="font-history mt-5 text-3xl font-semibold">{{ __('Review learning, improve, reuse') }}</h2>
                <p class="mt-2 text-base text-base-100/75">{{ __('Carry evidence from this class into the next lesson.') }}</p>
                <div class="mt-5 flex flex-wrap gap-2">
                    @foreach (['Review', 'Refine', 'Return'] as $step)
                        <span class="badge border-base-100 bg-base-100 {{ $label }} text-base-content">{{ __($step) }}</span>
                    @endforeach
                </div>
            </section>
        </div>
    </main>

    <x-landing.footer />

</x-layouts.landing>
