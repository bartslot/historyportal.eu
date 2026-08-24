@props([
    'assetId',
    /** Stored angle, -180..180. */
    'rotation' => 0,
    'flipX' => false,
    'flipY' => false,
])

{{-- Rotation: a dial, a degrees field with a stepper, and the two flips.

     A SLIDER IS THE WRONG SHAPE FOR AN ANGLE. It has two ends and an angle does not — dragging
     past a full turn should come round to zero, which no linear track can do without travelling
     back through the middle. This is the macOS Inspector's control.

     DaisyUI supplies what DaisyUI has: `input` and `join` for the field and its stepper, `btn` for
     the flips. The dial itself has no DaisyUI equivalent, so it is TALL-stack custom — Alpine for
     the pointer maths, which lives in resources/js/ui/angle-dial.js where its wrap and its
     0-360-shown / -180..180-stored conversion are tested.

     Dial, field and stepper are three faces of ONE value: all of them call setDeg. --}}
<div class="space-y-1" wire:key="angle-row-{{ (int) $assetId }}"
     x-data="layerAngleRow({
        assetId: {{ (int) $assetId }},
        rotation: {{ (float) $rotation }},
        flipX: {{ $flipX ? 'true' : 'false' }},
        flipY: {{ $flipY ? 'true' : 'false' }},
     })">

    <div class="flex items-center gap-2">
        <span style="width: var(--settings-panel-label-w, 3.0625rem)"
              class="shrink-0 text-3xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Angle') }}</span>

        {{-- The dial. Pointer position relative to the centre IS the angle, so a drag crosses
             0/360 without any special case. --}}
        <button type="button"
                class="relative shrink-0 cursor-grab touch-none rounded-full bg-base-300 active:cursor-grabbing"
                style="width: var(--settings-panel-row-h, 2rem); height: var(--settings-panel-row-h, 2rem)"
                :aria-valuenow="deg" aria-valuemin="0" aria-valuemax="360" role="slider"
                aria-label="{{ __('Angle') }}"
                x-on:pointerdown.prevent="startDial($event, $el)"
                x-on:pointermove="moveDial($event, $el)"
                x-on:pointerup="endDial($wire)"
                x-on:pointercancel="endDial($wire)"
                x-on:focus="onFocus()"
                x-on:keydown="onKey($event, $wire)">
            <span class="pointer-events-none absolute left-1/2 top-1/2 block h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-base-content"
                  :style="dotStyle()"></span>
        </button>

        {{-- Degrees + stepper. `join` glues them into one control, as the reference does. --}}
        <div class="join min-w-0 flex-1">
            <label class="input input-xs join-item flex min-w-0 flex-1 items-center gap-1 px-2"
                   style="height: var(--settings-panel-row-h, 2rem)">
                {{-- data-scrub: drag this label sideways to change the number. See scrub.js. --}}
                <span data-scrub aria-hidden="true"
                      class="shrink-0 cursor-col-resize select-none text-3xs font-semibold text-panel-label">&deg;</span>
                <input type="number" min="0" max="360" step="1"
                       aria-label="{{ __('Angle') }}" data-default="0"
                       :value="deg"
                       x-on:input="setDeg($event.target.value)"
                       x-on:change="commit($wire)"
                       class="w-full min-w-0 border-0 bg-transparent p-0 text-right text-xs outline-none
                              [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
            </label>
            <div class="join-item flex flex-col justify-center rounded-r-lg border border-l-0 border-panel-hairline">
                @foreach ([['up', 1, __('Increase angle')], ['down', -1, __('Decrease angle')]] as [$dir, $delta, $name])
                    <button type="button" x-on:click="nudge({{ $delta }}, $wire)"
                            aria-label="{{ $name }}"
                            class="flex h-1/2 items-center px-1 text-panel-label transition-colors hover:text-base-content">
                        <x-icons.chevron-down class="h-2.5 w-2.5 {{ $dir === 'up' ? 'rotate-180' : '' }}" />
                    </button>
                @endforeach
            </div>
        </div>
    </div>

    {{-- Rotate and flip: glyphs, no words, in one row — Figma's own alignment controls.

         The two flips used to be the SAME icon mirrored by a CSS transform, so they rendered
         identically and neither said which axis it was. Bart: "come on…". They are distinct
         drawings now, and a quarter-turn button joins them because straightening a dropped icon is
         the common act and dialling 90.0 by hand is the fiddliest thing a dial does. --}}
    <x-ui.panel-row>
        <div class="join">
            <button type="button" x-on:click="rotate90($wire)"
                    data-tooltip="{{ __('Rotate 90°') }}" aria-label="{{ __('Rotate 90°') }}"
                    class="btn btn-ghost btn-xs join-item px-2 text-panel-label hover:text-panel-value">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-3.5 w-3.5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 6.75V3.75l4.5 3-4.5 3v-3H9A5.25 5.25 0 0 0 3.75 12v.75"/>
                    <rect x="9.75" y="13.5" width="10.5" height="6.75" rx="1.25"/>
                </svg>
            </button>

            <button type="button" x-on:click="toggleFlip('x', $wire)"
                    :aria-pressed="flipX ? 'true' : 'false'"
                    :class="flipX ? 'bg-base-300 text-base-content' : 'text-panel-label hover:text-panel-value'"
                    data-tooltip="{{ __('Flip horizontally') }}" aria-label="{{ __('Flip horizontally') }}"
                    class="btn btn-ghost btn-xs join-item px-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-3.5 w-3.5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 2" d="M12 3.75v16.5"/>
                    <path stroke-linejoin="round" d="M9.75 6.75 4.5 12l5.25 5.25V6.75Z"/>
                    <path stroke-linejoin="round" d="M14.25 6.75 19.5 12l-5.25 5.25V6.75Z"/>
                </svg>
            </button>

            <button type="button" x-on:click="toggleFlip('y', $wire)"
                    :aria-pressed="flipY ? 'true' : 'false'"
                    :class="flipY ? 'bg-base-300 text-base-content' : 'text-panel-label hover:text-panel-value'"
                    data-tooltip="{{ __('Flip vertically') }}" aria-label="{{ __('Flip vertically') }}"
                    class="btn btn-ghost btn-xs join-item px-2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-3.5 w-3.5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 2" d="M3.75 12h16.5"/>
                    <path stroke-linejoin="round" d="M6.75 9.75 12 4.5l5.25 5.25H6.75Z"/>
                    <path stroke-linejoin="round" d="M6.75 14.25 12 19.5l5.25-5.25H6.75Z"/>
                </svg>
            </button>
        </div>
    </x-ui.panel-row>
</div>
