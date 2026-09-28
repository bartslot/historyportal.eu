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
{{-- The config rides a DATA ATTRIBUTE, and the x-data expression is a CONSTANT string. That is
     load-bearing, and it is not a style choice.

     Spelling the tracks into the x-data expression put server state inside the expression itself,
     so every save rewrote the attribute and Livewire's morph then rebuilt the Alpine component.
     The panel ended up with two of them: the elements the morph PRESERVED (this div's .window
     handlers, the lanes div and its pointerdown) kept listeners closed over the ORIGINAL scope,
     while the rows inside x-for were re-created against the NEW one. Dragging the playhead moved
     the old component's clock; typing a value asked the new component what time it was, got the
     stale answer, and wrote the keyframe back over the one at 0 — so a recorded keyframe silently
     replaced its predecessor instead of joining it.

     A constant expression gives Alpine no reason to re-evaluate x-data, so there is exactly ONE
     component for the life of the panel. Switching scenes still rebuilds it, because that changes
     the dock's wire:key and the element is destroyed outright rather than morphed. --}}
<div data-timeline-config="{{ json_encode([
        'sceneId'   => $scene?->id,
        'sceneKind' => $scene?->kind,
        'duration'  => $duration,
        'alignment' => $alignment,
        'targets'   => $timeline['targets'] ?? [],
        'tracks'    => $timeline['tracks'] ?? [],
        'easingLabels' => [
            'auto'           => __('Automatic'),
            'linear'         => __('Linear'),
            'easeInCubic'    => __('Ease in'),
            'easeOutCubic'   => __('Ease out'),
            'easeInOutCubic' => __('Ease in and out'),
            'easeInBack'     => __('Ease in back'),
            'easeOutBack'    => __('Ease out back'),
            'easeInOutBack'  => __('Ease in and out back'),
            'hold'           => __('Hold'),
        ],
     ]) }}"
     x-data="animationTimeline(JSON.parse($el.dataset.timelineConfig))"
     x-on:pointermove.window="onPointerMove($event)"
     x-on:pointerup.window="onPointerUp()"
     x-on:pointercancel.window="onPointerUp()"
     x-on:keydown.escape.window="onEscape()"
     {{-- Space = play/pause. Bound here, not in init(), because Alpine removes a .window listener
          with the component that declared it. Switching scenes changes the dock's wire:key, so
          Livewire tears this whole panel down and a brand new component is built — measured: four
          switches, five instances. A listener added by hand would outlive every one of them and
          the next press would play and immediately pause. onKeydown() does the deciding: it
          ignores fields, ignores modifiers, and only cancels the page's scroll once it has
          actually taken the key. --}}
     x-on:keydown.window="onKeydown($event)"
     x-on:scene-object-edited.window="recordCanvasEdit($event.detail.target, $event.detail.values)"
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
             as the feature being broken.

             The hint is the app's own tooltip carrying its key cap, exactly as the player's play
             button wears K — never `title` as well, which is what puts two tooltips on screen at
             once. --}}
        {{-- The WRAPPER carries the tooltip, not the button.

             A disabled element dispatches no pointer events, so a tooltip on it can never appear —
             which left a dead play button with no way to learn why. Apple's HIG asks for the
             opposite: show when a command cannot be carried out AND help people understand why.
             The wrapper is always alive, so the reason is reachable in exactly the state that
             needs it. --}}
        <span class="shrink-0"
              :data-tooltip="nothingToPlay && !playing
                  ? @js(__('Set two keyframes on a property to make something move'))
                  : (playing ? @js(__('Pause')) : @js(__('Play')))"
              :data-tooltip-key="nothingToPlay && !playing ? null : @js(__('Space'))">
        <button type="button" x-on:click="playing ? pause() : play()" data-timeline-play
                :disabled="nothingToPlay && !playing"
                class="grid h-7 w-7 cursor-pointer place-items-center rounded text-panel-value
                       hover:text-white disabled:cursor-default disabled:opacity-30"
                aria-keyshortcuts="Space"
                :aria-label="playing ? @js(__('Pause')) : @js(__('Play'))">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true">
                <path x-show="!playing" stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z"/>
                <path x-show="playing" x-cloak stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5"/>
            </svg>
        </button>
        </span>

        {{-- Auto-key. A value change records itself at the playhead; this is the way to stop it.

             A button that stays pressed, not a switch: the HIG reserves the switch style for a
             list row, and asks for an interface icon whose BACKGROUND changes with the state —
             never colour alone. So the diamond fills when recording is live. --}}
        <button type="button" x-on:click="autoKey = !autoKey; remember()" data-timeline-autokey
                :aria-pressed="autoKey ? 'true' : 'false'"
                :class="autoKey ? 'bg-white/10 text-panel-value' : 'text-panel-label'"
                class="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded hover:text-white"
                :data-tooltip="autoKey ? @js(__('Auto-keyframe on')) : @js(__('Auto-keyframe off'))"
                :aria-label="autoKey ? @js(__('Auto-keyframe on')) : @js(__('Auto-keyframe off'))">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 8.5 15.5 12 12 15.5 8.5 12Z" :fill="autoKey ? 'currentColor' : 'none'"/>
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

        {{-- Loop, which is how you watch a two-second build twenty times while tuning it. --}}
        <button type="button" x-on:click="loop = !loop; remember()" data-timeline-loop
                :aria-pressed="loop ? 'true' : 'false'"
                :class="loop ? 'bg-white/10 text-panel-value' : 'text-panel-label'"
                class="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded hover:text-white"
                :data-tooltip="loop ? @js(__('Looping')) : @js(__('Loop'))"
                :aria-label="loop ? @js(__('Looping')) : @js(__('Loop'))">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992V4.356M20.015 9.348a8.25 8.25 0 0 0-14.03-3.028L3 8.25m0 6.402h4.992v4.992M3 14.652a8.25 8.25 0 0 0 14.03 3.028L21 15.75"/>
            </svg>
        </button>

        <span class="h-4 w-px shrink-0 bg-panel-hairline" aria-hidden="true"></span>

        {{-- Collapse every group, or open them all when none is open. One button, because the
             rows themselves say which half of the pair the next press gives you. --}}
        <button type="button" x-on:click="toggleAllGroups()" data-timeline-collapse-all
                :aria-expanded="anyGroupOpen ? 'true' : 'false'"
                class="grid h-7 w-7 shrink-0 cursor-pointer place-items-center rounded text-panel-label hover:text-white"
                :data-tooltip="anyGroupOpen ? @js(__('Collapse all')) : @js(__('Expand all'))"
                :aria-label="anyGroupOpen ? @js(__('Collapse all')) : @js(__('Expand all'))">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6h16.5M3.75 10.5h10.5M3.75 15h6"/>
                <path stroke-linecap="round" stroke-linejoin="round"
                      :d="anyGroupOpen ? 'M15.5 13.5 18.5 16.5 21.5 13.5' : 'M15.5 16.5 18.5 13.5 21.5 16.5'"/>
            </svg>
        </button>

        <span data-timeline-word class="min-w-0 truncate text-2xs italic text-panel-label" x-text="spokenWord"></span>

        {{-- Zoom keeps its place at the trailing edge, as the file draws it, but it is shrink-0 and
             wears no word.

             The dock is only `window − inspector − rail` wide, and a game scene's inspector is
             48rem — so on a narrower screen the row runs out of space and the LAST thing on it is
             the first to be squeezed away. That is how the zoom control disappeared. The word
             readout beside it is the only thing here allowed to shrink. --}}
        <div class="ml-auto flex shrink-0 items-center gap-2">
            {{-- Logarithmic: every step multiplies the zoom, so it is equally gentle at both ends. --}}
            <span class="range-panel-knob" style="width: 88px" :style="{ '--range-t': zoomSlider / 1000 }">
                <input type="range" min="0" max="1000" step="1" :value="zoomSlider"
                       :style="{ '--range-t': zoomSlider / 1000 }"
                       x-on:input="setZoomFromSlider($event.target.value)"
                       aria-label="{{ __('Zoom') }}" data-tooltip="{{ __('Zoom') }}"
                       data-timeline-zoom class="range-panel range range-xs" />
            </span>
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

            {{-- Only when it is TRUE. On a map scene this sat directly under an "Add camera"
                 button, denying what the panel was offering in the same breath. --}}
            <template x-if="!objects.length && !canHaveCamera">
                <div class="px-4 pb-3">
                    <p class="text-2xs text-panel-label">{{ __('Nothing on this scene can be animated yet.') }}</p>
                </div>
            </template>

            <template x-for="object in objects" :key="object.target">
                <div>
                    {{-- "Camera >" — the file puts the chevron at the trailing edge, not before
                         the name, and the icon says which kind of object this is. --}}
                    {{-- The row is a DIV holding two buttons, not one button holding another:
                         the eye is its own command and a button inside a button is not markup a
                         browser will honour. The row's border and height live here so the
                         geometry is unchanged by the split. --}}
                    <div class="flex w-full items-center border-t border-panel-hairline"
                         style="height: 38px">
                    <button type="button" x-on:click="toggleGroup(object.target)"
                            class="flex min-w-0 flex-1 items-center gap-2 px-4 text-left"
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

                    {{-- The eye takes this object off the canvas while you work on the one behind
                         it. A WORKING state — it is never saved, because "hidden while I was
                         positioning the title" must not follow the lesson into a classroom.

                         The icon CHANGES rather than only its colour, which is what the HIG asks
                         for: not everyone can perceive a tint. --}}
                    <button type="button" x-on:click="toggleHidden(object.target)"
                            :data-timeline-eye="object.target"
                            :aria-pressed="isHidden(object.target) ? 'true' : 'false'"
                            :class="isHidden(object.target) ? 'text-panel-label' : 'text-panel-icon'"
                            class="mr-3 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded hover:bg-white/5 hover:text-white"
                            :data-tooltip="isHidden(object.target) ? @js(__('Show')) : @js(__('Hide'))"
                            :aria-label="isHidden(object.target) ? @js(__('Show')) : @js(__('Hide'))">
                        <svg x-show="!isHidden(object.target)" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="1.5" class="h-3.5 w-3.5" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z"/>
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/>
                        </svg>
                        <svg x-show="isHidden(object.target)" x-cloak viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="1.5" class="h-3.5 w-3.5" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243"/>
                        </svg>
                    </button>
                    </div>

                    <template x-for="property in propertiesOf(object.target)" :key="property.key">
                        <label class="flex items-center gap-1.5 pl-2 pr-4" data-scrub-scope
                               x-show="openGroups[object.target]"
                               style="height: var(--timeline-row-pitch)">
                            {{-- The elbow that says this row belongs to the object above it. Drawn
                                 rather than indented, because indentation alone stops reading as
                                 hierarchy the moment two objects are open at once. --}}
                            <span class="mb-2 h-2.5 w-2 shrink-0 rounded-bl-[2px] border-b border-l border-panel-hairline"
                                  aria-hidden="true"></span>
                            <span data-scrub class="shrink-0 cursor-col-resize select-none text-3xs uppercase tracking-wide text-panel-label"
                                  style="width: calc(var(--settings-panel-label-w) - 0.75rem)" x-text="property.label"></span>
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
                                    data-tooltip="{{ __('Previous keyframe') }}"
                                    class="shrink-0 rounded p-0.5 text-panel-label hover:bg-white/5 disabled:opacity-25">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3 w-3" aria-hidden="true">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/>
                                </svg>
                            </button>
                            <button type="button" x-on:click.prevent="toggleKey(object.target, property.key)"
                                    :data-timeline-key="object.target + ':' + property.key"
                                    :aria-pressed="hasKeyHere(object.target, property.key) ? 'true' : 'false'"
                                    :data-tooltip="hasKeyHere(object.target, property.key) ? @js(__('Update keyframe')) : @js(__('Add keyframe'))"
                                    class="shrink-0 rounded p-0.5 hover:bg-white/5">
                                <x-ui.keyframe-diamond on="hasKeyHere(object.target, property.key)" />
                            </button>
                            <button type="button" x-on:click.prevent="jumpKey(object.target, 1)"
                                    :disabled="nextKeyTime(object.target) === null"
                                    :data-timeline-next="object.target"
                                    data-tooltip="{{ __('Next keyframe') }}"
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
        {{-- Figma's split: the RULER scrubs (col-resize says so), the TRACKS select — press a key,
             Shift+press to add, drag across empty track for a marquee, press empty track to
             clear. Cmd/Ctrl+wheel and pinch zoom about the pointer. --}}
        <div x-ref="lanes" data-timeline-lanes class="relative min-w-0 flex-1 overflow-x-auto"
             x-on:wheel="onWheel($event)">
            <div x-ref="content" class="relative select-none" :style="`width: ${Math.max(contentWidth, 100)}px`"
                 x-on:pointerdown="startMarquee($event)">

                {{-- Ruler --}}
                <div class="relative shrink-0 cursor-col-resize select-none" style="height: 38px"
                     data-timeline-ruler x-on:pointerdown="startScrub($event)">
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
                        {{-- The object's own lane: one bar covering everything its properties do,
                             so a collapsed group still says when it moves. --}}
                        <div class="relative" style="height: 38px">
                            {{-- Drag it to move everything this object does; click it to select all
                                 of its keys (Figma selects a layer's keys from its track). --}}
                            <div x-show="objectSpan(object.target)"
                                 class="absolute cursor-grab rounded-[3px]"
                                 :data-timeline-bar-group="object.target"
                                 x-on:pointerdown="startObjectBar($event, object.target)"
                                 :style="barStyle(objectSpan(object.target)) + '; top: 9px; height: var(--timeline-lane-h); background: var(--color-timeline-bar-group)'"></div>
                        </div>
                        <template x-for="property in propertiesOf(object.target)" :key="property.key">
                            <div class="relative" x-show="openGroups[object.target]"
                                 style="height: var(--timeline-row-pitch)">
                                <div class="absolute inset-x-0 top-0 rounded-[2px]"
                                     style="height: var(--timeline-lane-h); background: var(--color-panel-hairline)"
                                     :data-timeline-lane="object.target + ':' + property.key"></div>
                                {{-- The span, drawn BEHIND the diamonds rather than instead of
                                     them: the bar is what you read, the diamonds are what you
                                     drag, and replacing one with the other would have cost the
                                     gestures that are already there. --}}
                                <div x-show="spanOf(object.target, property.key)"
                                     class="pointer-events-none absolute grid place-items-center overflow-hidden rounded-[2px]"
                                     :data-timeline-bar="object.target + ':' + property.key"
                                     :style="barStyle(spanOf(object.target, property.key)) + '; top: 0; height: var(--timeline-lane-h); background: var(--color-timeline-bar)'">
                                    <span class="select-none truncate px-2 text-3xs font-medium text-white/90"
                                          x-text="property.label"></span>
                                </div>
                                {{-- One hit area per stretch between two keys, over the bar. Click:
                                     the Easing menu for that stretch (Figma: "click the line between
                                     two keyframes"). Drag: the whole property's animation moves. --}}
                                <template x-for="segment in segmentsOf(object.target, property.key)" :key="segment.index">
                                    <div class="absolute cursor-grab rounded-[2px] hover:bg-white/10"
                                         :class="isOpenSegment(object.target, property.key, segment.index) && 'bg-white/20'"
                                         :data-timeline-segment="object.target + ':' + property.key + ':' + segment.index"
                                         :data-tooltip="easingLabel(segment.easing)"
                                         :style="barStyle(segment) + '; top: 0; height: var(--timeline-lane-h)'"
                                         x-on:pointerdown="startSegment($event, object.target, property.key, segment.index)"></div>
                                </template>
                                {{-- Click selects (filled), Shift+click adds, drag moves the whole
                                     selection, double-click jumps the playhead here — Figma's
                                     gestures. Delete/Backspace removes what is selected. --}}
                                <template x-for="key in keysOf(object.target, property.key)" :key="key.time">
                                    <span class="absolute grid cursor-grab place-items-center"
                                          :style="`left: ${xOf(key.time) - 6}px; top: 4px`"
                                          :data-timeline-diamond="object.target + ':' + property.key"
                                          :data-key-id="object.target + '|' + property.key + '|' + key.time"
                                          :aria-selected="isSelected(object.target, property.key, key.time) ? 'true' : 'false'"
                                          x-on:pointerdown.stop="startKeyDrag($event, object.target, property.key, key.time)"
                                          x-on:dblclick.stop="jumpToKey(object.target, property.key, key.time)">
                                        <x-ui.keyframe-diamond solid on="isSelected(object.target, property.key, key.time)" />
                                    </span>
                                </template>
                            </div>
                        </template>
                    </div>
                </template>

                {{-- The marquee, while one is being drawn. --}}
                <div x-show="marquee" x-cloak data-timeline-marquee
                     class="pointer-events-none absolute rounded-[2px] border border-white/40 bg-white/10"
                     :style="marquee && `left: ${marquee.x}px; top: ${marquee.y}px; width: ${marquee.w}px; height: ${marquee.h}px`"></div>

                {{-- Playhead: a plain light line, per the house rule that the mark saying "here"
                     needs no accent, no arrowhead and no glow. --}}
                <div class="pointer-events-none absolute inset-y-0 w-px"
                     data-timeline-playhead
                     :style="`left: ${playheadX}px; background: var(--color-timeline-mark)`"></div>
            </div>
        </div>
    </div>

    {{-- The Easing menu for the stretch that was clicked — Figma's presets, each with its curve.
         Fixed to the viewport so the short dock never clips it; Esc and a click outside close it. --}}
    <template x-if="easingMenu">
        <div class="fixed z-50 w-52 rounded-box border border-panel-hairline bg-base-200 p-1 shadow-xl"
             data-timeline-easing-menu
             :style="`top: ${easingMenu.top}px; left: ${easingMenu.left}px`"
             x-on:pointerdown.outside="closeEasing()" x-on:pointerdown.stop>
            <ul class="menu menu-sm w-full p-0">
                <template x-for="option in easingOptions" :key="option.name">
                    <li>
                        <button type="button" class="flex items-center gap-2"
                                :class="currentEasingName === option.name && 'menu-active'"
                                :data-easing="option.name"
                                x-on:click="chooseEasing(option.name)">
                            <svg viewBox="0 0 40 24" class="h-4 w-7 shrink-0 overflow-visible" aria-hidden="true">
                                <path :d="curvePath(option.curve)" fill="none" stroke="currentColor" stroke-width="1.5"
                                      stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            <span class="flex-1 text-left text-xs" x-text="option.label"></span>
                        </button>
                    </li>
                </template>
            </ul>
        </div>
    </template>
</div>
