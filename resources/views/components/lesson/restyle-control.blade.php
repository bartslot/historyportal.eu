@props(['kind', 'id', 'restyle' => null, 'compact' => false])

{{-- Restyle: send this picture to be redone in the History Lines style. One click, then it works
     in the background; the result lands beside the original and the teacher keeps it or undoes it. --}}
@php
    $row = $restyle;
    $active = $row?->isActive();
    $unseen = $row && ! $active && $row->notified_at === null;
    $ready = $row?->status === \App\Models\ImageRestyle::READY;
    $kept = $row?->status === \App\Models\ImageRestyle::KEPT;
@endphp
<div class="space-y-2" data-restyle="{{ $row?->status ?? 'idle' }}" @if ($active || $unseen) wire:poll.3s="pollRestyle({{ $row->id }})" @endif>
    @if ($active)
        <span class="inline-flex items-center gap-1.5 text-xs text-panel-hint">
            <x-icons.spinner class="h-3.5 w-3.5 animate-spin" /><span>{{ $row->step >= 2 ? __('Restyling 2/2: colour…') : __('Restyling 1/2: ink…') }}</span>
        </span>
    @elseif ($ready)
        <div class="grid gap-2 {{ $compact ? 'grid-cols-3' : 'grid-cols-1' }}">
            <figure class="m-0 flex min-w-0 flex-col gap-1">
                <img src="{{ $row->originalUrl() }}" alt="" class="w-full rounded object-contain lp-paper {{ $compact ? 'aspect-square' : 'aspect-video' }}" />
                <figcaption class="text-xs text-panel-hint">{{ __('Before') }}</figcaption>
            </figure>
            <figure class="m-0 flex min-w-0 flex-col gap-1">
                <img src="{{ $row->inkUrl() }}" alt="" class="w-full rounded object-contain lp-paper {{ $compact ? 'aspect-square' : 'aspect-video' }}" />
                <figcaption class="text-xs text-panel-hint">{{ __('Ink') }}</figcaption>
            </figure>
            <figure class="m-0 flex min-w-0 flex-col gap-1">
                <img src="{{ $row->resultUrl() }}" alt="" class="w-full rounded object-contain lp-paper {{ $compact ? 'aspect-square' : 'aspect-video' }}" />
                <figcaption class="text-xs text-panel-hint">{{ __('After') }}</figcaption>
            </figure>
        </div>
        <div class="flex gap-1.5">
            <button type="button" wire:click="keepRestyle({{ $row->id }})" class="btn btn-xs btn-primary">{{ __('Keep') }}</button>
            <button type="button" wire:click="undoRestyle({{ $row->id }})" class="btn btn-xs btn-ghost">{{ __('Undo') }}</button>
        </div>
    @else
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <button type="button" wire:click="restyle('{{ $kind }}', {{ $id }})" wire:loading.attr="disabled" wire:target="restyle"
                    class="inline-flex items-center gap-1.5 text-xs text-panel-value transition hover:text-base-content disabled:opacity-50">
                <x-icons.paint-brush class="h-3.5 w-3.5" /><span>{{ __('Restyle') }}</span>
            </button>
            @if ($kept)
                <button type="button" wire:click="revertRestyle({{ $row->id }})"
                        class="inline-flex items-center gap-1.5 text-xs text-panel-value transition hover:text-base-content">
                    <x-icons.arrow-uturn-left class="h-3.5 w-3.5" /><span>{{ __('Back to original') }}</span>
                </button>
            @endif
        </div>
    @endif
</div>
