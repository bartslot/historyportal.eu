@props(['text', 'scene'])

@php
    $id = (string) ($text['id'] ?? '');
    $isPanel = ($text['kind'] ?? null) === 'rect';
    $isGlass = ($text['bg'] ?? 'none') === 'glass';
    // Pinning needs a map under the label — offer it on the two scene kinds that have one.
    $isMapScene = in_array($scene->kind ?? null, ['map', 'voyage'], true);
    $isPinned = ($text['anchor'] ?? 'screen') === 'map';

    // ── A text layer's controls (Figma 1674:4695) ──
    $tid = \Illuminate\Support\Js::from($id);
    $val = fn (string $field, $fallback) => $text[$field] ?? $fallback;
    $pct = fn ($v) => (string) round(((float) $v) * 100);
    $num = function ($v, int $dp = 2): string {
        $s = number_format((float) $v, $dp, '.', '');

        return str_contains($s, '.') ? (rtrim(rtrim($s, '0'), '.') ?: '0') : $s;
    };
    // `input` previews on the canvas, `change` saves the value the teacher settles on. A property
    // with keyframes is saved as a keyframe at the playhead instead (resources/js/ui/keyed-fields.js).
    $live = fn (string $field, string $expr = 'parseFloat($event.target.value)') => "window.__lessonTextLayer?.patch?.({$tid}, { {$field}: {$expr} })";
    $save = fn (string $field, string $expr = '$event.target.value') => "updateSceneText({$tid}, '{$field}', {$expr})";
    $target = 'text:'.$id;
    $title = trim(strtok((string) ($text['text'] ?? ''), "\n")) ?: __('Text');
    // Heroicons geometry: three lines, the short one left, centred or right.
    $alignIcons = [
        'left' => 'M3.75 6.75h16.5M3.75 12h10.5M3.75 17.25h16.5',
        'center' => 'M3.75 6.75h16.5M6.75 12h10.5M3.75 17.25h16.5',
        'right' => 'M3.75 6.75h16.5M9.75 12h10.5M3.75 17.25h16.5',
    ];
    $labelCol = 'style="width: var(--settings-panel-label-w, 7.5rem)" class="shrink-0 text-xs font-semibold uppercase tracking-wide text-panel-label"';
@endphp

@if (! $isPanel)
{{-- A TEXT layer gets the picture layer's inspector shell (Figma `settings-Text Panel`, 1674:4695):
     a title bar, Format | Animate, and the same banded sections built from the same row components
     (settings-section, segmented, color-field, stepper-field, slider-row, toggle-row), with the
     same keyframe diamonds as the timeline.

     Where it leaves the file, on purpose:
     * Grayscale appears once, under Layer. The frame draws it under Typography as well.
     * No H field and no aspect lock: a text box's height is its lines, there is no stored height,
       and two fields writing one value is a dead control. W is the box's wrap width.
     * Size keeps the three steps the file draws; an older text at Extra large shows none selected
       until a step is chosen.
     * "Stays on this place as the map pans and zooms." is a tooltip on Pin to map, not a line of
       prose under it: the editor carries no how-to text.
     * List and Glass background are not in the frame. They are real features of a text and stay,
       List under Typography and Glass under Layer, in the same row style. --}}
<div data-text-inspector x-data="{ tab: 'format' }" wire:key="text-inspector-{{ $id }}">

    <div class="-mx-4 -mt-4 flex items-center gap-3 px-4 pb-4 pt-5">
        <span class="grid h-[42px] w-[68px] shrink-0 place-items-center rounded-md border border-panel-hairline bg-base-100" aria-hidden="true">
            <img src="{{ asset('images/editor/text-layer-glyph.svg') }}" alt="" width="20" height="20" />
        </span>
        <div class="min-w-0 flex-1">
            <h2 class="truncate text-lg font-bold text-base-content">{{ $title }}</h2>
            <p class="text-prose tracking-wide text-base-content">{{ __('Text layer') }}</p>
        </div>
        <button type="button" wire:click="deleteSceneText(@js($id))"
                wire:confirm="{{ __('Remove this text?') }}"
                data-tooltip="{{ __('Remove text') }}" aria-label="{{ __('Remove text') }}"
                class="btn btn-ghost btn-sm btn-circle shrink-0 text-base-content/40 hover:text-error">
            <x-icons.trash class="h-4 w-4" />
        </button>
    </div>

    <x-ui.panel-tabs class="-mx-4 mb-1" name="text-tabs-{{ $id }}"
                     :tabs="[['format', __('Format')], ['animate', __('Animate')]]">
        <x-slot:breadcrumb>
            <x-ui.panel-breadcrumb :label="__('Scene')" wire:click="clearActiveText"
                                   x-on:click="window.__lessonTextLayer?.select?.(null); window.__clearLayerGuard?.()" />
        </x-slot:breadcrumb>
    </x-ui.panel-tabs>

    <div x-show="tab === 'format'" class="-mx-4 -mb-4 text-sm">

        <x-ui.settings-section :title="__('Typography')" name="text-typography">
            <div class="space-y-2">
                <label class="flex items-center justify-between gap-2">
                    <span {!! $labelCol !!}>{{ __('Font type') }}</span>
                    <div class="min-w-0 flex-1">
                        <select wire:change="{{ $save('font') }}" aria-label="{{ __('Font type') }}"
                                style="height: var(--settings-panel-row-h, 2rem)" class="select select-xs w-full text-2xs">
                            @foreach (['sans' => __('Sans'), 'history' => __('History'), 'cinzel' => __('Display')] as $fv => $fl)
                                <option value="{{ $fv }}" @selected($val('font', 'sans') === $fv)>{{ $fl }}</option>
                            @endforeach
                        </select>
                    </div>
                </label>

                <div class="flex items-center gap-2">
                    <span {!! $labelCol !!}>{{ __('Align') }}</span>
                    <x-ui.segmented panel name="text-align-{{ $id }}" :value="$val('align', 'left')"
                                    :options="[['left', __('Left'), $alignIcons['left']], ['center', __('Center'), $alignIcons['center']], ['right', __('Right'), $alignIcons['right']]]"
                                    on-change="$wire.call('updateSceneText', {{ $tid }}, 'align', $event.target.value)" />
                </div>

                <div class="flex items-center gap-2">
                    <span {!! $labelCol !!}>{{ __('Size') }}</span>
                    <x-ui.segmented panel name="text-size-{{ $id }}" class="min-w-0 flex-1" tab-class="flex-1 !text-xs !font-semibold uppercase tracking-wide" :value="$val('size', 'md')"
                                    :options="[['sm', __('Small')], ['md', __('Medium')], ['lg', __('Large')]]"
                                    on-change="$wire.call('updateSceneText', {{ $tid }}, 'size', $event.target.value)" />
                </div>

                <label class="flex items-center justify-between gap-2">
                    <span {!! $labelCol !!}>{{ __('List') }}</span>
                    <div class="min-w-0 flex-1">
                        <select wire:change="{{ $save('list') }}" aria-label="{{ __('List') }}"
                                style="height: var(--settings-panel-row-h, 2rem)" class="select select-xs w-full text-2xs">
                            @foreach (['none' => __('None'), 'bullet' => __('Bullets'), 'number' => __('Numbered')] as $lv => $ll)
                                <option value="{{ $lv }}" @selected($val('list', 'none') === $lv)>{{ $ll }}</option>
                            @endforeach
                        </select>
                    </div>
                </label>
            </div>
        </x-ui.settings-section>

        <x-ui.settings-section :title="__('Appearance')" name="text-appearance">
            <div class="space-y-2">
                <span class="block text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Colour') }}</span>
                <x-ui.color-field
                    :color="$val('color', '#f8fafc')"
                    :opacity="$val('colorOpacity', 1)"
                    :color-label="__('Colour')" :opacity-label="__('Opacity')"
                    :on-color-input="$live('color', '$event.target.value')"
                    :on-color-change="$save('color')"
                    :on-opacity-input="$live('colorOpacity', '$event.target.value / 100')"
                    :on-opacity-change="$save('colorOpacity', '$event.target.value / 100')"
                    :keyframe-target="$target" color-property="color" opacity-property="colorOpacity" />

                <div class="divider my-0" role="presentation"></div>

                @unless ($isPinned)
                    {{-- Two fields share one row, so the label stacks above them: beside them the
                         X and Y fields were left too narrow to show their values. --}}
                    <div class="space-y-1">
                        <span class="block whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Position') }}</span>
                        <div class="flex items-center gap-2">
                            <x-ui.stepper-field glyph="X" :label="__('Horizontal position')" :min="0" :max="100" :step="1"
                                                :value="$num($val('x', 40), 0)" :default="40" :keyframe-target="$target" keyframe-property="x"
                                                :on-input="$live('x')" :on-change="$save('x')" class="min-w-0 flex-1" />
                            <x-ui.stepper-field glyph="Y" :label="__('Vertical position')" :min="0" :max="100" :step="1"
                                                :value="$num($val('y', 40), 0)" :default="40" :keyframe-target="$target" keyframe-property="y"
                                                :on-input="$live('y')" :on-change="$save('y')" class="min-w-0 flex-1" />
                        </div>
                    </div>
                @endunless

                <div class="flex items-center gap-2">
                    <span {!! $labelCol !!}>{{ __('Size') }}</span>
                    {{-- No stored width: the box wraps to its words. The field says so rather than
                         claiming a number nothing uses; typing one fixes the width. --}}
                    <x-ui.stepper-field glyph="W" :label="__('Width')" :min="5" :max="95" :step="1"
                                        :value="isset($text['w']) ? $num($text['w'], 0) : ''" :placeholder="__('Auto')"
                                        :keyframe-target="$target" keyframe-property="w"
                                        :on-input="$live('w')" :on-change="$save('w')" class="min-w-0 flex-1" />
                </div>

                <x-ui.slider-row :label="__('Scale')" :min="0.2" :max="4" :step="0.05" keyframe
                                 :keyframe-target="$target" keyframe-property="scale"
                                 :value="$val('scale', 1)" :display="$pct($val('scale', 1))" unit="%" :default="1"
                                 :on-input="$live('scale')" :on-change="$save('scale')" />

                <x-ui.slider-row :label="__('Rotate')" :min="-180" :max="180" :step="1" keyframe
                                 :keyframe-target="$target" keyframe-property="rotation"
                                 :value="$val('rotation', 0)" :display="$num($val('rotation', 0), 0)" unit="°" :default="0"
                                 :on-input="$live('rotation')" :on-change="$save('rotation')" />

                <x-ui.slider-row :label="__('Blur')" :min="0" :max="2.5" :step="0.1" keyframe
                                 :keyframe-target="$target" keyframe-property="blur"
                                 :value="$val('blur', 0)" :display="$num($val('blur', 0), 1)" :default="0"
                                 :on-input="$live('blur')" :on-change="$save('blur')" />
            </div>
        </x-ui.settings-section>

        <x-ui.settings-section :title="__('Layer')" name="text-layer">
            <div class="space-y-2">
                <label class="flex items-center justify-between gap-2">
                    <span {!! $labelCol !!}>{{ __('Blend') }}</span>
                    <div class="min-w-0 flex-1">
                        <select x-on:input="{{ $live('blend', '$event.target.value') }}" wire:change="{{ $save('blend') }}"
                                aria-label="{{ __('Blend') }}"
                                style="height: var(--settings-panel-row-h, 2rem)" class="select select-xs w-full text-2xs">
                            @foreach (['normal' => __('Normal'), 'multiply' => __('Multiply'), 'screen' => __('Screen'), 'overlay' => __('Overlay'), 'darken' => __('Darken'), 'lighten' => __('Lighten')] as $bv => $bl)
                                <option value="{{ $bv }}" @selected($val('blend', 'normal') === $bv)>{{ $bl }}</option>
                            @endforeach
                        </select>
                    </div>
                </label>

                <x-ui.slider-row :label="__('Opacity')" :min="0.05" :max="1" :step="0.05" keyframe
                                 :keyframe-target="$target" keyframe-property="opacity"
                                 :value="$val('opacity', 1)" :display="$pct($val('opacity', 1))" unit="%" :default="1"
                                 :on-input="$live('opacity')" :on-change="$save('opacity')" />

                <x-ui.toggle-row :label="__('Grayscale')" :checked="(bool) $val('grayscale', false)"
                                 :on-toggle="$live('grayscale', '$event.target.checked')"
                                 :on-change="$save('grayscale', '$event.target.checked')" />

                <x-ui.toggle-row :label="__('Glass background')" :checked="$isGlass"
                                 :on-change="'updateSceneText(' . $tid . ', \'bg\', $event.target.checked)'" />
                @if ($isGlass)
                    <x-ui.color-field
                        :color="$val('bgColor', '#0f172a')" :opacity="$val('bgOpacity', 0.3)"
                        :color-label="__('Glass color')" :opacity-label="__('Opacity')"
                        :on-color-input="$live('bgColor', '$event.target.value')"
                        :on-color-change="$save('bgColor')"
                        :on-opacity-input="$live('bgOpacity', '$event.target.value / 100')"
                        :on-opacity-change="$save('bgOpacity', '$event.target.value / 100')" />
                @endif

                @if ($isMapScene)
                    <div class="divider my-0" role="presentation"></div>
                    <div data-tooltip="{{ $isPinned ? __('Stays on this place as the map pans and zooms.') : __('Sits at a fixed spot on the screen.') }}">
                        <x-ui.toggle-row :label="__('Pin to map')" :checked="$isPinned"
                                         :on-toggle="'window.__lessonTextLayer?.togglePin?.(' . $tid . ')'" />
                    </div>
                @endif
            </div>
        </x-ui.settings-section>
    </div>

    {{-- A text has no entrance of its own: it moves by its keyframes, which live in the timeline. --}}
    <div x-show="tab === 'animate'" x-cloak class="pt-3">
        <button type="button" data-text-show-timeline
                x-on:click="$store.view.script = true; $store.view.showTab('timeline'); window.dispatchEvent(new CustomEvent('scene-object-selected', { detail: { id: @js($id) } }))"
                class="btn btn-sm w-full rounded-full">{{ __('Show in timeline') }}</button>
    </div>
</div>
@else


<div class="space-y-3 text-sm" wire:key="text-inspector-{{ $id }}">
    <button type="button" wire:click="clearActiveText"
            x-on:click="window.__lessonTextLayer?.select?.(null); window.__clearLayerGuard?.()"
            class="inline-flex items-center gap-1 text-xs text-panel-hint transition hover:text-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        {{ __('Scene') }}
    </button>

    @if ($isPanel)
        <div>
            <h3 class="font-semibold text-primary">{{ __('Background panel') }}</h3>
            <p class="mt-1 text-prose leading-tight text-panel-hint">{{ __('A readable backing panel behind the scene text.') }}</p>
        </div>

        <label class="form-control">
            <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Side') }}</span>
            <select class="select select-sm select-bordered mt-1 bg-slate-900"
                    wire:change="updateSceneText(@js($id), 'side', $event.target.value)">
                <option value="left" @selected(($text['side'] ?? 'left') === 'left')>{{ __('Left') }}</option>
                <option value="right" @selected(($text['side'] ?? 'left') === 'right')>{{ __('Right') }}</option>
            </select>
        </label>

        <div class="flex items-center justify-between gap-3">
            <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Color') }}</span>
            {{-- @input patches the canvas overlay instantly while the picker is open;
                 wire:change persists once the teacher commits. --}}
            <input type="color" value="{{ $text['color'] ?? '#0f172a' }}"
                   @input="window.__lessonTextLayer?.patch?.(@js($id), { color: $event.target.value })"
                   wire:change="updateSceneText(@js($id), 'color', $event.target.value)"
                   class="h-8 w-12 cursor-pointer rounded border border-slate-700 bg-slate-900 p-1" />
        </div>

        <x-ui.slider-row :label="__('Opacity')" :min="0.1" :max="0.95" :step="0.05"
                         :value="$text['opacity'] ?? 0.5"
                         :display="rtrim(rtrim(number_format((float) ($text['opacity'] ?? 0.5), 2), '0'), '.')"
                         :on-input="'window.__lessonTextLayer?.patch?.(' . \Illuminate\Support\Js::from($id) . ', { opacity: parseFloat($event.target.value) })'"
                         :on-change="'updateSceneText(' . \Illuminate\Support\Js::from($id) . ', \'opacity\', $event.target.value)'" />
    @endif

    <button type="button" wire:click="deleteSceneText(@js($id))"
            wire:confirm="{{ $isPanel ? __('Remove this background panel?') : __('Remove this text?') }}"
            class="text-xs text-error/80 underline transition hover:text-error">
        {{ $isPanel ? __('Remove panel') : __('Remove text') }}
    </button>
</div>

@endif
