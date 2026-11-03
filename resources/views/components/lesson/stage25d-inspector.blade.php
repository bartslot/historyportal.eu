@props(['layerId' => null])

@php
    // The sky and a ground band are the backdrop: a teacher sizes it ("Size") and lifts the sky ("Height").
    $isBackdrop = $layerId === 'sky' || str_starts_with((string) $layerId, 'band-');
    $names = [
        'sheetGrain' => __('Paper grain'), 'groundDetail' => __('Ground detail'), 'sunLight' => __('Sunlight'),
        'castShadow' => __('Shadows'), 'smoke' => __('Smoke'), 'birds' => __('Birds'), 'cloudDrift' => __('Clouds'), 'housePitch' => __('Tilt'),
        'groundWash' => __('Watercolour'), 'groundGrain' => __('Grain size'), 'grass' => __('Grass'), 'grassSway' => __('Grass sway'), 'horizonBushes' => __('Horizon bushes'),
    ];
    // The poses a figure series is painted in (library.json `pose:` tags).
    $poses = [
        'stand' => __('Stand'), 'walk' => __('Walk'), 'point' => __('Point'), 'kneel' => __('Kneel'),
        'carry' => __('Carry'), 'push' => __('Push'), 'dig' => __('Dig'), 'sit' => __('Sit'),
    ];
@endphp

{{-- The Format panel of a stage25d scene. A selected layer (layerId): its picture, where it stands, its motion.
     Nothing selected: the scene's look sliders. Every value is read off the live stage (window.__stage25d) and
     written back through it, so this panel, the canvas drag and the timeline rows share one set of rules; the
     diamonds are the timeline's own. No help text: the controls are the explanation. --}}
<div wire:key="s25-inspector-root-{{ $layerId ?? 'scene' }}" data-stage25d-inspector="{{ $layerId ?? 'scene' }}" x-data="stage25dInspector(@js($layerId), @js($names), @js($poses))"
     x-on:timeline-changed.window="sync()" x-on:scene-objects-changed.window="sync()" x-on:stage25d-synced.window="sync()" x-on:stage25d-edited.window="sync()">

    @if ($layerId)
        <div class="-mx-4 -mt-4 flex items-center gap-2 border-b border-panel-hairline px-4 py-3">
            <x-ui.panel-breadcrumb :label="__('Scene')"
                                   x-on:click="window.__stage25d?.select(null); window.__clearLayerGuard?.(); $wire.selectInspectorTarget('')" />
            <span class="min-w-0 flex-1 truncate text-sm font-semibold text-base-content" x-text="info?.label"></span>
        </div>

        <div class="mt-3 flex items-center gap-3">
            <div class="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md bg-base-200">
                <template x-if="info?.file && info?.anim">
                    <span class="s25-sheet" :style="`aspect-ratio: ${info.anim.w} / ${info.anim.h}; --cols: ${info.anim.cols}; --rows: ${info.anim.rows}; --row-s: ${info.anim.cols / info.anim.fps}s`">
                        <img :src="info.file" alt="" />
                    </span>
                </template>
                <img x-show="info?.file && !info?.anim" :src="info?.file" alt="" class="max-h-full max-w-full object-contain" />
            </div>
            <button type="button" class="btn btn-sm btn-outline"
                    x-on:click="$store.view.showTab('icons'); $nextTick(() => window.dispatchEvent(new CustomEvent('stage25d-replace', { detail: { kind: info?.role } })))">{{ __('Change picture') }}</button>
        </div>

        {{-- A character (a figure of a series): its other pictures, another character in the same stance, and a balloon
             that is grouped with it (it moves along). --}}
        <template x-if="series">
            <div class="mt-3 space-y-2" data-stage25d-series>
                <div class="grid grid-cols-6 gap-1" role="listbox" aria-label="{{ __('Pose') }}">
                    <template x-for="m in series.members" :key="m.id">
                        <button type="button" role="option" :aria-selected="m.id === series.asset" :title="poses[m.pose] ?? m.pose" :aria-label="poses[m.pose] ?? m.pose"
                                :data-stage25d-pose="m.id" x-on:click="pose(m.id)"
                                class="flex h-12 items-center justify-center overflow-hidden rounded bg-base-200 ring-1"
                                :class="m.id === series.asset ? 'ring-primary' : 'ring-transparent hover:ring-base-content/30'">
                            <img :src="m.thumb ?? m.url" x-on:error.once="$el.src = m.url" alt="" draggable="false" loading="lazy" class="max-h-full max-w-full object-contain" />
                        </button>
                    </template>
                </div>
                <x-ui.panel-row :label="__('Character')">
                    <select class="select select-xs w-full" data-stage25d-character aria-label="{{ __('Character') }}" x-on:change="character($event.target.value)">
                        <template x-for="c in series.characters" :key="c.series">
                            <option :value="c.series" :selected="c.series === series.series" x-text="c.label"></option>
                        </template>
                    </select>
                </x-ui.panel-row>
                <button type="button" class="btn btn-sm btn-outline w-full" data-stage25d-balloon
                        x-on:click="$wire.addStage25dBalloon(Number(@js($layerId).slice(6)))">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                    {{ __('Speech balloon') }}
                </button>
            </div>
        </template>

        {{-- Where it stands: across the view, and how far along the ground in metres (drag it up the stage to send it
             back). The rows are the ones its kind takes (engine layerInfo fields): a picture on the ground has a
             distance, a far strip a distance and a Y, a ground band a distance and a size (it stays on the floor), the
             sky a height and a size. --}}
        <div class="mt-3 space-y-1" x-show="info">
            @foreach ([['x', __('X'), 0.01, 100], ['z', __('Distance'), 0.25, 1], ['y', $layerId === 'sky' ? __('Height') : __('Y'), 0.05, 1], ['scale', __('Size'), 0.05, 100], ['rotation', __('Angle'), 1, 1], ['opacity', __('Opacity'), 0.05, 100]] as [$prop, $glyph, $step, $factor])
                <div x-show="info?.fields?.includes('{{ $prop }}')">
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

        <div class="space-y-1" x-show="info">
            <x-ui.panel-row :label="__('Motion')">
                <select class="select select-xs w-full" data-stage25d-motion="kind"
                        x-on:change="setMotion({ kind: $event.target.value })">
                    @foreach (\App\Services\Stage25d\LayerKeys::MOTION_KINDS as $kind)
                        <option value="{{ $kind }}" :selected="info?.motion?.kind === '{{ $kind }}'">{{ __(ucfirst($kind)) }}</option>
                    @endforeach
                </select>
            </x-ui.panel-row>
            {{-- An animation (VFX): how fast it plays (1 = the sheet's own fps, 0 holds a frame) and where it starts. --}}
            <template x-if="info?.anim">
                <div class="space-y-1" data-stage25d-play>
                    <x-ui.panel-row :label="__('Play speed')">
                        <input type="range" min="0" max="3" step="0.05" class="range range-xs w-full" data-stage25d-play-field="speed"
                               aria-label="{{ __('Play speed') }}"
                               :value="info?.play?.speed" x-on:change="setPlay({ speed: Number($event.target.value) })" />
                    </x-ui.panel-row>
                    <x-ui.panel-row :label="__('Start at')">
                        <label class="input input-xs flex w-full items-center gap-1.5 px-2" style="height: var(--settings-panel-row-h, 2rem)">
                            <input type="number" min="0" :max="info.anim.frames / info.anim.fps" step="0.1" aria-label="{{ __('Start at') }}"
                                   data-stage25d-play-field="offset"
                                   :value="info?.play?.offset" x-on:change="setPlay({ offset: Math.max(0, Number($event.target.value) || 0) })"
                                   class="w-full min-w-0 border-0 bg-transparent p-0 text-xs outline-none
                                          [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                            <span class="text-xs text-panel-hint">s</span>
                        </label>
                    </x-ui.panel-row>
                </div>
            </template>
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

        {{-- The floor's ground pictures, near to far: each from its distance on (the nearest from the camera). --}}
        <template x-if="ground && ground.options.length">
            <div class="mt-3 space-y-1" data-stage25d-ground>
                <div class="divider my-2" role="presentation"></div>
                <span class="block select-none text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Ground') }}</span>
                <template x-for="(row, i) in ground.rows" :key="i">
                    <div class="flex items-center gap-1.5" style="min-height: var(--settings-panel-row-h, 2rem)">
                        <select class="select select-xs min-w-0 flex-1" :aria-label="@js(__('Ground')) + ' ' + (i + 1)" :data-stage25d-ground-asset="i"
                                x-on:change="groundRow(i, { asset: $event.target.value })">
                            <template x-for="o in ground.options" :key="o.id">
                                <option :value="o.id" :selected="o.id === row.asset" x-text="o.label"></option>
                            </template>
                        </select>
                        <label class="input input-xs flex w-16 shrink-0 items-center gap-1 px-1.5" x-show="i > 0">
                            <input type="number" min="0" max="2000" step="1" :aria-label="@js(__('From'))" :data-stage25d-ground-from="i"
                                   :value="row.from_m" x-on:change="groundRow(i, { from_m: Number($event.target.value) })"
                                   class="w-full min-w-0 border-0 bg-transparent p-0 text-xs outline-none [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                            <span class="text-xs text-panel-hint">m</span>
                        </label>
                        <button type="button" class="btn btn-ghost btn-xs btn-square" x-show="ground.rows.length > 1" :aria-label="@js(__('Remove'))"
                                :data-stage25d-ground-remove="i" x-on:click="removeGround(i)">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                </template>
                <button type="button" class="btn btn-ghost btn-xs" x-show="ground.rows.length < ground.max" data-stage25d-ground-add x-on:click="addGround()">{{ __('Add ground layer') }}</button>
            </div>
        </template>
    @endif
</div>
