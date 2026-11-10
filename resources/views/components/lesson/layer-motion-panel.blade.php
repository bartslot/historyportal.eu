@props(['layer', 'scene'])

@php
    // Same reads and live/save hooks as <x-lesson.settings-map-panel>: this is the half of the old
    // Format panel that is about how the layer moves, so it lives under the Motion tab (Bart, 2026-11-10).
    $aid = $layer['asset_id'];
    $val = fn (string $field, $fallback) => $layer[$field] ?? $fallback;
    $pct = fn ($v) => (string) round(((float) $v) * 100);
    $live = fn (string $field) => "window.__setLayerProp?.({$aid}, '{$field}', \$event.target.value)";
    $save = fn (string $field) => "updateArtworkLayer({$aid}, '{$field}', \$event.target.value)";
@endphp

<div class="-mx-4 -mb-4 text-sm" wire:key="motion-panel-{{ $aid }}">
    {{-- ── Motion: ambient life (resources/js/scene/ambient.js) — clouds drift, trees move in the
         breeze, boats bob, birds flutter. The canvas previews every change in place. ────────── --}}
    <x-ui.settings-section :title="__('Motion')" name="motion">
        <div class="space-y-2" x-data="{ amb: @js($val('ambient', 'none')) }">
            <label class="flex items-center justify-between gap-2">
                <span style="width: var(--settings-panel-label-w, 7.5rem)"
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
                        <span style="width: var(--settings-panel-label-w, 7.5rem)"
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
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1" data-sit-in>
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
            {{-- wire:ignore.self: the 3 s wire:poll morph would drop `open` and fold it shut. --}}
            <details wire:ignore.self class="collapse collapse-arrow rounded-lg border border-panel-hairline" data-sit-advanced>
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
                        {{-- Stacked: inside the Advanced group the label column left these sliders at 52px. --}}
                        <x-ui.slider-row :label="$sl" :min="0" :max="1" :step="0.05" stacked
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
                <div class="flex flex-wrap items-center gap-x-2 gap-y-1" data-occlude>
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
</div>
