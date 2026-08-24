@props([
    'scene' => null,
])

@php
    $config    = $scene?->config ?? [];
    $timeline  = $config['timeline'] ?? [];
    $alignment = is_array($scene?->audio_alignment) ? $scene->audio_alignment : [];
    // NOT the narration's length. A game segment runs three minutes and a 180,000ms ruler puts
    // every keyframe in the first few pixels. 8 seconds is a build; the field beside the playhead
    // changes it. (The JS carries the same default — this is the one that reaches the page.)
    $duration = (float) ($timeline['duration'] ?? 8);
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
        targets: @js($timeline['targets'] ?? []),
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
    {{-- The dock is only `window − inspector − rail` wide, and a game scene's inspector is 48rem:
         at 1280px that leaves 336px for four controls, and the zoom slider fell off the end
         entirely. Rather than hide something, the row scrolls — nothing here is ever unreachable,
         and at a normal width there is nothing to scroll. --}}
    <div class="flex shrink-0 items-center gap-2 overflow-x-auto px-4"
         style="height: 44px; background: var(--color-timeline-strip)">

        {{-- Disabled until two keyframes exist, because one keyframe is a position and not a
             movement — and a play button that runs for thirty seconds and changes nothing reads
             as the feature being broken. --}}
        <button type="button" x-on:click="playing ? pause() : play()" data-timeline-play
                :disabled="nothingToPlay && !playing"
                class="grid h-7 w-7 place-items-center rounded text-panel-value hover:text-white disabled:opacity-30"
                :title="nothingToPlay ? @js(__('Set two keyframes on a property to make something move')) : ''"
                :aria-label="playing ? @js(__('Pause')) : @js(__('Play'))">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true">
                <path x-show="!playing" stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z"/>
                <path x-show="playing" x-cloak stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5"/>
            </svg>
        </button>

        {{-- Current time, and the WORD being spoken there, which is the readout that means
             something to a teacher. --}}
        <label class="flex shrink-0 items-center gap-1.5" data-scrub-scope>
            <span data-scrub class="cursor-col-resize select-none text-3xs uppercase tracking-wide text-panel-label">{{ __('Time') }}</span>
            {{-- Bound one way and rounded: x-model showed 10.444200824847092 in a field two
                 digits wide. The model keeps the full precision; the teacher does not need it. --}}
            <input type="number" min="0" step="10" :max="Math.round(duration * 1000)"
                   :value="Math.round(time * 1000)"
                   x-on:change="seek(Number($event.target.value) / 1000)"
                   data-timeline-time
                   class="h-7 w-16 rounded bg-panel-hairline px-1.5 text-right font-mono text-2xs text-panel-value focus:outline-none" />
            <span class="text-3xs text-panel-label">ms</span>
        </label>

        <label class="flex shrink-0 items-center gap-1.5" data-scrub-scope>
            <span data-scrub class="cursor-col-resize select-none text-3xs uppercase tracking-wide text-panel-label">{{ __('Length') }}</span>
            <input type="number" min="100" step="100" :value="Math.round(duration * 1000)"
                   x-on:change="setDuration(Number($event.target.value) / 1000)"
                   data-timeline-duration
                   class="h-7 w-16 rounded bg-panel-hairline px-1.5 text-right font-mono text-2xs text-panel-value focus:outline-none" />
            <span class="text-3xs text-panel-label">ms</span>
        </label>

        <span data-timeline-word class="min-w-0 truncate text-2xs italic text-panel-label" x-text="spokenWord"></span>

        {{-- Zoom keeps its place at the trailing edge, as the file draws it, but it is shrink-0 and
             wears no word.

             The dock is only `window − inspector − rail` wide, and a game scene's inspector is
             48rem — so on a narrower screen the row runs out of space and the LAST thing on it is
             the first to be squeezed away. That is how the zoom control disappeared. The word
             readout beside it is the only thing here allowed to shrink. --}}
        <div class="ml-auto flex shrink-0 items-center gap-2">
            <input type="range" min="2" max="600" step="1" :value="zoom"
                   x-on:input="setZoom($event.target.value)"
                   aria-label="{{ __('Zoom') }}" data-tooltip="{{ __('Zoom') }}"
                   data-timeline-zoom class="range-panel range range-xs" style="width: 88px" />
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

            {{-- Adding a camera is not part of the empty state. It was, and that meant a map scene
                 with a single caption on it could never be given one: the button was inside the
                 "nothing here" branch, which stopped rendering the moment a layer existed. --}}
            <div x-show="canHaveCamera && !hasCamera" class="px-4 py-2">
                <button type="button" x-on:click="addCamera()" data-timeline-add-camera
                        class="btn btn-xs rounded-full">{{ __('Add camera') }}</button>
            </div>

            <template x-if="!objects.length">
                <div class="px-4 pb-3">
                    <p class="text-2xs text-panel-label">{{ __('Nothing on this scene can be animated yet.') }}</p>
                </div>
            </template>

            <template x-for="object in objects" :key="object.target">
                <div>
                    {{-- "Camera >" — the file puts the chevron at the trailing edge, not before
                         the name, and the icon says which kind of object this is. --}}
                    <button type="button" x-on:click="toggleGroup(object.target)"
                            class="flex w-full items-center gap-2 border-t border-panel-hairline px-4 text-left"
                            style="height: 38px" :data-timeline-group="object.target"
                            :aria-expanded="openGroups[object.target] ? 'true' : 'false'">
{{-- A text layer says T; a camera gets Bart's glyph from the file (13x8, stroke 1.33333). --}}
                        <svg x-show="object.kind !== 'camera'" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="1.5" class="h-3 w-3 shrink-0 text-panel-icon" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"/>
                        </svg>
                        <svg x-show="object.kind === 'camera'" width="13" height="8" viewBox="0 0 13 8" fill="none" stroke="currentColor"
                             class="shrink-0 text-panel-icon" aria-hidden="true">
                            <path d="M7.9834 0.666992L8.0918 0.671875C8.59069 0.723453 8.98766 1.12018 9.04004 1.61914L9.0459 1.72754V3.5791L10.0664 2.94043L12.1113 1.65918C12.2007 1.60333 12.2661 1.58345 12.3037 1.5752C12.3089 1.58957 12.3164 1.60809 12.3213 1.63281L12.335 1.7832V6.14551C12.3349 6.24973 12.3175 6.31464 12.3047 6.35059C12.2674 6.34246 12.2025 6.3233 12.1133 6.26758L10.0654 4.98828L9.0459 4.35059V6.20312C9.04312 6.78886 8.56842 7.26242 7.9834 7.26367H1.72852C1.17907 7.26189 0.728515 6.84471 0.672852 6.30957L0.666992 6.20117V1.72852C0.668771 1.17918 1.08513 0.728656 1.62012 0.672852L1.72852 0.666992H7.9834Z" stroke-width="1.33333"/>
                        </svg>
                        <span class="text-2xs font-semibold text-panel-value" x-text="object.label"></span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
                             class="ml-auto h-3 w-3 shrink-0 text-panel-label transition-transform"
                             :class="openGroups[object.target] && 'rotate-90'" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/>
                        </svg>
                    </button>

                    <template x-for="property in propertiesOf(object.target)" :key="property.key">
                        <label class="flex items-center gap-1.5 px-4" data-scrub-scope
                               x-show="openGroups[object.target]"
                               style="height: var(--timeline-row-pitch)">
                            <span data-scrub class="shrink-0 cursor-col-resize select-none text-3xs uppercase tracking-wide text-panel-label"
                                  style="width: var(--settings-panel-label-w)" x-text="property.label"></span>
                            <input type="number" step="any" data-timeline-value
                                   :value="valueAt(object.target, property.key)"
                                   x-on:change="setValue(object.target, property.key, Number($event.target.value))"
                                   class="h-[21px] min-w-0 flex-1 rounded bg-panel-hairline px-1.5 text-right font-mono text-3xs text-panel-value focus:outline-none" />
                            {{-- < diamond > — the diamond keys THIS property at the playhead, the
                                 arrows step the playhead to this object's previous and next
                                 keyframe. Disabled when there is none in that direction, rather
                                 than hidden: a control that moves as you use it is worse than one
                                 that greys out. --}}
                            <button type="button" x-on:click.prevent="jumpKey(object.target, -1)"
                                    :disabled="prevKeyTime(object.target) === null"
                                    :data-timeline-prev="object.target"
                                    title="{{ __('Previous keyframe') }}"
                                    class="shrink-0 rounded p-0.5 text-panel-label hover:bg-white/5 disabled:opacity-25">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/>
                                </svg>
                            </button>
                            <button type="button" x-on:click.prevent="toggleKey(object.target, property.key)"
                                    :data-timeline-key="object.target + ':' + property.key"
                                    :aria-pressed="hasKeyHere(object.target, property.key)"
                                    :title="hasKeyHere(object.target, property.key) ? @js(__('Remove keyframe')) : @js(__('Add keyframe'))"
                                    class="shrink-0 rounded p-0.5 hover:bg-white/5">
                                <x-ui.keyframe-diamond ::class="hasKeyHere(object.target, property.key) ? 'text-timeline-mark' : 'text-panel-label'" />
                            </button>
                            <button type="button" x-on:click.prevent="jumpKey(object.target, 1)"
                                    :disabled="nextKeyTime(object.target) === null"
                                    :data-timeline-next="object.target"
                                    title="{{ __('Next keyframe') }}"
                                    class="shrink-0 rounded p-0.5 text-panel-label hover:bg-white/5 disabled:opacity-25">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/>
                                </svg>
                            </button>
                        </label>
                    </template>
                </div>
            </template>
        </div>

        {{-- Right: the lanes, and the playhead over them.

             The browser does the horizontal scrolling. An earlier pass positioned everything
             against a scrollLeft the component tracked itself, inside overflow-hidden — so zooming
             in past a second or two put the playhead somewhere off to the right with no way to
             reach it, which is what made the zoom control feel broken. --}}
        <div x-ref="lanes" data-timeline-lanes class="relative min-w-0 flex-1 overflow-x-auto"
             x-on:pointerdown="startScrub($event)">
            <div class="relative" :style="`width: ${Math.max(contentWidth, 100)}px`">

                {{-- Ruler --}}
                <div class="relative shrink-0 select-none" style="height: 38px">
                    <template x-for="t in ticks" :key="t">
                        <span class="absolute top-1.5 text-3xs text-panel-label"
                              :style="`left: ${xOf(t)}px`" x-text="Math.round(t * 1000)"></span>
                    </template>
                    {{-- Word marks: faint, because they are somewhere to land, not something to read. --}}
                    <template x-for="span in spans" :key="span.start">
                        <span class="absolute bottom-0 w-px bg-panel-label/25"
                              :style="`left: ${xOf(span.start)}px; height: 6px`" :title="span.word"></span>
                    </template>
                </div>

                <template x-for="object in objects" :key="object.target">
                    <div>
                        <div style="height: 38px"></div>
                        <template x-for="property in propertiesOf(object.target)" :key="property.key">
                            <div class="relative" x-show="openGroups[object.target]"
                                 style="height: var(--timeline-row-pitch)">
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
</div>
