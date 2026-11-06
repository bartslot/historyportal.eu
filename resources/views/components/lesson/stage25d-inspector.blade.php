@props(['layerId' => null, 'scene' => null])

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
     x-on:timeline-changed.window="sync()" x-on:scene-objects-changed.window="sync()" x-on:stage25d-synced.window="sync()" x-on:stage25d-edited.window="sync()"
     x-on:focusin="showHud($event)" x-on:input="showHud($event)">

    @if ($layerId === 'camera')
        {{-- The camera: the canvas shows the start or the end of its move, and the teacher frames it right there.
             The player glides from one to the other over the scene. --}}
        <div class="-mx-4 -mt-4 flex items-center gap-2 border-b border-panel-hairline px-4 py-3">
            <x-ui.panel-breadcrumb :label="__('Scene')"
                                   x-on:click="window.__stage25d?.select(null); window.__clearLayerGuard?.(); $wire.selectInspectorTarget('')" />
            <span class="min-w-0 flex-1 truncate text-sm font-semibold text-base-content">{{ __('Camera') }}</span>
        </div>

        {{-- Start and End move the playhead there; the frame at the playhead is what a drag changes. --}}
        <div class="mt-3 grid grid-cols-2 gap-2" aria-label="{{ __('Camera') }}" data-stage25d-camera>
            @foreach ([['from', __('Start')], ['to', __('End')]] as [$end, $label])
                <button type="button" class="btn btn-sm" data-camera-end="{{ $end }}" x-on:click="frame('{{ $end }}')">{{ $label }}</button>
            @endforeach
        </div>
        <p class="mt-2 text-xs text-panel-hint">{{ __('Drag the picture to move the camera. Scroll to go closer, pinch to zoom.') }}</p>

        <div class="mt-3 space-y-1" x-show="cam">
            <x-ui.panel-row :label="__('Rotate')">
                <label class="input input-xs flex w-full items-center gap-1.5 px-2" style="height: var(--settings-panel-row-h, 2rem)">
                    <input type="number" min="-45" max="45" step="1" aria-label="{{ __('Rotate') }}" data-camera-roll
                           :value="Math.round((cam?.pose?.roll ?? 0) * 10) / 10"
                           x-on:change="cameraValue('roll', Number($event.target.value))" />
                    <span class="text-panel-hint">°</span>
                </label>
            </x-ui.panel-row>
            <x-ui.panel-row :label="__('Motion')">
                <select class="select select-xs w-full" data-camera-motion="kind" x-on:change="cameraMotion({ kind: $event.target.value })">
                    @foreach ([['none', __('None')], ['sway', __('Sway')], ['handheld', __('Handheld')], ['shake', __('Shake')]] as [$kind, $label])
                        <option value="{{ $kind }}" :selected="cam?.motion?.kind === '{{ $kind }}'">{{ $label }}</option>
                    @endforeach
                </select>
            </x-ui.panel-row>
            @foreach ([['amount', __('Amount')], ['speed', __('Speed')]] as [$prop, $label])
                <div x-show="cam?.motion?.kind !== 'none'">
                    <x-ui.panel-row :label="$label">
                        <span class="range-panel-knob min-w-0 flex-1">
                            <input type="range" min="0" max="3" step="0.05" class="range range-panel" data-camera-motion="{{ $prop }}" aria-label="{{ $label }}"
                                   :value="cam?.motion?.{{ $prop }}" x-on:input="cameraMotion({ {{ $prop }}: Number($event.target.value) })" />
                        </span>
                        <span class="w-11 shrink-0 text-right text-xs font-medium text-panel-value" x-text="+Number(cam?.motion?.{{ $prop }} ?? 0).toFixed(2)"></span>
                    </x-ui.panel-row>
                </div>
            @endforeach
        </div>

        <button type="button" class="btn btn-ghost btn-sm mt-3 w-full" data-camera-still x-show="cam?.moves" x-on:click="stillCamera()">
            {{ __('Keep the camera still') }}
        </button>
    @elseif ($layerId)
        <div class="-mx-4 -mt-4 flex items-center gap-2 border-b border-panel-hairline px-4 py-3">
            <x-ui.panel-breadcrumb :label="__('Scene')"
                                   x-on:click="window.__stage25d?.select(null); window.__clearLayerGuard?.(); $wire.selectInspectorTarget('')" />
            <span class="min-w-0 flex-1 truncate text-sm font-semibold text-base-content" x-text="info?.label"></span>
        </div>

        {{-- The picture stays in view while the settings below it scroll: a click changes it, a double-click edits it. --}}
        <div class="sticky top-0 z-10 mt-3 h-28 w-full overflow-hidden rounded-md bg-base-200">
            <button type="button" class="absolute inset-0 flex items-center justify-center"
                    data-stage25d-picture data-tooltip="{{ __('Click to change, double-click to edit') }}" aria-label="{{ __('Change picture') }}"
                    x-on:click="pickPicture()" x-on:dblclick="editPicture()">
                <template x-if="info?.file && info?.anim">
                    <span class="s25-sheet" :style="`aspect-ratio: ${info.anim.w} / ${info.anim.h}; --cols: ${info.anim.cols}; --rows: ${info.anim.rows}; --row-s: ${info.anim.cols / info.anim.fps}s`">
                        <img :src="info.file" alt="" />
                    </span>
                </template>
                <img x-show="info?.file && !info?.anim" :src="info?.file" alt="" class="max-h-full max-w-full object-contain" />
                <x-lesson.picture-hud />
            </button>
            {{-- The spark: type what to change, ChatGPT on this machine changes it (EditsWithSpark). Local only. --}}
            @if (\App\Services\Local\LocalChatGpt::available())
                <button type="button" class="btn btn-circle btn-xs absolute right-1 top-1" data-stage25d-spark
                        :class="sparkBusy && 'animate-pulse'" :disabled="sparkBusy"
                        :data-tooltip="sparkBusy ? @js(__('ChatGPT is changing this picture')) : @js(__('Change with ChatGPT'))"
                        :aria-label="sparkBusy ? @js(__('ChatGPT is changing this picture')) : @js(__('Change with ChatGPT'))"
                        x-show="info?.file" x-on:click="sparkOpen = !sparkOpen">
                    <x-icons.sparkles class="h-3.5 w-3.5" />
                </button>
                <form class="absolute inset-x-1 bottom-1" x-show="sparkOpen" x-cloak data-stage25d-spark-form x-on:submit.prevent="sendSpark()">
                    <input type="text" class="input input-xs w-full" maxlength="500" x-model="sparkText"
                           x-effect="sparkOpen && requestAnimationFrame(() => $el.focus())"
                           placeholder="{{ __('What should change?') }}" aria-label="{{ __('What should change?') }}"
                           x-on:keydown.escape.stop="sparkOpen = false" />
                </form>
            @endif
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
                            <img :src="m.thumb ?? m.url" x-on:error="$el.src === new URL(m.url, location.href).href || ($el.src = m.url)" alt="" draggable="false" loading="lazy" class="max-h-full max-w-full object-contain" />
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

        {{-- The picture's ink, drawn by the stage's shader: a black line inside its edge, hatching in its shade. --}}
        <div class="mt-1 space-y-1" x-show="info?.ink">
            <x-ui.panel-row :label="__('Outline')">
                <span class="range-panel-knob min-w-0 flex-1">
                    <input type="range" min="0" max="{{ \App\Services\Stage25d\LayerKeys::INK_RANGE['outline'][1] }}" step="0.25" class="range range-panel" data-stage25d-ink="outline"
                           aria-label="{{ __('Outline') }}" :value="info?.ink?.outline" x-on:input="setInk({ outline: Number($event.target.value) })" />
                </span>
                <span class="w-11 shrink-0 text-right text-xs font-medium text-panel-value" x-text="+Number(info?.ink?.outline ?? 0).toFixed(2)"></span>
            </x-ui.panel-row>
            <x-ui.panel-row :label="__('Etched shadow')">
                <span class="range-panel-knob min-w-0 flex-1">
                    <input type="range" min="0" max="1" step="0.05" class="range range-panel" data-stage25d-ink="etch"
                           aria-label="{{ __('Etched shadow') }}" :value="info?.ink?.etch" x-on:input="setInk({ etch: Number($event.target.value) })" />
                </span>
                <span class="w-11 shrink-0 text-right text-xs font-medium text-panel-value" x-text="+Number(info?.ink?.etch ?? 0).toFixed(2)"></span>
            </x-ui.panel-row>
        </div>

        <div class="divider my-2" role="presentation"></div>

        <div class="space-y-1" x-show="info">
            {{-- Figma 2542:1938: one picture per motion, it moves that way on hover. --}}
            <div class="space-y-1" data-stage25d-motion-kinds>
                <span class="block select-none text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Motion') }}</span>
                <x-ui.segmented panel class="w-full" :name="'stage25d-motion-'.$layerId" tab-class="flex-1 px-0" model="motionKind"
                                :options="collect(\App\Services\Stage25d\LayerKeys::MOTION_KINDS)->map(fn ($kind) => [$kind, __(ucfirst($kind)), ['moves' => $kind]])->all()" />
            </div>
            {{-- An animation (VFX): how fast it plays (1 = the sheet's own fps, 0 holds a frame) and where it starts. --}}
            <template x-if="info?.anim">
                <div class="space-y-1" data-stage25d-play>
                    <x-ui.panel-row :label="__('Play speed')">
                        <span class="range-panel-knob min-w-0 flex-1">
                            <input type="range" min="0" max="3" step="0.05" class="range range-panel" data-stage25d-play-field="speed"
                                   aria-label="{{ __('Play speed') }}"
                                   :value="info?.play?.speed" x-on:change="setPlay({ speed: Number($event.target.value) })" />
                        </span>
                        <span class="w-11 shrink-0 text-right text-xs font-medium text-panel-value" x-text="+Number(info?.play?.speed ?? 1).toFixed(2)"></span>
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
                    <span class="range-panel-knob min-w-0 flex-1">
                        <input type="range" min="0" max="3" step="0.05" class="range range-panel" data-stage25d-motion="{{ $prop }}"
                               aria-label="{{ $label }}"
                               :value="info?.motion?.{{ $prop }}" x-on:input="setMotion({ {{ $prop }}: Number($event.target.value) })" />
                    </span>
                    <span class="w-11 shrink-0 text-right text-xs font-medium text-panel-value" x-text="+Number(info?.motion?.{{ $prop }} ?? 0).toFixed(2)"></span>
                </x-ui.panel-row>
                </div>
            @endforeach
        </div>
    @else
        {{-- The stage draws the picture itself; 2D switches this scene back to pictures and panels. --}}
        @if ($scene)
            <x-lesson.scene-mode-tabs :scene="$scene" />
        @endif
        <div class="space-y-1">
            <template x-for="c in look" :key="c.key">
                <label class="flex items-center gap-2" style="min-height: var(--settings-panel-row-h, 2rem)">
                    <span class="w-28 shrink-0 select-none text-xs font-semibold uppercase leading-tight tracking-wide text-panel-label" x-text="names[c.key] ?? c.key"></span>
                    <span class="range-panel-knob min-w-0 flex-1">
                        <input type="range" class="range range-panel" :min="c.min" :max="c.max" :step="c.step"
                               :value="c.value" :aria-label="names[c.key] ?? c.key" :data-stage25d-look="c.key"
                               x-on:input="setLook(c.key, Number($event.target.value))" />
                    </span>
                    <span class="w-11 shrink-0 text-right text-xs font-medium text-panel-value" x-text="+Number(c.value ?? 0).toFixed(2)"></span>
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
                        <label class="input input-xs flex w-24 shrink-0 items-center gap-1 px-1.5" x-show="i > 0">
                            <span class="text-xs text-panel-hint">{{ __('From') }}</span>
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
