{{-- Product tour: a "See how it works" button that opens real screenshots of the app, one part of
     each highlighted, with Back / Next. With `inline` the same tour plays in the page instead
     (About's "How it works"): it starts once it is seen and moves on by itself. No account and no
     backend: every picture is a static file captured by `php artisan help:screenshots --only=tour`. Steps and copy: App\Support\ProductTour.
     The engine is resources/js/onboarding/screenshot-tour.js, which reuses the welcome tour's
     placement maths.

     The dialog closes the way every modal in this app closes: corner X, Esc, backdrop click. --}}
@props(['inline' => false])

@php
    $steps = \App\Support\ProductTour::steps();
    $images = array_values(array_unique(array_column($steps, 'image')));
    $config = ['steps' => array_map(fn ($step) => [
        'image' => $step['image'],
        'rect' => $step['rect'],
        'placement' => $step['placement'],
    ], $steps), 'inline' => $inline];
@endphp

@if ($steps !== [] && $inline)
{{-- Inline (About's "How it works"): in the page, starting once it is seen, moving on by itself. --}}
<div x-data="screenshotTour(@js($config))" x-init="watch()" {{ $attributes }}
     style="--tour-dim: 0.55; --tour-card-width: 21rem;">
    @include('components.landing.product-tour-panel')
</div>
@elseif ($steps !== [])
<div x-data="screenshotTour(@js($config))" {{ $attributes }}>
    <button type="button" @click="open()" class="btn btn-ghost inline-flex items-center gap-2 rounded-full px-6 text-slate-200">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
        {{ __('See how it works') }}
    </button>

    <dialog x-ref="dialog" class="modal bg-base-300/80" aria-label="{{ __('See how it works') }}"
            @close="closed()"
            @keydown.arrow-right.prevent="next()"
            @keydown.arrow-left.prevent="previous()"
            style="--tour-dim: 0.55; --tour-card-width: 21rem;">
        @include('components.landing.product-tour-panel')

        <form method="dialog" class="modal-backdrop">
            <button>{{ __('Close') }}</button>
        </form>
    </dialog>
</div>
@endif
