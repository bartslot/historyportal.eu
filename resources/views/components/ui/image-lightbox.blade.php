{{-- The one picture lightbox. Anything opens it with
     window.dispatchEvent(new CustomEvent('image-lightbox', { detail: { src, caption } })):
     the help screenshots, and a long press on a picture tile on a touch screen
     (resources/js/ui/image-grid.js). Closes on the corner X, Esc and a backdrop click, like every
     modal here. Above DaisyUI's modals, because the picture grids live inside them. --}}
<div x-data="{ open: false, src: null, caption: '' }"
     x-init="$watch('open', (v) => document.body.style.overflow = v ? 'hidden' : '')"
     x-on:image-lightbox.window="src = $event.detail.src; caption = $event.detail.caption ?? ''; open = true"
     x-on:keydown.escape.window.capture="if (open) { open = false; $event.stopPropagation() }"
     x-show="open" x-cloak
     class="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-8"
     role="dialog" aria-modal="true" :aria-label="caption"
     x-transition:enter="transition duration-200 ease-enter"
     x-transition:enter-start="opacity-0"
     x-transition:leave="transition duration-150 ease-exit"
     x-transition:leave-end="opacity-0">
    <div class="absolute inset-0 bg-slate-950/90 backdrop-blur-sm" @click="open = false"></div>

    {{-- Bounded by the viewport, not by the picture: it scales down to fit and never pushes the
         caption off-screen. --}}
    <div class="relative flex max-h-full w-full max-w-6xl flex-col overflow-hidden">
        <div class="flex shrink-0 items-start justify-between gap-4 pb-3">
            <p class="text-sm text-slate-300" x-text="caption"></p>
            <button type="button" @click="open = false" aria-label="{{ __('Close') }}"
                    class="btn btn-ghost btn-circle btn-sm shrink-0 text-panel-hint hover:text-slate-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
        <img :src="src" :alt="caption"
             class="mx-auto max-h-[calc(100vh-9rem)] w-auto max-w-full rounded-xl border border-slate-700 object-contain">
    </div>
</div>
