{{-- Product tour: a "See how it works" button that opens real screenshots of the app, one part of
     each highlighted, with Back / Next. No account and no backend: every picture is a static file
     captured by `php artisan help:screenshots --only=tour`. Steps and copy: App\Support\ProductTour.
     The engine is resources/js/onboarding/screenshot-tour.js, which reuses the welcome tour's
     placement maths.

     Closes the way every modal in this app closes: corner X, Esc, backdrop click. --}}
@php
    $steps = \App\Support\ProductTour::steps();
    $images = array_values(array_unique(array_column($steps, 'image')));
    $config = ['steps' => array_map(fn ($step) => [
        'image' => $step['image'],
        'rect' => $step['rect'],
        'placement' => $step['placement'],
    ], $steps)];
@endphp

@if ($steps !== [])
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
        <div class="relative w-[min(94vw,calc((100dvh-7.5rem)*1.6))] overflow-hidden rounded-2xl border border-white/10 bg-base-200">

            {{-- The X gets its own strip: over the picture it would sit on the screenshot's own
                 top-right controls, which is exactly where the Publish step points. --}}
            <div class="flex h-10 items-center justify-end border-b border-white/10 px-2">
                <button type="button" @click="close()" aria-label="{{ __('Close') }}"
                        class="btn btn-circle btn-ghost btn-sm text-slate-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {{-- The picture. Every screenshot of the tour is in the DOM from the start, so moving to
                 the next step is a crossfade, never a blank frame while one loads. --}}
            <div x-ref="stage" class="relative aspect-[16/10] w-full overflow-hidden bg-base-300">
                @foreach ($images as $image)
                    <img src="{{ $image }}" alt="" draggable="false"
                         class="absolute inset-0 h-full w-full select-none object-cover transition-opacity duration-300 ease-enter motion-reduce:transition-none"
                         :class="step?.image === @js($image) ? 'opacity-100' : 'opacity-0'">
                @endforeach

                {{-- Dims everything outside the ring. A step without a rectangle dims nothing: the
                     whole picture is the point. The dimming is a class, not an inline style: Alpine's
                     :style replaces the whole attribute on every move (same note as the welcome tour). --}}
                <div class="pointer-events-none absolute rounded-xl ring-1 ring-white/80 shadow-[0_0_0_9999px_rgb(2_6_23/var(--tour-dim))] transition-all duration-300 ease-move motion-reduce:transition-none"
                     :style="spotlightStyle"
                     aria-hidden="true"></div>
            </div>

            {{-- Beside the ring on a wide frame; below the picture on a narrow one. --}}
            <div x-ref="card"
                 class="z-10 border-white/10 bg-base-200 transition-[top,left] duration-200 ease-enter motion-reduce:transition-none"
                 :class="compact
                     ? 'relative w-full border-t p-5'
                     : 'absolute w-[min(var(--tour-card-width),45%)] rounded-2xl border p-5'"
                 :style="compact ? '' : cardStyle">

                <div x-show="!compact && arrow !== null" x-cloak aria-hidden="true"
                     class="absolute h-3 w-3 rotate-45 border border-white/10 bg-base-200"
                     :class="{
                         'bottom-[-0.4rem] border-l-0 border-t-0': placement === 'top',
                         'top-[-0.4rem] border-b-0 border-r-0': placement === 'bottom',
                         'right-[-0.4rem] border-b-0 border-l-0': placement === 'left',
                         'left-[-0.4rem] border-r-0 border-t-0': placement === 'right',
                     }"
                     :style="arrowStyle"></div>

                <div class="h-0.5 overflow-hidden rounded-full bg-white/10" aria-hidden="true">
                    <div class="h-full bg-white/80 transition-[width] duration-300 ease-move motion-reduce:transition-none"
                         :style="`width: ${progress}%`"></div>
                </div>

                @foreach ($steps as $index => $step)
                    <div x-show="index === {{ $index }}" x-cloak class="mt-4">
                        <h2 class="font-history text-xl font-light leading-tight text-slate-100">{{ $step['title'] }}</h2>
                        <p class="mt-2 text-sm leading-relaxed text-slate-300">{{ $step['body'] }}</p>
                    </div>
                @endforeach

                <div class="mt-5 flex items-center justify-between gap-3">
                    <button type="button" @click="previous()" class="btn btn-ghost btn-sm rounded-full"
                            :class="isFirst && 'invisible'">
                        {{ __('Back') }}
                    </button>

                    <span class="text-xs tabular-nums text-slate-400" aria-live="polite"
                          x-text="@js(__(':step of :total')).replace(':step', index + 1).replace(':total', total)"></span>

                    <button type="button" @click="next()" x-show="!isLast" class="btn btn-primary btn-sm rounded-full">
                        {{ __('Next') }}
                    </button>
                    <a href="{{ route('login') }}" x-show="isLast" x-cloak class="btn btn-primary btn-sm rounded-full">
                        {{ __('Request invite') }}
                    </a>
                </div>
            </div>

        </div>

        <form method="dialog" class="modal-backdrop">
            <button>{{ __('Close') }}</button>
        </form>
    </dialog>
</div>
@endif
