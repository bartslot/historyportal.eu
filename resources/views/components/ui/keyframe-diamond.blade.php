@props([
    /** The object this keys, e.g. "art:231", "text:txt_ab12", "camera". Null leaves it inert. */
    'target' => null,
    /** Which of that object's properties, e.g. "opacity". Null leaves it inert. */
    'property' => null,
    /** Inert marker only: an Alpine expression that fills the diamond when true — a key under the
     *  playhead, or a selected key on a lane. Filled vs outlined, so the state is not colour alone. */
    'on' => null,
    /** Inert marker only: a solid white diamond, for keys on a timeline lane. Selected ones get a
     *  ring, because a filled diamond cannot fill any further. */
    'solid' => false,
])

{{-- The per-property keyframe marker — the small outlined rhombus the file puts after Colour, X,
     Y, W, H and Scale.

     It was drawn and deliberately inert, with a note saying there was no spec yet for what pressing
     one adds or where that keyframe is stored. There is now: the Timeline tab owns the scene's
     tracks, so a diamond given a `target` and a `property` sets or updates that property's key at
     the playhead, and fills in when one is there. Without them it stays a marker, and stays
     unpressable rather than looking pressable and doing nothing.

     Geometry is the file's — a 9.1px square turned 45 degrees inside a 12.9px box. --}}

@if ($target && $property)
    <button type="button"
            x-data="{
                target: @js($target),
                property: @js($property),
                on: false,
                sync () { this.on = !!window.__timelineKeying?.has(this.target, this.property) },
            }"
            x-init="sync()"
            x-on:timeline-changed.window="sync()"
            x-on:click.prevent.stop="window.__timelineKeying?.key(this.target, this.property); sync()"
            :aria-pressed="on ? 'true' : 'false'"
            :data-tooltip="on ? @js(__('Update keyframe')) : @js(__('Add keyframe'))"
            {{ $attributes->class(['flex shrink-0 cursor-pointer items-center justify-center rounded hover:bg-white/5']) }}
            style="width: 12.872px; height: 12.872px">
        <span class="-rotate-45 rounded-[1px] border"
              :class="on ? 'border-timeline-mark bg-timeline-mark' : 'border-panel-label'"
              style="width: 9.102px; height: 9.102px"></span>
    </button>
@else
    <span {{ $attributes->class(['flex shrink-0 items-center justify-center']) }}
          style="width: 12.872px; height: 12.872px" aria-hidden="true">
        @if ($solid)
            <span class="-rotate-45 rounded-[1px] border border-white bg-white"
                  @if ($on) x-bind:class="({{ $on }}) && 'outline-2 outline-offset-2 outline-white'" @endif
                  style="width: 9.102px; height: 9.102px"></span>
        @else
            <span class="-rotate-45 rounded-[1px] border border-panel-label"
                  @if ($on) x-bind:class="({{ $on }}) && 'bg-panel-label'" @endif
                  style="width: 9.102px; height: 9.102px"></span>
        @endif
    </span>
@endif
