@props([
    'images',                  // [['url' => ..., 'label' => ...], ...], e.g. Lesson::posterCandidates()
    'select',                  // Livewire method taking the picture's URL
    'current' => null,         // the URL in use now: marked chosen
    'label' => null,           // heading over the strip; none for a strip under its own heading
    'id' => 'reuse',           // imageGrid key: the size slider is remembered per id
])

{{-- The lesson's own pictures as one scrolling row: arrows, drag, the size slider and the zoom at
     the cursor (imageGrid, resources/js/ui/image-grid.js; the inner x-data only scrolls). Shared by
     the background inspector's "Reuse from this lesson" and the title screen's picture. --}}
<div {{ $attributes }} data-picture-strip x-data="imageGrid({ id: @js($id), kind: 'image', initial: 112 })">
<div x-data="{ scroll(d) { const el = $refs.strip; el.scrollBy({ left: d * el.clientWidth * 0.8, behavior: 'smooth' }); } }">
    <div class="mb-1 flex items-center justify-between gap-2">
        @if ($label)
            <span class="text-2xs font-semibold uppercase tracking-wider text-slate-400">{{ $label }}</span>
        @endif
        <x-ui.thumb-size />
    </div>
    <div class="flex items-center gap-1">
        <button type="button" @click="scroll(-1)" aria-label="{{ __('Previous') }}"
                class="flex h-8 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-800 hover:text-slate-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M15 6l-6 6 6 6"/></svg>
        </button>
        <div x-ref="strip" data-drag-scroll :style="gridStyle"
             class="lp-thumb-strip flex min-w-0 flex-1 gap-1.5 overflow-x-auto scroll-smooth [&::-webkit-scrollbar]:hidden" style="scrollbar-width:none">
            @foreach ($images as $img)
                {{-- A pick kept site-relative (/storage/...) still marks its absolute tile. --}}
                @php $isChosen = $current !== null && $current !== '' && ($current === $img['url'] || str_ends_with($img['url'], $current)); @endphp
                <button type="button" wire:click="{{ $select }}(@js($img['url']))"
                        data-kind="image" data-zoom @if ($isChosen) data-chosen @endif
                        aria-pressed="{{ $isChosen ? 'true' : 'false' }}"
                        data-tooltip="{{ $img['label'] ?? '' }}" aria-label="{{ $img['label'] ?? '' }}"
                        @class([
                            'overflow-hidden rounded transition',
                            'ring-2 ring-primary' => $isChosen,
                            'ring-1 ring-slate-700 hover:ring-base-content/40' => ! $isChosen,
                        ])>
                    <img src="{{ $img['url'] }}" alt="{{ $img['label'] ?? '' }}" class="h-full w-full object-cover" loading="lazy" decoding="async"
                         :srcset="srcset(@js($img['url']))" :sizes="sizes(@js($img['url']))"
                         onerror="this.closest('button').style.display='none'" />
                </button>
            @endforeach
        </div>
        <button type="button" @click="scroll(1)" aria-label="{{ __('Next') }}"
                class="flex h-8 w-5 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-800 hover:text-slate-100">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="h-4 w-4"><path stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6"/></svg>
        </button>
    </div>
</div>
</div>
