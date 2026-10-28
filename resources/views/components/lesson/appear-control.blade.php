@props([
    /** Unique per page: names the speed radios. */
    'name',
    /** The entrance chosen now (LayerEntrances::labels() key). */
    'anim' => 'none',
    /** The entrance's length at Normal, ms (LayerEntrances::naturalMs). */
    'natural' => \App\Support\LayerEntrances::LAYER_MS,
    /** The stored duration, ms, or null for the entrance as it always played. */
    'duration' => null,
    /** Seconds after the scene starts. */
    'delay' => 0,
    /** Livewire expression for the entrance select; `$event.target.value` is the choice. */
    'onAnim',
    /** Livewire expression for a speed; `$event.target.value` is fast, normal or slow. */
    'onSpeed',
    /** Livewire expression for the delay field; `$event.target.value` is seconds. */
    'onDelay',
])

{{-- Appear, with its speed and delay: ONE control for every layer that arrives on a scene (a
     figure's Animate tab, a speech balloon's inspector). Bart, 2026-10-17: "can we add timing
     functions next to appear: fast / Slow ... als add a delay (just like keynote)".

     Speed is a factor on the entrance's own length (LayerEntrances::SPEEDS), so Normal is exactly
     what played before, and a pop stays quicker than a fade at every speed. A duration typed in the
     Animate tab's Duration slider is no preset: then no speed is lit.

     Delay is Keynote's Delay, counted from the scene's start, which is the one start the player
     has. The timeline draws it too: a balloon's bar starts there, a figure's entrance bar as well. --}}
@php
    $speed = \App\Support\LayerEntrances::speedOf($duration === null ? null : (int) $duration, (int) $natural);
    $speedOptions = [];
    foreach (\App\Support\LayerEntrances::speedLabels() as $key => $label) {
        $factor = \App\Support\LayerEntrances::SPEEDS[$key];
        $speedOptions[] = [$key, $label, ['motion' => (int) round($natural * $factor), 'factor' => $factor]];
    }
    $delayText = rtrim(rtrim(number_format((float) $delay, 1, '.', ''), '0'), '.') ?: '0';
@endphp
<div {{ $attributes->class(['space-y-2']) }} data-appear-control>
    <div class="space-y-1">
        <span class="block text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Appear') }}</span>
        <div class="flex items-center gap-2">
            <select class="select select-sm select-bordered min-w-0 flex-1" wire:change="{{ $onAnim }}">
                @foreach (\App\Support\LayerEntrances::labels() as $value => $label)
                    <option value="{{ $value }}" @selected($anim === $value)>{{ $label }}</option>
                @endforeach
            </select>
            <x-ui.segmented panel :name="$name" :options="$speedOptions" :value="$speed"
                            :on-change="'$wire.' . $onSpeed" class="shrink-0" data-appear-speed />
        </div>
    </div>

    <x-ui.panel-row :label="__('Delay')">
        <label class="input input-xs flex w-24 items-center gap-1 px-2" style="height: var(--settings-panel-row-h, 2rem)">
            <input type="number" min="0" max="60" step="0.1" value="{{ $delayText }}" aria-label="{{ __('Delay') }}"
                   data-appear-delay wire:change="{{ $onDelay }}"
                   class="w-full min-w-0 border-0 bg-transparent p-0 text-right text-xs outline-none
                          [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
            <span class="text-xs font-semibold uppercase tracking-wide text-panel-label">s</span>
        </label>
    </x-ui.panel-row>
</div>
