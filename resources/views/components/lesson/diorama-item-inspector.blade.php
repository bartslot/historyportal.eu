@props(['itemId'])

{{-- A diorama item's Format panel (Bart, 2026-09-29: the new canvas gave its layers no settings).

     Where it stands on its floor, X across and Z away from the camera, in cells. No Y: nothing leaves
     the floor. No scale: its size IS its depth (resize = Z, never its real height). Every value is
     read off the live stage (window.__diorama) at the playhead and written back through it, so the
     field, the canvas drag and the timeline row share one set of rules: snapped, kept on the floor,
     recorded at the playhead while auto-key is on. The diamonds are the timeline's own. --}}
<div data-diorama-inspector="{{ $itemId }}" x-data="dioramaInspector(@js($itemId))"
     x-on:timeline-changed.window="sync()" x-on:scene-objects-changed.window="sync()">
    <div class="-mx-4 -mt-4 flex items-center gap-2 border-b border-panel-hairline px-4 py-3">
        <x-ui.panel-breadcrumb :label="__('Scene')"
                               x-on:click="window.__diorama?.select(null); window.__clearLayerGuard?.(); $wire.selectInspectorTarget('')" />
        <span class="min-w-0 flex-1 truncate text-sm font-semibold text-base-content" x-text="label"></span>
    </div>

    <p class="mt-3 text-2xs leading-snug text-panel-label" x-show="description" x-text="description"></p>

    <div class="mt-3 space-y-1">
        <x-ui.panel-row :label="__('Height')">
            <span class="text-xs text-panel-value" x-text="heightM ? heightM.toFixed(2) + ' m' : '-'"></span>
        </x-ui.panel-row>

        {{-- Two fields, one diamond each: both key the item's place at the playhead. --}}
        @foreach ([['x', 'X', __('Horizontal position')], ['z', 'Z', __('Depth')]] as [$axis, $glyph, $aria])
            <x-ui.panel-row :label="$loop->first ? __('Position') : null" keyframe
                            :keyframe-target="'dio:'.$itemId" :keyframe-property="$axis">
                <label class="input input-xs flex w-full items-center gap-1.5 px-2" style="height: var(--settings-panel-row-h, 2rem)">
                    <span aria-hidden="true" class="shrink-0 select-none text-3xs font-semibold uppercase tracking-wide text-panel-label">{{ $glyph }}</span>
                    <input type="number" step="0.25" aria-label="{{ $aria }}"
                           data-diorama-field="{{ $axis }}"
                           :value="{{ $axis }}" x-on:change="set({{ $loop->index }}, $event.target.value)"
                           class="w-full min-w-0 border-0 bg-transparent p-0 text-xs outline-none
                                  [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                </label>
            </x-ui.panel-row>
        @endforeach
    </div>

    <div class="divider my-2" role="presentation"></div>

    <button type="button" wire:click="removeDioramaItem(@js($itemId))"
            class="btn btn-ghost btn-xs w-full text-2xs text-panel-label hover:text-error">
        {{ __('Delete') }}
    </button>
</div>
