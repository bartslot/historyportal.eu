@props(['layerId'])

{{-- Water on a painted picture (resources/js/scene/stage25d/water-panel.js, engine-mvp stage25d/water.ts): the painting
     stays still, a looping ripple, glints and twinkles play only where the teacher painted the water. Every value is
     live on the stage while it is dragged and saved on the layer; off keeps the values and the mask. --}}
<div x-data="stage25dWater(@js($layerId))" x-show="info && info.water !== undefined" x-on:stage25d-synced.window="sync()"
     x-on:stage25d-edited.window="sync()" x-on:timeline-changed.window="sync()"
     class="mt-2 space-y-1 border-t border-panel-hairline pt-2" data-stage25d-water>
    {{-- ui.toggle-row's look, with its switch following the live stage --}}
    <label class="flex items-center justify-between gap-3 py-1">
        <span class="whitespace-nowrap text-xs font-semibold uppercase leading-tight tracking-wide text-panel-label">{{ __('Water') }}</span>
        <input type="checkbox" class="toggle toggle-sm shrink-0" :checked="on" x-on:change="toggle($event.target.checked)" data-stage25d-water-toggle />
    </label>
    <div x-show="on" class="space-y-1">
        @foreach ([['amount', __('Strength'), 0, 3, 0.05, 1], ['speed', __('Speed'), 0, 3, 0.05, 1], ['glints', __('Glints'), 0, 3, 0.05, 1], ['loop', __('Loop length'), 2, 12, 0.5, 4]] as [$prop, $label, $min, $max, $step, $default])
            <x-ui.panel-row :label="$label">
                <span class="range-panel-knob min-w-0 flex-1">
                    <input type="range" min="{{ $min }}" max="{{ $max }}" step="{{ $step }}" class="range range-panel" data-stage25d-water-field="{{ $prop }}"
                           aria-label="{{ $label }}" :value="value('{{ $prop }}', {{ $default }})"
                           x-on:input="set({ {{ $prop }}: Number($event.target.value) })" />
                </span>
                <span class="w-11 shrink-0 text-right text-xs font-medium text-panel-value"
                      x-text="{{ $prop === 'loop' ? "value('loop', 4).toFixed(1) + ' s'" : "Number(value('".$prop."', ".$default.")).toFixed(2)" }}"></span>
            </x-ui.panel-row>
        @endforeach
        <button type="button" class="btn btn-sm mt-1 w-full" x-on:click="open()" data-stage25d-water-paint>{{ __('Paint the water') }}</button>
    </div>

    <template x-teleport="body">
        <div x-show="painting" x-cloak x-on:keydown.escape.window="painting && close()"
             class="fixed bottom-4 left-4 z-50 w-[26rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-box border border-panel-hairline bg-base-300"
             role="dialog" aria-label="{{ __('Paint the water') }}" data-stage25d-water-window>
            <div class="flex items-center justify-between gap-2 border-b border-panel-hairline px-3 py-2">
                <span class="text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Paint the water') }}</span>
                <button type="button" class="btn btn-sm btn-primary" x-on:click="close()" data-stage25d-water-done>{{ __('Done') }}</button>
            </div>
            <div class="space-y-2 p-3">
                <canvas class="block w-full cursor-crosshair touch-none rounded bg-base-200" :data-stage25d-water-canvas="@js($layerId)"
                        x-on:pointerdown="press($event)" x-on:pointermove="move($event)" x-on:pointerup="lift()" x-on:pointercancel="lift()"></canvas>
                <div class="flex items-center gap-2">
                    <div class="join" role="radiogroup" aria-label="{{ __('Brush') }}">
                        <button type="button" class="btn btn-sm join-item" :class="!erasing && 'btn-active'" role="radio" :aria-checked="!erasing"
                                x-on:click="erasing = false" data-stage25d-water-mode="paint">{{ __('Paint') }}</button>
                        <button type="button" class="btn btn-sm join-item" :class="erasing && 'btn-active'" role="radio" :aria-checked="erasing"
                                x-on:click="erasing = true" data-stage25d-water-mode="erase">{{ __('Erase') }}</button>
                    </div>
                    <button type="button" class="btn btn-sm" x-on:click="guess()" data-stage25d-water-guess>{{ __('Find the water') }}</button>
                    <button type="button" class="btn btn-sm btn-ghost" x-on:click="clear()" data-stage25d-water-clear>{{ __('Clear all') }}</button>
                </div>
                <x-ui.panel-row :label="__('Brush size')">
                    <span class="range-panel-knob min-w-0 flex-1">
                        <input type="range" min="8" max="160" step="1" class="range range-panel" aria-label="{{ __('Brush size') }}" x-model.number="brush" />
                    </span>
                    <span class="w-11 shrink-0 text-right text-xs font-medium text-panel-value" x-text="brush"></span>
                </x-ui.panel-row>
            </div>
        </div>
    </template>
</div>
