@props([
    'scene' => null,
])

@php
    $config    = $scene?->config ?? [];
    $timeline  = $config['timeline'] ?? [];
    $alignment = is_array($scene?->audio_alignment) ? $scene->audio_alignment : [];
    $duration  = (float) ($timeline['duration'] ?? $scene?->duration_seconds ?? 0);
@endphp

{{-- The wizard's Timeline tab (Figma 1417:1999).

     The rows ARE the scene's objects. A camera is an object a map scene HAS, added by the author,
     not an ambient property of every scene — which is why there is an "Add camera" affordance and
     no camera group until one exists.

     The ruler is in SECONDS of narration, not abstract milliseconds, because scenes.audio_alignment
     already gives every spoken word a timestamp. Dragging a keyframe snaps it to a word. --}}
<div x-data="animationTimeline({
        sceneId: @js($scene?->id),
        sceneKind: @js($scene?->kind),
        duration: @js($duration),
        alignment: @js($alignment),
        tracks: @js($timeline['tracks'] ?? []),
     })"
     x-on:pointermove.window="onPointerMove($event)"
     x-on:pointerup.window="onPointerUp()"
     x-on:pointercancel.window="onPointerUp()"
     x-on:keydown.escape.window="onEscape()"
     data-timeline
     class="flex min-h-0 flex-1 flex-col overflow-hidden"
     style="background: var(--color-timeline-ground)">

    {{-- ── Transport ──────────────────────────────────────────────────────────────────────── --}}
    <div class="flex shrink-0 items-center gap-2 px-4"
         style="height: 44px; background: var(--color-timeline-strip)">

        <button type="button" x-on:click="playing ? pause() : play()" data-timeline-play
                class="grid h-7 w-7 place-items-center rounded text-panel-value hover:text-white"
                :aria-label="playing ? @js(__('Pause')) : @js(__('Play'))">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true">
                <path x-show="!playing" stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z"/>
                <path x-show="playing" x-cloak stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5"/>
            </svg>
        </button>

        {{-- Current time, and the WORD being spoken there, which is the readout that means
             something to a teacher. --}}
        <label class="flex items-center gap-1.5" data-scrub-scope>
            <span data-scrub class="cursor-col-resize select-none text-3xs uppercase tracking-wide text-panel-label">{{ __('Time') }}</span>
            <input type="number" min="0" step="0.1" x-bind:max="duration" x-model.number="time"
                   x-on:input="seek(Number($event.target.value))"
                   data-timeline-time
                   class="h-7 w-16 rounded bg-panel-hairline px-1.5 text-right font-mono text-2xs text-panel-value focus:outline-none" />
            <span class="text-3xs text-panel-label">s</span>
        </label>

        <span data-timeline-word class="min-w-0 truncate text-2xs italic text-panel-label" x-text="spokenWord"></span>

        <div class="ml-auto flex items-center gap-2">
            <span class="text-3xs uppercase tracking-wide text-panel-label">{{ __('Zoom') }}</span>
            <input type="range" min="10" max="600" step="1" x-model.number="zoom"
                   data-timeline-zoom class="range-panel range range-xs" style="width: 100px" />
        </div>
    </div>

    {{-- ── Tracks ─────────────────────────────────────────────────────────────────────────── --}}
    <div class="flex min-h-0 flex-1 overflow-y-auto">

        {{-- Left: the object list, which is the same list the Object list panel shows. --}}
        <div class="shrink-0 border-r border-panel-hairline" style="width: var(--timeline-label-col)">

            {{-- Matches the ruler's height on the other side. Without it every lane sits one row
                 below the property it belongs to, and a keyframe on Altitude is drawn beside
                 Heading — which looks like a data bug and is a layout one. --}}
            <div class="shrink-0" style="height: 38px"></div>

            <template x-if="!objects.length">
                <div class="p-4">
                    <p class="text-2xs text-panel-label">{{ __('Nothing on this scene is animated yet.') }}</p>
                    <button type="button" x-show="canHaveCamera" x-on:click="addCamera()" data-timeline-add-camera
                            class="btn btn-xs mt-2 rounded-full">{{ __('Add camera') }}</button>
                </div>
            </template>

            <template x-for="object in objects" :key="object.target">
                <div>
                    <button type="button" x-on:click="openGroups[object.target] = !openGroups[object.target]"
                            class="flex w-full items-center gap-2 border-t border-panel-hairline px-4 text-left"
                            style="height: 38px" :data-timeline-group="object.target">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                             class="h-3 w-3 shrink-0 text-panel-label transition-transform"
                             :class="openGroups[object.target] && 'rotate-90'" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/>
                        </svg>
                        <span class="text-2xs font-semibold text-panel-value" x-text="object.label"></span>
                    </button>

                    <template x-for="property in propertiesOf(object.target)" :key="property.key">
                        <label class="flex items-center gap-2 px-4" data-scrub-scope
                               style="height: var(--timeline-row-pitch)">
                            <span data-scrub class="shrink-0 cursor-col-resize select-none text-3xs uppercase tracking-wide text-panel-label"
                                  style="width: var(--settings-panel-label-w)" x-text="property.label"></span>
                            <input type="number" step="any" data-timeline-value
                                   :value="valueAt(object.target, property.key)"
                                   x-on:change="setValue(object.target, property.key, Number($event.target.value))"
                                   class="h-[21px] min-w-0 flex-1 rounded bg-panel-hairline px-1.5 text-right font-mono text-3xs text-panel-value focus:outline-none" />
                            <button type="button" x-on:click="toggleKey(object.target, property.key)"
                                    :data-timeline-key="object.target + ':' + property.key"
                                    :aria-pressed="hasKeyHere(object.target, property.key)"
                                    :title="hasKeyHere(object.target, property.key) ? @js(__('Remove keyframe')) : @js(__('Add keyframe'))"
                                    class="shrink-0 rounded p-0.5 hover:bg-white/5">
                                <x-ui.keyframe-diamond ::class="hasKeyHere(object.target, property.key) ? 'text-timeline-mark' : ''" />
                            </button>
                        </label>
                    </template>
                </div>
            </template>
        </div>

        {{-- Right: the lanes, and the playhead over them. --}}
        <div x-ref="lanes" data-timeline-lanes class="relative min-w-0 flex-1 overflow-hidden"
             x-on:pointerdown="startScrub($event)">

            {{-- Ruler --}}
            <div class="relative shrink-0 select-none" style="height: 38px">
                <template x-for="t in ticks" :key="t">
                    <span class="absolute top-1.5 text-3xs text-panel-label"
                          :style="`left: ${xOf(t)}px`" x-text="t + 's'"></span>
                </template>
                {{-- Word marks: faint, because they are a place to land, not something to read. --}}
                <template x-for="span in spans" :key="span.start">
                    <span class="absolute bottom-0 w-px bg-panel-label/25" style="height: 6px"
                          :style="`left: ${xOf(span.start)}px; height: 6px`" :title="span.word"></span>
                </template>
            </div>

            <template x-for="object in objects" :key="object.target">
                <div>
                    <div style="height: 38px"></div>
                    <template x-for="property in propertiesOf(object.target)" :key="property.key">
                        <div class="relative" style="height: var(--timeline-row-pitch)">
                            <div class="absolute inset-x-0 top-0 rounded-[2px]"
                                 style="height: var(--timeline-lane-h); background: var(--color-panel-hairline)"
                                 :data-timeline-lane="object.target + ':' + property.key"></div>
                            <template x-for="key in keysOf(object.target, property.key)" :key="key.time">
                                <span class="absolute grid place-items-center"
                                      :style="`left: ${xOf(key.time) - 6}px; top: 4px`"
                                      :data-timeline-diamond="object.target + ':' + property.key"
                                      x-on:pointerdown.stop="startKeyDrag($event, object.target, property.key, key.time)"
                                      x-on:dblclick.stop="removeKeyAt(object.target, property.key, key.time)">
                                    <x-ui.keyframe-diamond class="cursor-grab text-timeline-mark" />
                                </span>
                            </template>
                        </div>
                    </template>
                </div>
            </template>

            {{-- Playhead: a plain light line, per the house rule that the mark saying "here"
                 needs no accent, no arrowhead and no glow. --}}
            <div class="pointer-events-none absolute inset-y-0 w-px"
                 data-timeline-playhead
                 :style="`left: ${playheadX}px; background: var(--color-timeline-mark)`"></div>
        </div>
    </div>
</div>
