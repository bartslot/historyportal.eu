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
<div {{ $attributes }}>
    <div class="mb-2 flex items-center justify-between">
        <span class="text-2xs uppercase tracking-widest text-slate-500">{{ $label }}</span>
        @if ($isOverride)
            <button type="button" wire:click="{{ $reset }}" class="text-2xs text-slate-500 transition-colors hover:text-primary">↺ {{ __('auto') }}</button>
        @else
            <span class="text-2xs text-slate-600">{{ __('auto-picked') }}</span>
        @endif
    </div>
    <div @class(['gap-3', 'flex' => $portrait, 'space-y-2' => ! $portrait])>
        @if ($current)
            <img src="{{ $current }}" alt=""
                 @class(['shrink-0 rounded-lg object-cover ring-1 ring-slate-600', 'h-24 w-16' => $portrait, 'aspect-video w-full' => ! $portrait]) />
        @endif
        @if (count($candidates))
            <div @class(['grid content-start gap-1.5', 'grid-cols-4' => $portrait, 'grid-cols-6' => ! $portrait])>
                @foreach ($candidates as $cand)
                    @php $isChosen = $isOverride && $chosen === $cand['url']; @endphp
                    <button type="button" wire:click="{{ $select }}(@js($cand['url']))" data-tooltip="{{ $cand['label'] }}"
                            aria-label="{{ $cand['label'] }}"
                            @class([
                                'aspect-square overflow-hidden rounded ring-1 transition',
                                'ring-primary' => $isChosen,
                                'ring-slate-700 hover:ring-slate-400' => ! $isChosen,
                            ])>
                        <img src="{{ $cand['url'] }}" alt="" class="h-full w-full object-cover" onerror="this.closest('button').style.display='none'" />
                    </button>
                @endforeach
            </div>
        @else
            <p class="self-center text-2xs text-slate-500">{{ __('Add images to the lesson to choose one.') }}</p>
        @endif
    </div>
</div>
