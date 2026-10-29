@props(['layer', 'scene'])

@php
    $aid = $layer['asset_id'];
    $isMapScene = in_array($scene->kind, ['map', 'voyage'], true);
    $isPinned = ($layer['anchor'] ?? 'screen') === 'map';
    // A vector arrow: its start is the Position row, its end and shape are the Arrow section, and it
    // has no box, so Size, Scale and Angle do not apply. Its keys live on its own target (properties.js 'arw').
    $isArrow = ($layer['kind'] ?? null) === 'arrow';
    $keyTarget = ($isArrow ? 'arw:' : 'art:').$aid;

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

     * Row labels ARE the file's 8px LABEL_SMALL_UI (`text-xs`), and the label column is the
       file's 49px. An earlier pass rendered them at 11px on the reading that there was one small
       type step; there are two in the file, and at 11px every label sat too heavy and the column
       had to grow 23px to fit.
     * The SIZE row (W/H + aspect lock) is not here. A layer stores ONE uniform `scale`; there is no
       width and the `height` in the whitelist is not read by the renderer. Two number fields
       writing one value, plus a lock over an aspect that cannot change, is three dead controls.
       `SCALE` is that value, and it is a real slider.
     * The diamond after Colour, X, Y, W, H, Scale, Angle, Blur and Opacity keys that property at
       the Timeline's playhead (Bart, 2026-10-16): press to add a keyframe, press on one to remove
       it. Once a property has keys its field shows the value at the playhead and an edit becomes a
       keyframe there (resources/js/ui/keyed-fields.js). See <x-ui.keyframe-diamond>.
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

    {{-- ── Arrow: where it ends, how it bends, how thick its shaft is, how big its head. Its start is
         the Position row in Appearance. Every field is keyed on the arrow's own target, so the timeline
         moves the whole shape (resources/js/anim/properties.js 'arw'). ─────────────────────────── --}}
    @if ($isArrow)
        <x-ui.settings-section :title="__('Arrow')" name="arrow">
            <div class="flex items-center gap-2">
                <span style="width: var(--settings-panel-label-w, 3.0625rem)"
                      class="shrink-0 text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('End') }}</span>
                <x-ui.stepper-field glyph="X" :label="__('End horizontal position')" :min="0" :max="100" :step="1"
                                    :value="$num($val('end_x', 70), 0)" :default="70" :keyframe-target="$keyTarget" keyframe-property="end_x"
                                    :on-input="$live('end_x')" :on-change="$save('end_x')" class="min-w-0 flex-1" />
                <x-ui.stepper-field glyph="Y" :label="__('End vertical position')" :min="0" :max="100" :step="1"
                                    :value="$num($val('end_y', 50), 0)" :default="50" :keyframe-target="$keyTarget" keyframe-property="end_y"
                                    :on-input="$live('end_y')" :on-change="$save('end_y')" class="min-w-0 flex-1" />
            </div>

            <x-ui.slider-row :label="__('Bend')" :min="-0.5" :max="0.5" :step="0.01"
                             keyframe :keyframe-target="$keyTarget" keyframe-property="bend"
                             :value="$val('bend', 0)" :display="$num($val('bend', 0), 2)" :default="0"
                             :on-input="$live('bend')" :on-change="$save('bend')" />

            <x-ui.slider-row :label="__('Width')" :min="0.2" :max="6" :step="0.1"
                             keyframe :keyframe-target="$keyTarget" keyframe-property="shaft"
                             :value="$val('shaft', 1.2)" :display="$num($val('shaft', 1.2), 1)" :default="1.2"
                             :on-input="$live('shaft')" :on-change="$save('shaft')" />

            <x-ui.slider-row :label="__('Head')" :min="1" :max="20" :step="0.1"
                             keyframe :keyframe-target="$keyTarget" keyframe-property="head"
                             :value="$val('head', 5.5)" :display="$num($val('head', 5.5), 1)" :default="5.5"
                             :on-input="$live('head')" :on-change="$save('head')" />

            <div class="flex items-center gap-2">
                <span style="width: var(--settings-panel-label-w, 3.0625rem)"
                      class="shrink-0 text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Style') }}</span>
                <select class="select select-xs w-full" aria-label="{{ __('Arrow style') }}"
                        onchange="updateArtworkLayer({{ $aid }}, 'arrow_style', this.value)">
                    <option value="stroke" @selected($val('arrow_style', 'stroke') === 'stroke')>{{ __('Line') }}</option>
                    <option value="block" @selected($val('arrow_style', 'stroke') === 'block')>{{ __('Block') }}</option>
                </select>
            </div>
        </x-ui.settings-section>
    @endif

    {{-- ── Appearance: colour, where it sits, how big, how turned, how soft ────────────────── --}}
    <x-ui.settings-section :title="__('Appearance')" name="appearance">
        <div class="space-y-2">
            <span class="block text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Colour') }}</span>

            <x-ui.color-field
                :color="$val('tint', '')"
                :opacity="$val('tint_opacity', 1)"
                :color-label="__('Tint colour')"
                :opacity-label="__('Tint strength')"
                :on-color-input="$live('tint')"
                :on-color-change="$save('tint')"
                :on-opacity-input="'window.__setLayerProp?.(' . $aid . ', \'tint_opacity\', $event.target.value / 100)'"
                :on-opacity-change="'updateArtworkLayer(' . $aid . ', \'tint_opacity\', $event.target.value / 100)'"
                :keyframe-target="'art:'.$aid" />

            <button type="button" wire:click="updateArtworkLayer({{ $aid }}, 'tint', '')"
                    class="btn btn-ghost btn-xs w-full text-2xs text-panel-label hover:text-base-content">
                {{ __('No tint') }}
            </button>

            <div class="divider my-0" role="presentation"></div>

            {{-- Position: two fields on one row, X and Y, both stage percentages. --}}
            <div class="flex items-center gap-2">
                <span style="width: var(--settings-panel-label-w, 3.0625rem)"
                      class="shrink-0 text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Position') }}</span>
                <x-ui.stepper-field glyph="X" :label="__('Horizontal position')" :min="0" :max="100" :step="1"
                                    :value="$num($val('x', 50), 0)" :default="50" :keyframe-target="$keyTarget" keyframe-property="x"
                                    :on-input="$live('x')" :on-change="$save('x')" class="min-w-0 flex-1" />
                <x-ui.stepper-field glyph="Y" :label="__('Vertical position')" :min="0" :max="100" :step="1"
                                    :value="$num($val('y', 58), 0)" :default="58" :keyframe-target="$keyTarget" keyframe-property="y"
                                    :on-input="$live('y')" :on-change="$save('y')" class="min-w-0 flex-1" />
            </div>

            @unless ($isArrow)
            <x-ui.size-row :asset-id="$aid" :label="__('Size')"
                           :height="$val('height', 40)" :width="$layer['width'] ?? null" />
            @endunless

            @if (! $isMapScene)
                <x-ui.slider-row :label="__('Depth')" :min="0.4" :max="2.5" :step="0.05"
                                 :value="$val('depth', 1.3)" :display="$num($val('depth', 1.3))" :default="1.3"
                                 :on-input="$live('depth')" :on-change="$save('depth')" />
            @endif

            @unless ($isArrow)
            <x-ui.slider-row :label="__('Scale')" :min="0.2" :max="6" :step="0.05"
                             :keyframe-target="'art:'.$aid" keyframe-property="scale"
                             :value="$val('scale', 1.0)" :display="$pct($val('scale', 1.0))" unit="%" :default="1.0"
                             keyframe
                             :on-input="$live('scale')" :on-change="$save('scale')" />
            @endunless

            {{-- Rotation is a dial, not a slider — an angle has no ends. See <x-ui.angle-row>. --}}
            @unless ($isArrow)
            <x-ui.angle-row :asset-id="$aid" :rotation="$val('rotation', 0)"
                            :flip-x="(bool) $val('flip_x', false)" :flip-y="(bool) $val('flip_y', false)" />
            @endunless

            <x-ui.slider-row :label="__('Blur')" :min="0" :max="2.5" :step="0.1"
                             keyframe :keyframe-target="'art:'.$aid" keyframe-property="blur"
                             :value="$val('blur', 0)" :display="$num($val('blur', 0), 1)" :default="0"
                             :on-input="$live('blur')" :on-change="$save('blur')" />

            {{-- Every keyframe on this layer gone, every property back to what it was. Only while
                 something is animated: a Reset with nothing to reset is noise. --}}
            <div class="flex justify-end" x-data="{ any: false, sync () { this.any = !!window.__timelineKeying?.canResetObject?.('art:{{ $aid }}') } }"
                 x-init="sync()" x-on:timeline-changed.window="sync()" x-show="any" x-cloak>
                <button type="button" data-keyframe-reset-all
                        x-on:click="window.__timelineKeying?.resetObject?.('art:{{ $aid }}'); sync()"
                        class="btn btn-ghost btn-xs rounded-full">
                    <x-icons.arrow-uturn-left class="h-3.5 w-3.5" />
                    {{ __('Reset all') }}
                </button>
            </div>
        </div>
    </x-ui.settings-section>

    {{-- ── Layer: how it mixes with what is behind it, and its colour treatment ────────────── --}}
    <x-ui.settings-section :title="__('Layer')" name="layer">
        <div class="space-y-2">
            <label class="flex items-center justify-between gap-2">
                <span style="width: var(--settings-panel-label-w, 3.0625rem)"
                      class="shrink-0 text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Blend') }}</span>
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

            <x-ui.slider-row :label="__('Opacity')" keyframe
                             :keyframe-target="'art:'.$aid" keyframe-property="opacity"
                             :min="0.05" :max="1" :step="0.05"
                             :value="$val('opacity', 1.0)" :display="$pct($val('opacity', 1.0))" unit="%" :default="1.0"
                             :on-input="$live('opacity')" :on-change="$save('opacity')" />

            {{-- Drop white keys the paper out of a scan, which is what lets an engraving be drained
                 and recoloured to sit with the lesson's palette. --}}
            <x-ui.slider-row :label="__('Drop white')" :min="0" :max="0.5" :step="0.01"
                             :value="$val('white_key', 0)" :display="$pct($val('white_key', 0))" unit="%" :default="0"
                             :on-input="$live('white_key')" :on-change="$save('white_key')" />

            <x-ui.toggle-row :label="__('Grayscale')" :checked="(bool) $val('grayscale', false)"
                             :on-toggle="'window.__setLayerProp?.(' . $aid . ', \'grayscale\', $event.target.checked)'"
                             :on-change="'updateArtworkLayer(' . $aid . ', \'grayscale\', $event.target.checked)'" />
        </div>
    </x-ui.settings-section>

    {{-- ── Motion: ambient life (resources/js/scene/ambient.js) — clouds drift, trees move in the
         breeze, boats bob, birds flutter. The canvas previews every change in place. ────────── --}}
    <x-ui.settings-section :title="__('Motion')" name="motion">
        <div class="space-y-2" x-data="{ amb: @js($val('ambient', 'none')) }">
            <label class="flex items-center justify-between gap-2">
                <span style="width: var(--settings-panel-label-w, 3.0625rem)"
                      class="shrink-0 text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Motion') }}</span>
                <div class="min-w-0 flex-1">
                    <select x-model="amb" x-on:input="{{ $live('ambient') }}" wire:change="{{ $save('ambient') }}"
                            aria-label="{{ __('Motion') }}"
                            style="height: var(--settings-panel-row-h, 2rem)"
                            class="select select-xs w-full text-2xs">
                        @foreach ([
                            'none' => __('None'),
                            'drift' => __('Drift'),
                            'breeze' => __('Breeze'),
                            'bob' => __('Bob'),
                            'flutter' => __('Flutter'),
                            'swell' => __('Sea swell'),
                            'roll' => __('Roll'),
                            'billow' => __('Billow'),
                            'rain' => __('Rain'),
                            'flash' => __('Lightning'),
                            'spray' => __('Spray'),
                            'flicker' => __('Flicker'),
                            'rise' => __('Smoke'),
                            'oars' => __('Oars'),
                        ] as $mv => $ml)
                            <option value="{{ $mv }}" @selected($val('ambient', 'none') === $mv)>{{ $ml }}</option>
                        @endforeach
                    </select>
                </div>
            </label>

            <div x-show="amb !== 'none'" x-cloak class="space-y-2">
                <x-ui.slider-row :label="__('Speed')" :min="0.25" :max="3" :step="0.05"
                                 :value="$val('ambient_speed', 1)" :display="rtrim(rtrim(number_format((float) $val('ambient_speed', 1), 2), '0'), '.')" unit="×" :default="1"
                                 :on-input="$live('ambient_speed')" :on-change="$save('ambient_speed')" />
                <x-ui.slider-row :label="__('Amount')" :min="0" :max="2" :step="0.05"
                                 :value="$val('ambient_amount', 1)" :display="rtrim(rtrim(number_format((float) $val('ambient_amount', 1), 2), '0'), '.')" unit="×" :default="1"
                                 :on-input="$live('ambient_amount')" :on-change="$save('ambient_amount')" />
                {{-- Back to the motion's defaults (speed 1, amount 1); the mode itself stays. --}}
                <div class="flex justify-end">
                    <button type="button" wire:click="resetLayerMotion({{ $aid }})"
                            data-tooltip="{{ __('Speed and amount back to their defaults') }}"
                            class="btn btn-ghost btn-xs rounded-full">
                        <x-icons.arrow-uturn-left class="h-3.5 w-3.5" />
                        {{ __('Reset') }}
                    </button>
                </div>
            </div>

            {{-- A sprite sheet over the picture (LayerFrames, resources/js/scene/layer-frames.js):
                 the sails follow a power-meter moment's wind, or the frames loop. --}}
            @if (! empty($layer['frames']))
                <div class="space-y-2" x-data="{ play: @js($val('frames_play', 'wind')) }" data-layer-frames>
                    <label class="flex items-center justify-between gap-2">
                        <span style="width: var(--settings-panel-label-w, 3.0625rem)"
                              class="shrink-0 text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Frames') }}</span>
                        <div class="min-w-0 flex-1">
                            <select x-model="play" x-on:input="{{ $live('frames_play') }}" wire:change="{{ $save('frames_play') }}"
                                    aria-label="{{ __('Frames') }}" style="height: var(--settings-panel-row-h, 2rem)" class="select select-xs w-full text-2xs">
                                <option value="wind" @selected($val('frames_play', 'wind') === 'wind')>{{ __('Follow the wind') }}</option>
                                <option value="loop" @selected($val('frames_play', 'wind') === 'loop')>{{ __('Loop') }}</option>
                                <option value="off" @selected($val('frames_play', 'wind') === 'off')>{{ __('Off') }}</option>
                            </select>
                        </div>
                    </label>
                    <div x-show="play === 'loop'" x-cloak>
                        <x-ui.slider-row :label="__('Speed')" :min="1" :max="24" :step="1"
                                         :value="$val('frames_fps', 8)" :display="(string) (int) $val('frames_fps', 8)" unit="fps" :default="8"
                                         :on-input="$live('frames_fps')" :on-change="$save('frames_fps')" />
                    </div>
                </div>
            @endif

            {{-- Blend into the scene (resources/js/scene/sit-in-scene.js): a waterline, foam, a
                 reflection, a contact shadow and a colour wash from the backdrop, so a cut-out
                 sits IN the painting. The button sets the preset for a boat or a figure; the
                 four values are under Advanced. Mirror and tilt are the Angle row above. --}}
            @php $sitOn = collect(\App\Services\Support\LayerSitIn::KEYS)->contains(fn ($k) => (float) ($layer[$k] ?? 0) > 0); @endphp
            <div class="divider my-0" role="presentation"></div>
            <div class="flex items-center gap-2" data-sit-in>
                <button type="button" wire:click="blendLayerIntoScene({{ $aid }})"
                        data-tooltip="{{ __('Waterline, reflection, shadow and colour from the backdrop') }}"
                        @class(['btn btn-xs flex-1 rounded-full', 'btn-primary' => ! $sitOn, 'btn-ghost' => $sitOn])>
                    {{ __('Blend into scene') }}
                </button>
                @if ($sitOn)
                    <button type="button" wire:click="resetLayerSitIn({{ $aid }})"
                            data-tooltip="{{ __('Back to the cut-out as it was') }}"
                            class="btn btn-ghost btn-xs rounded-full">
                        <x-icons.arrow-uturn-left class="h-3.5 w-3.5" />
                        {{ __('Reset') }}
                    </button>
                @endif
            </div>
            <details class="collapse collapse-arrow rounded-lg border border-panel-hairline" data-sit-advanced>
                <summary class="collapse-title min-h-0 px-3 py-2 text-2xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Advanced') }}</summary>
                <div class="collapse-content space-y-2 px-3">
                    @foreach ([
                        'waterline' => __('Waterline'),
                        'reflection' => __('Reflection'),
                        'contact_shadow' => __('Shadow'),
                        'color_match' => __('Colour'),
                        'foam' => __('Foam'),
                        'speed' => __('Headway'),
                    ] as $sk => $sl)
                        <x-ui.slider-row :label="$sl" :min="0" :max="1" :step="0.05"
                                         :value="$val($sk, 0)" :display="$pct($val($sk, 0))" unit="%" :default="0"
                                         :on-input="$live($sk)" :on-change="$save($sk)" />
                    @endforeach
                </div>
            </details>

            {{-- Behind what the backdrop draws in front (resources/js/scene/occlusion.js), and the
                 height a figure has where it stands: both from the backdrop's depth map, so only
                 on a backdrop that has one (php artisan art:depth). --}}
            @if (! empty($scene->config['backdrop_depth']))
                @php $occludeOn = ! empty($layer['occlude']); @endphp
                <div class="divider my-0" role="presentation"></div>
                <div class="flex items-center gap-2" data-occlude>
                    <x-ui.toggle-row class="flex-1" :label="__('Behind objects')" :checked="$occludeOn"
                                     :on-toggle="'window.__setLayerProp?.(' . $aid . ', \'occlude\', $event.target.checked ? 1 : 0)'"
                                     :on-change="'setLayerOcclude(' . $aid . ', $event.target.checked)'" />
                    @if ($occludeOn)
                        <button type="button" wire:click="setLayerOcclude({{ $aid }}, false)"
                                data-tooltip="{{ __('In front of everything again') }}"
                                class="btn btn-ghost btn-xs rounded-full">
                            <x-icons.arrow-uturn-left class="h-3.5 w-3.5" />
                            {{ __('Reset') }}
                        </button>
                    @endif
                </div>
                <button type="button" data-fit-spot x-data
                        x-on:click="const fit = await window.__lessonArtworkLayer?.fitHeight?.({{ $aid }}); if (fit) { $wire.fitLayerToSpot({{ $aid }}, fit.height, fit.y); $dispatch('layer-fitted', { assetId: {{ $aid }}, height: fit.height }) }"
                        data-tooltip="{{ __('The height it has standing here, from the horizon of the backdrop') }}"
                        class="btn btn-ghost btn-xs w-full rounded-full">
                    {{ __('Fit to this spot') }}
                </button>
            @endif
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
                      class="shrink-0 text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Backdrop') }}</span>
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
            <p class="mt-1 text-prose leading-snug text-base-content/40">
                {{ $isPinned
                    ? __('Stays on this place as the map pans and zooms.')
                    : __('Sits at a fixed spot on the screen.') }}
            </p>
        </div>
    @endif
</div>
