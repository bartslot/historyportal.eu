@props([
    'label',
    'current',                 // URL of the picture in use now
    'candidates' => [],        // [['url' => ..., 'label' => ...], ...] from Lesson::posterCandidates()
    'chosen' => null,          // the teacher's override, or null when the lesson picks by itself
    'select',                  // Livewire method taking the candidate URL
    'reset',                   // Livewire method clearing the override
    'portrait' => false,       // the poster is a 2:3 card; the title screen is wide
])

{{-- One of the lesson's own pictures, chosen by clicking it; "auto" hands the choice back to the
     lesson. Shared by the poster (Settings) and the title screen (its Format). --}}
@php $isOverride = trim((string) $chosen) !== ''; @endphp
<div {{ $attributes }} x-data="imageGrid({ id: 'image-choice', kind: 'image', initial: 96 })">
    <div class="mb-2 flex items-center gap-2">
        <span class="mr-auto text-2xs uppercase tracking-widest text-panel-hint">{{ $label }}</span>
        @if (count($candidates))
            <x-ui.thumb-size />
        @endif
        @if ($isOverride)
            <button type="button" wire:click="{{ $reset }}" class="text-2xs text-panel-hint transition-colors hover:text-primary">↺ {{ __('auto') }}</button>
        @else
            <span class="text-2xs text-panel-hint">{{ __('auto-picked') }}</span>
        @endif
    </div>
    <div @class(['gap-3', 'flex' => $portrait, 'space-y-2' => ! $portrait])>
        @if ($current)
            <img src="{{ $current }}" alt=""
                 @class(['shrink-0 rounded-lg object-cover ring-1 ring-slate-600', 'h-24 w-16' => $portrait, 'aspect-video w-full' => ! $portrait]) />
        @endif
        @if (count($candidates))
            {{-- The shared picture grid (resources/js/ui/image-grid.js): 16:9 tiles, zoom at the cursor. --}}
            <div class="lp-thumb-grid min-w-0 flex-1 content-start gap-1.5" :style="gridStyle">
                @foreach ($candidates as $cand)
                    @php $isChosen = $isOverride && $chosen === $cand['url']; @endphp
                    <button type="button" wire:click="{{ $select }}(@js($cand['url']))" data-tooltip="{{ $cand['label'] }}"
                            aria-label="{{ $cand['label'] }}" aria-pressed="{{ $isChosen ? 'true' : 'false' }}"
                            data-kind="image" data-zoom @if ($isChosen) data-chosen @endif
                            @class([
                                'rounded transition',
                                'ring-2 ring-primary' => $isChosen,
                                'ring-1' => ! $isChosen,
                                'ring-slate-700 hover:ring-slate-400' => ! $isChosen,
                            ])>
                        <img src="{{ $cand['url'] }}" alt="" loading="lazy" decoding="async"
                             :srcset="srcset(@js($cand['url']))" :sizes="sizes(@js($cand['url']))" onerror="this.closest('button').style.display='none'" />
                    </button>
                @endforeach
            </div>
        @else
            <p class="self-center text-prose text-panel-hint">{{ __('Add images to the lesson to choose one.') }}</p>
        @endif
    </div>
</div>
