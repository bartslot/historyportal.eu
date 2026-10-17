@props([
    /** The object this keys, e.g. "art:231", "text:txt_ab12", "camera". Null draws a marker only. */
    'target' => null,
    /** Which of its properties, e.g. "opacity". Space-separated for a row that is two values at
     *  once: Colour keys "tint tint_opacity" together. Null draws a marker only. */
    'property' => null,
    /** Marker only: an Alpine expression giving 'none' | 'here' | 'elsewhere'. */
    'state' => null,
    /** Marker only: a key on a timeline lane — always filled; `on` (an Alpine expression) rings it
     *  when selected, because a filled diamond cannot fill any further. */
    'solid' => false,
    'on' => null,
])

{{-- The keyframe diamond, ONE component for every place a keyframe is shown: after a property in
     the Format panel, on a property row in the Timeline, and on the timeline's lanes.

     A true square turned 45 degrees: 9px each way inside a 13px box (the file's 9.1 / 12.9,
     rounded to whole pixels so it stays crisp at 1x and 2x), flat, no radius.

     Three states, never colour alone (After Effects' keyframe navigator, Figma's inspector):
       none       outline           the property is not animated
       here       filled            a keyframe sits under the playhead
       elsewhere  outline + dot     animated, with its keys at other moments

     Given a target and a property it is a button: press (or Space/Enter) toggles a keyframe at
     the playhead, through the Timeline tab, which owns the scene's tracks. --}}

@php
    $shape = 'block h-[9px] w-[9px] shrink-0 rotate-45 border';
@endphp

@if ($target && $property)
    <button type="button"
            x-data="{
                target: @js($target),
                properties: @js(preg_split('/\s+/', trim($property))),
                state: 'none',
                sync () {
                    const k = window.__timelineKeying
                    const states = this.properties.map((p) => k?.state?.(this.target, p) ?? 'none')
                    this.state = states.includes('here') ? 'here' : (states.includes('elsewhere') ? 'elsewhere' : 'none')
                },
                toggle () {
                    const k = window.__timelineKeying
                    if (!k) return
                    const removing = this.state === 'here'
                    for (const p of this.properties) {
                        if ((k.state(this.target, p) === 'here') === removing) k.key(this.target, p)
                    }
                    this.sync()
                },
            }"
            x-init="sync()"
            x-on:timeline-changed.window="sync()"
            x-on:click.prevent.stop="toggle()"
            data-keyframe-diamond
            :data-keyframe-state="state"
            :aria-pressed="state === 'here' ? 'true' : 'false'"
            :aria-label="state === 'here' ? @js(__('Remove keyframe')) : @js(__('Add keyframe'))"
            :data-tooltip="state === 'here' ? @js(__('Remove keyframe')) : @js(__('Add keyframe'))"
            {{ $attributes->class(['grid h-[13px] w-[13px] shrink-0 cursor-pointer place-items-center rounded-sm text-panel-label hover:text-base-content focus-visible:outline focus-visible:outline-1 focus-visible:outline-base-content']) }}>
        <span class="{{ $shape }} grid place-items-center border-current"
              :class="state === 'here' && 'border-timeline-mark bg-timeline-mark'">
            <span x-show="state === 'elsewhere'" class="block h-[3px] w-[3px] bg-current"></span>
        </span>
    </button>
@else
    <span {{ $attributes->class(['grid h-[13px] w-[13px] shrink-0 place-items-center text-panel-label']) }} aria-hidden="true">
        @if ($solid)
            <span class="{{ $shape }} border-white bg-white"
                  @if ($on) x-bind:class="({{ $on }}) && 'outline outline-2 outline-offset-2 outline-white'" @endif></span>
        @elseif ($state)
            <span class="{{ $shape }} grid place-items-center border-current"
                  x-bind:class="({{ $state }}) === 'here' && 'border-timeline-mark bg-timeline-mark'">
                <span x-show="({{ $state }}) === 'elsewhere'" class="block h-[3px] w-[3px] bg-current"></span>
            </span>
        @else
            <span class="{{ $shape }} border-current"></span>
        @endif
    </span>
@endif
