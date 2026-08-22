@props(['layer', 'scene'])

@php
    $aid = $layer['asset_id'];
    $slideshowMode = (string) ($scene->config['slideshow_mode'] ?? (($scene->config['parallax'] ?? false) ? 'parallax' : 'standard'));
    $isMapScene = in_array($scene->kind, ['map', 'voyage'], true);
    $isPinned = ($layer['anchor'] ?? 'screen') === 'map';

    // Every control below READS the layer. Restating a default as a literal in the markup is how a
    // panel ends up showing 1.0 for a layer that is actually at 0.4 — the slider looks right and
    // the canvas disagrees, with nothing to catch it.
    $val = fn (string $field, $fallback) => $layer[$field] ?? $fallback;

    /**
     * Trim trailing zeros so 1.00 reads as 1 and 0.40 as 0.4.
     *
     * ONLY PAST A DECIMAL POINT. Trimming '0' off a plain integer eats the digit: the panel showed
     * a layer sitting at x = 50 as "5", and 100 would have read as "1". The old inspector carried
     * the same expression and got away with it because every caller asked for at least one decimal,
     * so there was always a '.' to stop at. The position fields ask for none.
     *
     * The separator arguments are explicit as well — number_format's default groups thousands, and
     * a width of 1000 would arrive as "1,000" in a field that parses back to 1.
     */
    $num = function ($v, int $dp = 2): string {
        $s = number_format((float) $v, $dp, '.', '');

        return str_contains($s, '.') ? (rtrim(rtrim($s, '0'), '.') ?: '0') : $s;
    };
    $pct = fn ($v) => (string) round(((float) $v) * 100);

    // The live-drag hook. `input` moves the canvas locally on every frame; `change` saves the one
    // value the teacher settled on — one round trip instead of hundreds.
    // Every overlay rendering this layer, not just the slideshow stage's. A map scene keeps two
    // alive at once, and the panel used to preview onto the one that was not on screen.
    $live = fn (string $field) => "window.__setLayerProp?.({$aid}, '{$field}', \$event.target.value)";
    $save = fn (string $field) => "updateArtworkLayer({$aid}, '{$field}', \$event.target.value)";
@endphp

{{-- The Maps settings panel (Figma `settings-Maps-panel`, 1470:1877).

     WHAT THIS IS. The format half of the inspector for a selected layer, rebuilt to the Figma
     redesign: a title, banded collapsible sections, and rows that all share one geometry instead of
     the three label widths and two value widths the old panel had accumulated.

     WHERE IT DIVERGES FROM THE FILE, and why, so the next person does not "fix" it back:

     * Row labels ARE the file's 8px LABEL_SMALL_UI (`text-3xs`), and the label column is the
       file's 49px. An earlier pass rendered them at 11px on the reading that there was one small
       type step; there are two in the file, and at 11px every label sat too heavy and the column
       had to grow 23px to fit.
     * The SIZE row (W/H + aspect lock) is not here. A layer stores ONE uniform `scale`; there is no
       width and the `height` in the whitelist is not read by the renderer. Two number fields
       writing one value, plus a lock over an aspect that cannot change, is three dead controls.
       `SCALE` is that value, and it is a real slider.
     * The small outlined diamond after Color, X, Y, W, H and Scale is the per-property keyframe
       marker that feeds the Animate tab. It is DRAWN AND INERT — what pressing one should do is
       not specified yet, and an inert marker is better than a button that does nothing. See
       <x-ui.keyframe-diamond>.
     * `Map style` renders only where a style engine exists. The lesson map deliberately has one
       ground — see the note in resources/js/lesson-map.js, "the five drawn atlases were removed" —
       so on a wizard scene there is nothing for the cards to switch and they stay out.
     * Figma's `row-drop white` is LABELLED "Opacity". The layer name is stale; the words win, so
       Opacity is a row and Drop white keeps its own. --}}
<div class="-mx-4 -mb-4 text-sm" wire:key="map-panel-{{ $aid }}">

    {{-- The title bar is <x-lesson.layer-panel-title>, rendered by the caller ABOVE the tabs: it
         names the thing both Format and Animate are about, so it belongs to neither. --}}

    {{-- ── Map style — only where something can act on the choice ─────────────────────────── --}}
    @if ($isMapScene)
        <div x-data="{ hasStyleEngine: false, style: (window.localStorage.getItem('tm-style') || 'soft-atlas') }"
             x-init="hasStyleEngine = typeof window.__applyMapStyle === 'function'"
             x-show="hasStyleEngine" x-cloak>
            <x-ui.settings-section :title="__('Map style')" name="map-style">
                <x-ui.map-style-picker model="style" />
            </x-ui.settings-section>
        </div>
    @endif

    {{-- ── Appearance: colour, where it sits, how big, how turned, how soft ────────────────── --}}
    <x-ui.settings-section :title="__('Appearance')" name="appearance">
        <div class="space-y-2">
            <span class="block text-3xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Colour') }}</span>

            <x-ui.color-field
                :color="$val('tint', '')"
                :opacity="$val('tint_opacity', 1)"
                :color-label="__('Tint colour')"
                :opacity-label="__('Tint strength')"
                :on-color-input="$live('tint')"
                :on-color-change="$save('tint')"
                :on-opacity-input="'window.__setLayerProp?.(' . $aid . ', \'tint_opacity\', $event.target.value / 100)'"
                :on-opacity-change="'updateArtworkLayer(' . $aid . ', \'tint_opacity\', $event.target.value / 100)'" />

            <button type="button" wire:click="updateArtworkLayer({{ $aid }}, 'tint', '')"
                    class="btn btn-ghost btn-xs w-full text-2xs text-panel-label hover:text-base-content">
                {{ __('No tint') }}
            </button>

            <div class="divider my-0" role="presentation"></div>

            {{-- Position: two fields on one row, X and Y, both stage percentages. --}}
            <div class="flex items-center gap-2">
                <span style="width: var(--settings-panel-label-w, 3.0625rem)"
                      class="shrink-0 text-3xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Position') }}</span>
                <x-ui.stepper-field glyph="X" :label="__('Horizontal position')" :min="0" :max="100" :step="1"
                                    :value="$num($val('x', 50), 0)"
                                    :on-input="$live('x')" :on-change="$save('x')" class="min-w-0 flex-1" />
                <x-ui.stepper-field glyph="Y" :label="__('Vertical position')" :min="0" :max="100" :step="1"
                                    :value="$num($val('y', 58), 0)"
                                    :on-input="$live('y')" :on-change="$save('y')" class="min-w-0 flex-1" />
            </div>

            <x-ui.size-row :asset-id="$aid" :label="__('Size')"
                           :height="$val('height', 40)" :width="$layer['width'] ?? null" />

            @if ($slideshowMode === 'parallax')
                <x-ui.slider-row :label="__('Depth')" :min="0.4" :max="2.5" :step="0.05"
                                 :value="$val('depth', 1.3)" :display="$num($val('depth', 1.3))"
                                 :on-input="$live('depth')" :on-change="$save('depth')" />
            @endif

            {{-- Scale carries the keyframe marker in the file; Rotate and Blur do not. --}}
            <x-ui.slider-row :label="__('Scale')" :min="0.2" :max="6" :step="0.05"
                             :value="$val('scale', 1.0)" :display="$pct($val('scale', 1.0))" unit="%"
                             keyframe
                             :on-input="$live('scale')" :on-change="$save('scale')" />

            {{-- Rotation is a dial, not a slider — an angle has no ends. See <x-ui.angle-row>. --}}
            <x-ui.angle-row :asset-id="$aid" :rotation="$val('rotation', 0)"
                            :flip-x="(bool) $val('flip_x', false)" :flip-y="(bool) $val('flip_y', false)" />

            <x-ui.slider-row :label="__('Blur')" :min="0" :max="2.5" :step="0.1"
                             :value="$val('blur', 0)" :display="$num($val('blur', 0), 1)"
                             :on-input="$live('blur')" :on-change="$save('blur')" />
        </div>
    </x-ui.settings-section>

    {{-- ── Layer: how it mixes with what is behind it, and its colour treatment ────────────── --}}
    <x-ui.settings-section :title="__('Layer')" name="layer">
        <div class="space-y-2">
            <label class="flex items-center justify-between gap-2">
                <span style="width: var(--settings-panel-label-w, 3.0625rem)"
                      class="shrink-0 text-3xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Blend') }}</span>
                {{-- Multiply is the one that earns its keep: it drops the white paper out of an
                     engraving or a scanned map so the artwork sits ON the scene instead of in a box
                     on top of it. The blend applies to the layer's CONTENT, never to this panel. --}}
                <div class="min-w-0 flex-1">
                    <select x-on:input="{{ $live('blend') }}" wire:change="{{ $save('blend') }}"
                            aria-label="{{ __('Blend') }}"
                            style="height: var(--settings-panel-row-h, 2rem)"
                            class="select select-xs w-full text-2xs">
                        @foreach ([
                            'normal' => __('Normal'),
                            'multiply' => __('Multiply'),
                            'screen' => __('Screen'),
                            'overlay' => __('Overlay'),
                            'darken' => __('Darken'),
                            'lighten' => __('Lighten'),
                        ] as $bv => $bl)
                            <option value="{{ $bv }}" @selected(($layer['blend'] ?? 'normal') === $bv)>{{ $bl }}</option>
                        @endforeach
                    </select>
                </div>
            </label>

            <x-ui.slider-row :label="__('Opacity')" :min="0.05" :max="1" :step="0.05"
                             :value="$val('opacity', 1.0)" :display="$pct($val('opacity', 1.0))" unit="%"
                             :on-input="$live('opacity')" :on-change="$save('opacity')" />

            {{-- Drop white keys the paper out of a scan, which is what lets an engraving be drained
                 and recoloured to sit with the lesson's palette. --}}
            <x-ui.slider-row :label="__('Drop white')" :min="0" :max="0.5" :step="0.01"
                             :value="$val('white_key', 0)" :display="$pct($val('white_key', 0))" unit="%"
                             :on-input="$live('white_key')" :on-change="$save('white_key')" />

            <x-ui.toggle-row :label="__('Grayscale')" :checked="(bool) $val('grayscale', false)"
                             :on-toggle="'window.__setLayerProp?.(' . $aid . ', \'grayscale\', $event.target.checked)'"
                             :on-change="'updateArtworkLayer(' . $aid . ', \'grayscale\', $event.target.checked)'" />
        </div>
    </x-ui.settings-section>

    {{-- ── 3D model — how a Sketchfab layer behaves once it is on the slide ───────────────── --}}
    @php
        $embed = $layer['embed'] ?? null;
        $is3d = ($embed['type'] ?? null) === 'sketchfab';
        $eo = array_merge(['interact' => true, 'autospin' => true, 'bg' => 'none'], $embed['opts'] ?? []);
    @endphp
    @if ($is3d)
        <x-ui.settings-section :title="__('3D model')" name="model-3d">
            <div class="space-y-2">
                <x-ui.toggle-row :label="__('Interact')" :checked="(bool) $eo['interact']"
                                 :on-change="'setEmbedOption(' . $aid . ', \'interact\', $event.target.checked)'" />
                <x-ui.toggle-row :label="__('Turn by itself')" :checked="(bool) $eo['autospin']"
                                 :on-change="'setEmbedOption(' . $aid . ', \'autospin\', $event.target.checked)'" />

                <div class="flex items-center gap-2">
                    <span style="width: var(--settings-panel-label-w, 3.0625rem)"
                      class="shrink-0 text-3xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Backdrop') }}</span>
                    <div class="flex min-w-0 flex-1 gap-1">
                        @foreach ([['none', __('None')], ['glass', __('Glass')], ['#0f172a', __('Solid')]] as [$bgVal, $bgLabel])
                            <button type="button" wire:click="setEmbedOption({{ $aid }}, 'bg', '{{ $bgVal }}')"
                                    @class([
                                        'btn btn-xs min-w-0 flex-1 rounded-full text-2xs',
                                        'btn-neutral' => $eo['bg'] === $bgVal,
                                        'btn-ghost text-panel-label' => $eo['bg'] !== $bgVal,
                                    ])>{{ $bgLabel }}</button>
                        @endforeach
                    </div>
                </div>
            </div>
        </x-ui.settings-section>
    @endif

    {{-- ── Ink draw-on — only in Drawing mode ─────────────────────────────────────────────── --}}
    @if ($slideshowMode === 'drawing')
        <x-ui.settings-section :title="__('Ink draw-on')" name="ink">
            <div class="space-y-2">
                <x-ui.slider-row :label="__('Speed')" :min="2" :max="20" :step="0.5"
                                 :value="$val('draw_time', 7)" :display="$num($val('draw_time', 7), 1)" unit="s"
                                 data-tooltip="{{ __('Seconds for the full draw-on') }}"
                                 :on-change="$save('draw_time')" />

                @foreach ([
                    ['ink_preset', __('Pen'), ['production' => __('Production'), 'brush' => __('Brush'), 'sketch' => __('Sketch'), 'liner' => __('Liner'), 'etch' => __('Etch')], 'production'],
                    ['ink_fill', __('Fill'), ['auto' => __('Auto'), 'none' => __('None'), 'wash' => __('Wash'), 'hatch' => __('Hatch'), 'cross' => __('Crosshatch')], 'auto'],
                ] as [$field, $label, $opts, $default])
                    <label class="flex items-center justify-between gap-2">
                        <span style="width: var(--settings-panel-label-w, 3.0625rem)"
                      class="shrink-0 text-3xs font-semibold uppercase tracking-wide text-panel-label">{{ $label }}</span>
                        <div class="relative min-w-0 flex-1">
                            <select wire:change="{{ $save($field) }}" aria-label="{{ $label }}"
                                    style="height: var(--settings-panel-row-h, 2rem)"
                            class="w-full appearance-none rounded-lg border border-panel-hairline bg-base-100 py-0 pl-3 pr-7
                                           text-2xs text-panel-value outline-none focus:border-panel-label">
                                @foreach ($opts as $ov => $ol)
                                    <option value="{{ $ov }}" @selected(($layer[$field] ?? $default) === $ov)>{{ $ol }}</option>
                                @endforeach
                            </select>
                        </div>
                    </label>
                @endforeach
            </div>
        </x-ui.settings-section>
    @endif

    {{-- ── Pin to map ─────────────────────────────────────────────────────────────────────── --}}
    @if ($isMapScene)
        <div class="border-t border-panel-hairline px-4 py-3">
            {{-- The map scene's overlay by its OWN handle first: the shared one can be repointed by
                 a slideshow render, and pinning the wrong overlay's layer would silently do
                 nothing. --}}
            <x-ui.toggle-row :label="__('Pin to map')" :checked="$isPinned"
                             on-toggle="(window.__voyageArtworkLayer || window.__lessonArtworkLayer)?.togglePin?.({{ $aid }})" />

            {{-- The one sentence that survives the no-prose-in-the-editor rule, because it is not
                 how-to: it is what the switch currently MEANS, and it changes when you flip it. --}}
            <p class="mt-1 text-2xs leading-snug text-base-content/40">
                {{ $isPinned
                    ? __('Stays on this place as the map pans and zooms.')
                    : __('Sits at a fixed spot on the screen.') }}
            </p>
        </div>
    @endif
</div>
