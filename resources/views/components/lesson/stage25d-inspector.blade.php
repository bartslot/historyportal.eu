@props(['layerId' => null])

@php
    $names = [
        'sheetGrain' => __('Paper grain'), 'groundDetail' => __('Ground detail'), 'sunLight' => __('Sunlight'),
        'castShadow' => __('Shadows'), 'smoke' => __('Smoke'), 'birds' => __('Birds'), 'cloudDrift' => __('Clouds'), 'housePitch' => __('Tilt'),
    ];
@endphp

{{-- The Format panel of a stage25d scene. A selected layer (layerId): its picture, where it stands, its motion.
     Nothing selected: the scene's look sliders. Every value is read off the live stage (window.__stage25d) and
     written back through it, so this panel, the canvas drag and the timeline rows share one set of rules; the
     diamonds are the timeline's own. No help text: the controls are the explanation. --}}
<div wire:key="s25-inspector-root-{{ $layerId ?? 'scene' }}" data-stage25d-inspector="{{ $layerId ?? 'scene' }}" x-data="stage25dInspector(@js($layerId), @js($names))"
     x-on:timeline-changed.window="sync()" x-on:scene-objects-changed.window="sync()" x-on:stage25d-synced.window="sync()" x-on:stage25d-edited.window="sync()">

    @if ($layerId)
        <div class="-mx-4 -mt-4 flex items-center gap-2 border-b border-panel-hairline px-4 py-3">
            <x-ui.panel-breadcrumb :label="__('Scene')"
                                   x-on:click="window.__stage25d?.select(null); window.__clearLayerGuard?.(); $wire.selectInspectorTarget('')" />
            <span class="min-w-0 flex-1 truncate text-sm font-semibold text-base-content" x-text="info?.label"></span>
        </div>

        <div class="mt-3 flex items-center gap-3">
            <div class="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-base-200">
                <img x-show="info?.file" :src="info?.file" alt="" class="max-h-full max-w-full object-contain" />
            </div>
            <button type="button" class="btn btn-sm btn-outline"
                    x-on:click="$store.view.showTab('icons'); $nextTick(() => window.dispatchEvent(new CustomEvent('stage25d-replace', { detail: { kind: info?.role } })))">{{ __('Change picture') }}</button>
        </div>

        {{-- Where it stands: across the view, and how far along the ground in metres (drag it up the stage to send it
             back). A picture not on the ground (a strip, a sky picture) keeps its Y instead of a distance. --}}
        <div class="mt-3 space-y-1" x-show="info && !info.backdrop">
            @foreach ([['x', __('X'), 0.01, 100, 'true'], ['z', __('Distance'), 0.25, 1, 'info?.ground'], ['y', __('Y'), 0.05, 1, '!info?.ground'], ['scale', __('Scale'), 0.05, 100, 'info?.showScale'], ['rotation', __('Angle'), 1, 1, 'true'], ['opacity', __('Opacity'), 0.05, 100, 'true']] as [$prop, $glyph, $step, $factor, $show])
                <div x-show="{{ $show }}">
                <x-ui.panel-row :label="$glyph" keyframe :keyframe-target="'s25:'.$layerId" :keyframe-property="$prop">
                    <label class="input input-xs flex w-full items-center gap-1.5 px-2" style="height: var(--settings-panel-row-h, 2rem)">
                        <input type="number" step="{{ $step * $factor }}" aria-label="{{ $glyph }}"
                               data-stage25d-field="{{ $prop }}"
                               :value="values.{{ $prop }}" x-on:change="set('{{ $prop }}', $event.target.value, {{ $factor }})"
                               class="w-full min-w-0 border-0 bg-transparent p-0 text-xs outline-none
                                      [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                        @if ($prop === 'z')
                            <span class="text-xs text-panel-hint">m</span>
                        @endif
                    </label>
                </x-ui.panel-row>
                </div>
            @endforeach
        </div>

        <div class="divider my-2" role="presentation"></div>

        <div class="space-y-1" x-show="info && !info.backdrop">
            <x-ui.panel-row :label="__('Motion')">
                <select class="select select-xs w-full" data-stage25d-motion="kind"
                        x-on:change="setMotion({ kind: $event.target.value })">
                    @foreach (\App\Services\Stage25d\LayerKeys::MOTION_KINDS as $kind)
                        <option value="{{ $kind }}" :selected="info?.motion?.kind === '{{ $kind }}'">{{ __(ucfirst($kind)) }}</option>
                    @endforeach
                </select>
            </x-ui.panel-row>
            @foreach ([['amount', __('Amount')], ['speed', __('Speed')]] as [$prop, $label])
                <div x-show="info?.motion?.kind !== 'none'">
                <x-ui.panel-row :label="$label">
                    <input type="range" min="0" max="3" step="0.05" class="range range-xs w-full" data-stage25d-motion="{{ $prop }}"
                           aria-label="{{ $label }}"
                           :value="info?.motion?.{{ $prop }}" x-on:input="setMotion({ {{ $prop }}: Number($event.target.value) })" />
                </x-ui.panel-row>
                </div>
            @endforeach
        </div>
    @else
        {{-- The stage draws the picture itself, so this scene is a 3D World; a slideshow's 2D options (layout, Ken Burns,
             a background colour) do not apply and the view cannot be switched away. --}}
        <div class="relative mb-3">
            <span class="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-panel-hint">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
                </svg>
            </span>
            <select disabled data-stage25d-view aria-label="{{ __('3D World') }}"
                    class="select select-sm select-bordered w-full bg-base-100 pl-9 font-medium text-slate-200">
                <option>{{ __('3D World') }}</option>
            </select>
        </div>
        <div class="space-y-1">
            <template x-for="c in look" :key="c.key">
                <label class="flex items-center gap-2" style="min-height: var(--settings-panel-row-h, 2rem)">
                    <span class="w-28 shrink-0 select-none text-xs font-semibold uppercase leading-tight tracking-wide text-panel-label" x-text="names[c.key] ?? c.key"></span>
                    <input type="range" class="range range-xs min-w-0 flex-1" :min="c.min" :max="c.max" :step="c.step"
                           :value="c.value" :aria-label="names[c.key] ?? c.key" :data-stage25d-look="c.key"
                           x-on:input="setLook(c.key, Number($event.target.value))" />
                </label>
            </template>
        </div>
    @endif
</div>
