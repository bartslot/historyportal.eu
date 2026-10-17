@php
    // Pricing copy & numbers live in config/pricing.php — edit there, not here.
    $terms       = config('pricing.terms');
    $defaultTerm = config('pricing.default_term');
    $tiers       = config('pricing.tiers');
    $finePrint   = config('pricing.fine_print');
    $currency    = config('pricing.currency');
    $locale      = app()->getLocale();
    // The big number is printed without its symbol (the symbol sits in its own smaller span), so
    // format the amount alone; the totals line carries the full localised currency string.
    $amount      = fn (int $n) => \Illuminate\Support\Number::format($n, locale: $locale);
    $money       = fn (int $n) => \Illuminate\Support\Number::currency($n, in: $currency, locale: $locale, precision: 0);
@endphp

<section id="pricing" data-reveal-section class="relative overflow-hidden border-t border-white/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 py-16 sm:py-24">
    <style>[x-cloak]{display:none!important}</style>

    {{-- soft amber portal glow, top-center --}}
    <div data-reveal="glow" class="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,_color-mix(in_oklab,var(--color-primary)_12%,transparent),_transparent_60%)]"></div>

    <div class="section-container relative" x-data="{ term: '{{ $defaultTerm }}' }">
        {{-- ── Heading ──────────────────────────────────────────────────── --}}
        <div class="mx-auto max-w-2xl text-center">
            <p data-reveal="text" class="text-xs uppercase tracking-[0.45em] text-sky-100/60">{{ __('Pricing') }}</p>
            <h2 data-reveal="heading" class="mt-3 font-history font-semibold text-3xl tracking-tight text-white md:text-4xl">
                {{ __('What a year of this costs') }}
            </h2>
            <p data-reveal="text" class="mt-4 text-base leading-relaxed text-slate-400">
                {{ __('Every plan starts with a 14-day trial and no card. Commit longer and lock a lower rate. Most schools choose the 2-year plan.') }}
            </p>
        </div>

        {{-- ── Term selector ────────────────────────────────────────────── --}}
        <div class="mt-10 flex justify-center">
            <div class="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1">
                @foreach ($terms as $key => $term)
                    {{-- A segmented control is still a row of buttons: the chosen term is the
                         primary action, the others are the same button with no fill. --}}
                    <button
                        type="button"
                        @click="term = '{{ $key }}'"
                        :class="term === '{{ $key }}' ? 'btn-primary' : 'btn-ghost'"
                        class="btn btn-sm"
                    >
                        {{ __($term['label']) }}
                        @if ($term['save'])
                            <span
                                :class="term === '{{ $key }}' ? 'bg-slate-950/15 text-slate-900' : 'bg-primary/15 text-primary'"
                                class="rounded-full px-2 py-0.5 text-2xs font-medium uppercase tracking-[0.08em]"
                            >{{ __($term['save']) }}</span>
                        @endif
                    </button>
                @endforeach
            </div>
        </div>

        {{-- ── Tier grid ────────────────────────────────────────────────── --}}
        <div data-reveal="tiers" class="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-3 lg:items-stretch">
            @foreach ($tiers as $tier)
                <div @if ($tier['featured']) data-featured @endif @class([
                    'group relative flex flex-col rounded-[1.5rem] p-8 transition duration-300 ease-out',
                    'border border-primary/40 bg-gradient-to-b from-slate-800/90 to-slate-900/90 ring-1 ring-primary/30 lg:-my-3 lg:py-11' => $tier['featured'],
                    'border border-white/10 bg-white/4 hover:border-primary/30 hover:bg-white/6' => ! $tier['featured'],
                ])>
                    @if (! empty($tier['badge']))
                        <span class="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-2xs font-medium uppercase tracking-widest text-primary">
                            {{ __($tier['badge']) }}
                        </span>
                    @endif

                    {{-- name + tagline --}}
                    <h3 class="font-history text-2xl text-white">{{ __($tier['name']) }}</h3>
                    <p class="mt-2 min-h-[2.5rem] text-sm leading-relaxed text-slate-400">{{ __($tier['tagline']) }}</p>

                    {{-- price --}}
                    <div class="mt-6 min-h-[5.25rem]">
                        @if (! empty($tier['prices']))
                            @foreach ($terms as $key => $term)
                                <div x-show="term === '{{ $key }}'" x-cloak>
                                    <div class="flex items-baseline gap-2">
                                        <span class="text-sm font-medium text-slate-400">€</span>
                                        <span @class([
                                            'font-history text-5xl tracking-tight',
                                            'lp-text-shimmer' => $tier['featured'],
                                            'text-white' => ! $tier['featured'],
                                        ])>{{ $amount($tier['prices'][$key]['per_year']) }}</span>
                                        <span class="text-sm text-slate-400">{{ __('/ year') }}</span>
                                    </div>
                                    <p class="mt-1 text-xs text-slate-500">
                                        @if ((string) $key === '1')
                                            {{ __('Billed annually') }}
                                        @else
                                            {{ __(':total total over :years years', ['total' => $money($tier['prices'][$key]['total']), 'years' => $key]) }} · {{ __($term['save']) }}
                                        @endif
                                    </p>
                                </div>
                            @endforeach
                        @else
                            <div class="flex items-baseline gap-2">
                                <span class="font-history text-4xl tracking-tight text-white">{{ __($tier['price_label']) }}</span>
                            </div>
                            <p class="mt-1 text-xs text-slate-500">{{ __('Custom pricing · any term') }}</p>
                        @endif
                    </div>

                    {{-- divider glow --}}
                    <div class="mt-5 h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent"></div>

                    {{-- features --}}
                    <ul class="mt-6 flex-1 space-y-3 text-sm">
                        @foreach ($tier['features'] as $feature)
                            <li class="flex items-start gap-3 text-slate-300">
                                <svg class="mt-0.5 h-5 w-5 flex-none text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                    <path d="M20 6 9 17l-5-5" />
                                </svg>
                                <span>{{ __($feature) }}</span>
                            </li>
                        @endforeach
                    </ul>

                    {{-- CTA --}}
                    <a
                        href="{{ $tier['href'] }}"
                        @class([
                            'btn mt-8 w-full',
                            'btn-primary' => $tier['featured'],
                            'btn-outline btn-primary' => ! $tier['featured'],
                        ])
                    >
                        {{ __($tier['cta']) }}
                    </a>
                </div>
            @endforeach
        </div>

        {{-- reassurance + honest renewal disclosure --}}
        <p class="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-slate-500">
            {{ __($finePrint) }}
        </p>
    </div>
</section>
