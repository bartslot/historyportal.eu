{{-- The Sky panel of a stage25d scene (Bart 11-12): the time of day, the sky's colours, its clouds and where the sun
     stands, every change live on the canvas and saved as the scene's set.daylight (engine.js setDaylight; one undo
     step each). The painted skies of the period are still there, folded away. Lives inside stage25dInspector, which
     holds `sky` (engine daylightInfo) and `skies` (the painted ones). No help text: the tiles show what they do. --}}
@php
    $times = ['dawn' => __('Dawn'), 'day' => __('Day'), 'dusk' => __('Dusk'), 'night' => __('Night')];
    $colours = ['top' => __('Top'), 'mid' => __('Middle'), 'horizon' => __('Horizon')];
@endphp
<div class="mt-3 space-y-3" x-show="sky" data-stage25d-sky>
    {{-- The four times, each tile a small sky of its own: what a click gives is what the tile shows. --}}
    <div class="grid grid-cols-4 gap-2" role="radiogroup" aria-label="{{ __('Time of day') }}">
        @foreach ($times as $time => $label)
            <button type="button" role="radio" class="relative flex h-11 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-md border"
                    :class="sky?.time === '{{ $time }}' ? 'border-base-content ring-1 ring-base-content' : 'border-panel-hairline'"
                    :aria-checked="sky?.time === '{{ $time }}'" aria-label="{{ $label }}" data-tooltip="{{ $label }}"
                    data-stage25d-time="{{ $time }}" x-on:click="setTime('{{ $time }}')"
                    :style="tileSky('{{ $time }}')">
                @if ($time === 'night')
                    <x-icons.moon class="h-4 w-4" />
                @else
                    <x-icons.sun class="h-4 w-4" />
                @endif
                <span class="text-xs font-semibold leading-none">{{ $label }}</span>
            </button>
        @endforeach
    </div>

    {{-- A painted sky: the time and the sun light the scene, the picture stays. Own sky paints the scene's own instead. --}}
    <button type="button" class="btn btn-sm w-full gap-2" x-show="sky && !sky.own" x-cloak data-stage25d-own-sky x-on:click="ownSky()">
        <x-icons.paint-brush class="h-4 w-4" />
        <span>{{ __('Own sky') }}</span>
    </button>

    {{-- The sky's own colours over the time's: a swatch opens the picker, the canvas follows the drag. --}}
    <x-ui.settings-section :title="__('Colours')" :open="true" class="-mx-4 w-auto!" x-show="sky?.own" data-stage25d-sky-colours>
        <x-ui.panel-row :label="__('Sky')">
            <div class="flex w-full items-center gap-2">
                @foreach ($colours as $key => $label)
                    <label class="relative grid h-8 w-8 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-md border border-panel-hairline"
                           :style="`background: ${sky?.colours?.{{ $key }} ?? 'transparent'}`" data-tooltip="{{ $label }}">
                        <input type="color" class="absolute inset-0 h-full w-full cursor-pointer opacity-0" aria-label="{{ $label }}"
                               data-stage25d-sky-colour="{{ $key }}" :value="sky?.colours?.{{ $key }}"
                               x-on:input="setColour('{{ $key }}', $event.target.value)" />
                    </label>
                @endforeach
                <span class="min-w-0 flex-1"></span>
                <button type="button" class="btn btn-ghost btn-square btn-sm" data-stage25d-sky-reset x-show="sky?.custom" x-cloak
                        aria-label="{{ __('Reset colours') }}" data-tooltip="{{ __('Reset colours') }}" x-on:click="resetColours()">
                    <x-icons.arrow-uturn-left class="h-4 w-4" />
                </button>
            </div>
        </x-ui.panel-row>
    </x-ui.settings-section>

    {{-- Clouds: which cut-outs drift over the sky and how many of them. They take the time's colours themselves. --}}
    <x-ui.settings-section :title="__('Clouds')" :open="true" class="-mx-4 w-auto!" x-show="sky?.own" data-stage25d-sky-clouds>
        <div class="space-y-1">
            <div class="grid grid-cols-5 gap-2 pb-1">
                <template x-for="c in sky?.clouds ?? []" :key="c.id">
                    <button type="button" class="relative h-11 overflow-hidden rounded-md border p-1 disabled:cursor-not-allowed"
                            :class="c.on ? 'border-base-content' : 'border-panel-hairline opacity-50'" :style="tileSky(sky?.time)" :disabled="lastCloud(c)"
                            :aria-pressed="c.on" :aria-label="c.label" :data-tooltip="c.label" :data-stage25d-cloud="c.id" x-on:click="toggleCloud(c.id)">
                        <img :src="c.thumb" alt="" class="size-full object-contain" loading="lazy" />
                    </button>
                </template>
            </div>
            <x-ui.panel-row :label="__('Cloud cover')" stacked>
                <span class="range-panel-knob min-w-0 flex-1" :style="fill(sky?.amount)">
                    <input type="range" class="range range-panel" min="0" max="1" step="0.05" aria-label="{{ __('Cloud cover') }}" data-stage25d-sky-amount
                           :value="sky?.amount" :style="fill(sky?.amount)" x-on:input="setAmount(Number($event.target.value))" />
                </span>
                <span class="w-11 shrink-0 text-right text-xs font-medium text-panel-value" x-text="Math.round((sky?.amount ?? 0) * 100)"></span>
            </x-ui.panel-row>
            <x-ui.panel-row :label="__('Drift')" stacked>
                <span class="range-panel-knob min-w-0 flex-1" :style="fill(drift)">
                    <input type="range" class="range range-panel" min="0" max="1" step="0.01" aria-label="{{ __('Drift') }}" data-stage25d-sky-drift
                           :value="drift" :style="fill(drift)" x-on:input="drift = Number($event.target.value); setLook('cloudDrift', drift)" />
                </span>
                <span class="w-11 shrink-0 text-right text-xs font-medium text-panel-value" x-text="Math.round(drift * 100)"></span>
            </x-ui.panel-row>
        </div>
    </x-ui.settings-section>

    {{-- The sun (the moon at night): where it stands throws every shadow in the scene. Auto: the time's own place. --}}
    <x-ui.settings-section :title="__('Sun')" :open="true" class="-mx-4 w-auto!" data-stage25d-sky-sun>
        <div class="space-y-1">
            @foreach (['x' => __('Across'), 'height' => __('Height')] as $axis => $label)
                <x-ui.panel-row :label="$label" stacked>
                    <span class="range-panel-knob min-w-0 flex-1" :style="fill(sky?.sun?.{{ $axis }})">
                        <input type="range" class="range range-panel" min="0" max="1" step="0.01" aria-label="{{ $label }}" data-stage25d-sun="{{ $axis }}"
                               :value="sky?.sun?.{{ $axis }}" :style="fill(sky?.sun?.{{ $axis }})" x-on:input="setSun('{{ $axis }}', Number($event.target.value))" />
                    </span>
                    <span class="w-11 shrink-0 text-right text-xs font-medium text-panel-value" x-text="Math.round((sky?.sun?.{{ $axis }} ?? 0) * 100)"></span>
                </x-ui.panel-row>
            @endforeach
            <x-ui.panel-row>
                <button type="button" class="btn btn-ghost btn-sm gap-1.5 px-2" data-stage25d-sun-auto :disabled="sky?.auto"
                        :aria-pressed="!!sky?.auto" x-on:click="autoSun()">
                    <x-icons.arrow-path class="h-4 w-4" />
                    <span class="text-xs">{{ __('Auto') }}</span>
                </button>
            </x-ui.panel-row>
        </div>
    </x-ui.settings-section>

    {{-- The period's painted skies: one over the scene instead of its own; its light still follows the time above. --}}
    <x-ui.settings-section :title="__('Painted sky')" :open="false" class="-mx-4 w-auto!" data-stage25d-painted-sky>
        <template x-if="skies && skies.length">
            <div class="grid grid-cols-2 gap-2" data-stage25d-sky-grid>
                <template x-for="o in skies" :key="o.id">
                    <button type="button" class="relative aspect-[3/2] overflow-hidden rounded-md border bg-base-200" :aria-label="o.label"
                            :class="!sky?.own && info?.asset === o.id ? 'border-base-content' : 'border-panel-hairline'"
                            :data-stage25d-sky-option="o.id" x-on:click="pickSky(o.id)">
                        <img :src="o.thumb" alt="" class="size-full object-cover" loading="lazy" />
                        <span class="absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded-xs bg-base-100/70 px-1 text-xs font-semibold leading-4 text-base-content" x-text="o.label"></span>
                    </button>
                </template>
            </div>
        </template>
    </x-ui.settings-section>
</div>
