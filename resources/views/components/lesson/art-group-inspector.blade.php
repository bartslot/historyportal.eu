@props(['groupId'])

{{-- A group of pictures on a flat scene (Bart 2026-11-28, as in Photoshop; GroupsSceneArtwork, scene/art-groups.js).
     Its name; where it has moved, its size, angle and fade, each keyed like a picture's row; the point it turns and
     grows about; and Ungroup, which leaves every picture where the group put it. Values are read off the canvas at the
     playhead and written back through it (resources/js/editor/art-group-inspector.js). --}}
<div data-art-group-inspector="{{ $groupId }}" x-data="artGroupInspector(@js($groupId))"
     x-on:timeline-changed.window="sync()" x-on:scene-objects-changed.window="sync()" x-on:scene-object-edited.window="$nextTick(() => sync())">
    <div class="-mx-4 -mt-4 flex items-center gap-2 border-b border-panel-hairline px-4 py-3">
        <x-ui.panel-breadcrumb :label="__('Scene')"
                               x-on:click="window.__selectLayer?.(null); (window.__artOverlay?.() ?? window.__lessonArtworkLayer)?.select?.(null); window.__clearLayerGuard?.(); $wire.selectInspectorTarget('')" />
        <x-ui.icon name="layer-group" class="h-4 w-4 shrink-0 text-panel-hint" />
        <span class="min-w-0 flex-1 truncate text-sm font-semibold text-base-content" x-text="name || @js(__('Group :n')).replace(':n', @js(ltrim($groupId, 'g')))"></span>
    </div>

    <div class="mt-3 space-y-1">
        <x-ui.panel-row :label="__('Name')">
            <input type="text" maxlength="40" class="input input-xs w-full" aria-label="{{ __('Name') }}" data-art-group-name
                   :value="name" x-on:change="rename($event.target.value)" />
        </x-ui.panel-row>

        {{-- One diamond per row: each keys the group at the playhead (target grp:<id>). --}}
        @foreach ([['x', __('X'), 0.5, 1, '%'], ['y', __('Y'), 0.5, 1, '%'], ['scale', __('Size'), 1, 100, '%'], ['rotation', __('Angle'), 1, 1, '°'], ['opacity', __('Opacity'), 1, 100, '%']] as [$prop, $label, $step, $factor, $unit])
            <x-ui.panel-row :label="$label" keyframe :keyframe-target="'grp:'.$groupId" :keyframe-property="$prop">
                <label class="input input-xs flex w-full items-center gap-1.5 px-2" style="height: var(--settings-panel-row-h, 2rem)">
                    <input type="number" step="{{ $step }}" aria-label="{{ $label }}"
                           data-art-group-field="{{ $prop }}"
                           data-key-target="grp:{{ $groupId }}" data-key-property="{{ $prop }}" @if ($factor !== 1) data-key-scale="{{ $factor }}" @endif
                           :value="values.{{ $prop }}"
                           x-on:input="preview('{{ $prop }}', $event.target.value, {{ $factor }})"
                           x-on:change="set('{{ $prop }}', $event.target.value, {{ $factor }})"
                           class="w-full min-w-0 border-0 bg-transparent p-0 text-xs outline-none
                                  [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                    <span class="text-xs text-panel-hint">{{ $unit }}</span>
                </label>
            </x-ui.panel-row>
        @endforeach

        {{-- The pivot: the point it turns and grows about. A corner, an edge or the middle of its box; or drag the ring on
             the canvas anywhere. Its pictures never move. --}}
        <x-ui.panel-row :label="__('Pivot point')">
            <div class="grid grid-cols-3 gap-0.5" role="group" aria-label="{{ __('Pivot point') }}" data-art-group-pivot>
                @foreach ([0, 0.5, 1] as $fy)
                    @foreach ([0, 0.5, 1] as $fx)
                        <button type="button" class="grid h-6 w-6 place-items-center rounded-xs hover:bg-base-300"
                                aria-label="{{ __('Pivot point') }} {{ $fx * 100 }}% {{ $fy * 100 }}%"
                                data-pivot-preset="{{ $fx }},{{ $fy }}" x-on:click="pivotTo({{ $fx }}, {{ $fy }})">
                            <span class="block h-2 w-2 rounded-full border border-panel-hint"></span>
                        </button>
                    @endforeach
                @endforeach
            </div>
        </x-ui.panel-row>
    </div>

    <div class="divider my-2" role="presentation"></div>

    <button type="button" class="btn btn-sm w-full" data-art-ungroup
            x-on:click="window.__clearLayerGuard?.(); const b = (window.__artOverlay?.() ?? window.__lessonArtworkLayer)?.host?.getBoundingClientRect(); $wire.ungroupArtwork(@js($groupId), b?.height ? b.width / b.height : null)">
        <x-ui.icon name="layer-group" />
        {{ __('Ungroup') }}
    </button>
</div>
