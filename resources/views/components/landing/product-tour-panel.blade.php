{{-- The tour itself (picture, ring, card), shared by the dialog and the inline section of
     product-tour.blade.php. Needs $steps, $images and $inline from there. --}}
    <div x-ref="panel" class="relative {{ $inline ? 'w-full' : 'w-[min(94vw,calc((100dvh-7.5rem)*1.6))]' }} overflow-hidden rounded-2xl border border-white/10 bg-base-200">

        {{-- The X gets its own strip: over the picture it would sit on the screenshot's own
             top-right controls, which is exactly where the Publish step points. Inline there is no
             X; the same strip carries pause / play. --}}
        <div class="flex h-10 items-center justify-end border-b border-white/10 px-2">
            @if ($inline)
                <button type="button" @click="toggle()" :aria-label="playing ? @js(__('Pause')) : @js(__('Play'))"
                        :data-tooltip="playing ? @js(__('Pause')) : @js(__('Play'))"
                        class="btn btn-circle btn-ghost btn-sm text-slate-300">
                    <svg x-show="playing" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                    </svg>
                    <svg x-show="!playing" x-cloak viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                    </svg>
                </button>
            @else
                <button type="button" @click="close()" aria-label="{{ __('Close') }}"
                        class="btn btn-circle btn-ghost btn-sm text-slate-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                </button>
            @endif
        </div>

        {{-- The picture. Every screenshot is in the DOM once the tour opens, so moving to
             the next step is a crossfade, never a blank frame while one loads. Each carries its
             own camera: a small highlight is zoomed in on as its picture fades in. --}}
        <div x-ref="stage" class="relative aspect-[16/10] w-full overflow-hidden bg-base-300">
            {{-- Not in the page until the tour first opens: 1.5 MB of screenshots is no reason to
                 slow the About page for every visitor who never clicks. --}}
            <template x-if="opened">
                <div>
                @foreach ($images as $image)
                    <img src="{{ $image }}" alt="" draggable="false"
                         class="absolute inset-0 h-full w-full origin-top-left select-none object-cover [transition:opacity_280ms_var(--ease-enter),transform_450ms_var(--ease-move)] motion-reduce:transition-none"
                         :class="step?.image === @js($image) ? 'opacity-100' : 'opacity-0'"
                         :style="cameraStyle(@js($image))">
                @endforeach
                </div>
            </template>

            {{-- Dims everything outside the ring. A step without a rectangle dims nothing: the
                 whole picture is the point. The dimming is a class, not an inline style: Alpine's
                 :style replaces the whole attribute on every move (same note as the welcome tour). --}}
            {{-- On the same screen it glides to the next spot (one thing for the eye to follow);
                 on a new screen it is placed, then closes in (screenshot-tour.js arrive()). --}}
            <div x-ref="ring"
                 class="pointer-events-none absolute rounded-xl ring-1 ring-white/80 shadow-[0_0_0_9999px_rgb(2_6_23/var(--tour-dim))] transition-[top,left,width,height] duration-[450ms] ease-move motion-reduce:transition-none"
                 :class="jumping && '!transition-none'"
                 :style="spotlightStyle"
                 aria-hidden="true"></div>
        </div>

        {{-- Beside the ring on a wide frame; below the picture on a narrow one. --}}
        <div x-ref="card"
             class="z-10 border-white/10 bg-base-200 transition-[top,left] duration-[450ms] ease-move motion-reduce:transition-none"
             :class="[
                 compact ? 'relative w-full border-t p-5' : 'absolute w-[min(var(--tour-card-width),45%)] rounded-2xl border p-5',
                 jumping && '!transition-none',
             ]"
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
                <div class="h-full origin-left bg-white/80 transition-transform duration-[450ms] ease-move motion-reduce:transition-none"
                     :style="`transform: scaleX(${progress})`"></div>
            </div>

            @foreach ($steps as $index => $step)
                {{-- New words rise in a few pixels; the old ones simply go (an exit should be quieter). --}}
                <div x-show="index === {{ $index }}" x-cloak class="mt-4"
                     x-transition:enter="transition duration-200 ease-enter motion-reduce:transition-none"
                     x-transition:enter-start="translate-y-1 opacity-0"
                     x-transition:enter-end="translate-y-0 opacity-100">
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
