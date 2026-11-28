@props([
    /** The panel: config.texts[] with kind 'rect' (App\Services\Support\BackingPanel). */
    'panel',
    /** The scene's pictures a panel can crop (\App\Services\Support\BackingPanel::sceneImages), the scene's own first. */
    'images' => [],
])

@php
    $id = (string) ($panel['id'] ?? '');
    $tid = \Illuminate\Support\Js::from($id);
    $side = in_array($panel['side'] ?? null, \App\Services\Support\BackingPanel::SIDES, true) ? $panel['side'] : 'left';
    $size = (float) ($panel['size'] ?? 50);
    $color = (string) ($panel['color'] ?? '#0f172a');
    $opacity = (float) ($panel['opacity'] ?? 0.5);
    $blur = (float) ($panel['blur'] ?? 10);
    $image = \App\Services\Support\BackingPanel::imageUrl($panel['image'] ?? null);
    $focus = \App\Services\Support\SceneSplit::focus($panel['focus'] ?? []) ?? ['x' => 50.0, 'y' => 50.0];
    $zoom = (float) ($focus['zoom'] ?? 1);
    $wash = $panel['wash'] ?? null;
    $sideNames = [
        'full' => __('Full screen'),
        'left' => __('Left half'),
        'right' => __('Right half'),
        'top' => __('Top half'),
        'bottom' => __('Bottom half'),
    ];
    // Each layout as a tile: the stage, with the panel's part filled (the scene's Layout strip, skybox-controls).
    $sideGlyphs = [
        'full' => [1, 1, 40, 22],
        'left' => [1, 1, 20, 22],
        'right' => [21, 1, 20, 22],
        'top' => [1, 1, 40, 11],
        'bottom' => [1, 12, 40, 11],
    ];
    $maskFile = fn (string $m) => $m === 'book' ? 'edge-mask.webp' : "edge-mask-{$m}.webp";
    $maskCss = fn (string $m) => "-webkit-mask: url('/images/paper/{$maskFile($m)}') center / 100% 100% no-repeat; mask: url('/images/paper/{$maskFile($m)}') center / 100% 100% no-repeat;";
    // Presets: one click sets several fields (patchBackingPanel). 'scene' takes the scene's first colour
    // (worked out in the browser from its picture), 'closeup' its first picture.
    $presets = array_values(array_filter([
        ['id' => 'glass', 'label' => __('Night glass'), 'fields' => ['color' => '#0f172a', 'opacity' => 0.8, 'blur' => 10, 'wash' => null, 'image' => null]],
        ['id' => 'paper', 'label' => __('Paper'), 'fields' => ['color' => '#f6f1e7', 'opacity' => 1, 'blur' => 0, 'wash' => 'book', 'image' => null]],
        ['id' => 'scene', 'label' => __('Scene wash'), 'fields' => ['color' => '#8a6d3b', 'opacity' => 0.9, 'blur' => 0, 'wash' => 'blot-005', 'image' => null]],
        ['id' => 'ink', 'label' => __('Ink'), 'fields' => ['color' => '#1d1611', 'opacity' => 0.92, 'blur' => 0, 'wash' => 'blot-011', 'image' => null]],
        ['id' => 'mist', 'label' => __('Light glass'), 'fields' => ['color' => '#ffffff', 'opacity' => 0.25, 'blur' => 14, 'wash' => null, 'image' => null]],
        $images ? ['id' => 'closeup', 'label' => __('Close-up'), 'fields' => ['image' => $images[0], 'focus' => ['x' => 50, 'y' => 40, 'zoom' => 2.5], 'opacity' => 1, 'blur' => 0, 'wash' => 'blot-004']] : null,
    ]));
    $live = fn (string $expr) => "window.__lessonTextLayer?.patch?.({$tid}, {$expr})";
    $num = fn ($v, int $dp = 0) => rtrim(rtrim(number_format((float) $v, $dp, '.', ''), '0'), '.') ?: '0';
@endphp

{{-- A backing panel's inspector (Bart, 2026-11-28): where it sits, like the scene's Layout strip; what
     fills it, a colour, one of the scene's own colours or a zoomed crop of one of its pictures; the
     watercolour edge the scene's picture can have (the Mask tab's shapes); and presets for all of it. --}}
<div data-panel-inspector wire:key="panel-inspector-{{ $id }}"
     x-data="{
        fill: @js($image ? 'image' : 'color'),
        sceneColors: [],
        async init() {
            const read = window.LessonScene?.pictureColors
            if (read) this.sceneColors = await read(@js($images[0] ?? null), 6)
        },
        preset(fields) {
            if (fields.wash === 'blot-005' && fields.image === null && this.sceneColors[0]) fields = { ...fields, color: this.sceneColors[0] }
            {{ $live('fields') }}
            $wire.call('patchBackingPanel', {{ $tid }}, fields)
        },
     }">

    <div class="-mx-4 -mt-4 flex items-center gap-3 px-4 pb-4 pt-5">
        <span class="grid h-[42px] w-[68px] shrink-0 place-items-center rounded-md border border-panel-hairline bg-base-100" aria-hidden="true">
            <svg viewBox="0 0 42 24" width="42" height="24" fill="none" stroke="currentColor" stroke-width="1" class="text-panel-label">
                <rect x="0.5" y="0.5" width="41" height="23" rx="3.5"/>
                @php [$gx, $gy, $gw, $gh] = $sideGlyphs[$side]; @endphp
                <rect x="{{ $gx }}" y="{{ $gy }}" width="{{ $gw }}" height="{{ $gh }}" rx="2.5" fill="currentColor" stroke="none" opacity=".55"/>
            </svg>
        </span>
        <div class="min-w-0 flex-1">
            <h2 class="truncate text-lg font-bold text-base-content">{{ $sideNames[$side] }}</h2>
            <p class="text-prose tracking-wide text-base-content">{{ __('Background panel') }}</p>
        </div>
        <button type="button" wire:click="deleteSceneText(@js($id))"
                wire:confirm="{{ __('Remove this background panel?') }}"
                data-tooltip="{{ __('Remove panel') }}" aria-label="{{ __('Remove panel') }}"
                class="btn btn-ghost btn-sm btn-circle shrink-0 text-base-content/40 hover:text-error">
            <x-icons.trash class="h-4 w-4" />
        </button>
    </div>

    <x-ui.panel-tabs class="mb-1" name="panel-tabs-{{ $id }}" model="'format'"
                     :tabs="[['format', __('Format'), \App\Support\TabIcons::FORMAT]]">
        <x-slot:breadcrumb>
            <x-ui.panel-breadcrumb :label="__('Scene')" wire:click="clearActiveText"
                                   x-on:click="window.__lessonTextLayer?.select?.(null); window.__clearLayerGuard?.()" />
        </x-slot:breadcrumb>
    </x-ui.panel-tabs>

    <div class="-mx-4 -mb-4 text-sm">

        <x-ui.settings-section :title="__('Presets')" name="panel-presets">
            <div class="grid grid-cols-3 gap-x-1.5 gap-y-2" role="group" aria-label="{{ __('Presets') }}">
                @foreach ($presets as $preset)
                    @php $f = $preset['fields']; @endphp
                    <button type="button" data-panel-preset="{{ $preset['id'] }}" aria-label="{{ $preset['label'] }}"
                            x-on:click="preset(@js($f))" class="group flex min-w-0 flex-col items-stretch gap-1">
                        <span class="relative block h-12 overflow-hidden rounded-md ring-1 ring-inset ring-panel-hairline transition group-hover:ring-base-content/40"
                              style="background: url('{{ asset('images/editor/text-style-scene.webp') }}') center / cover">
                            <span class="absolute inset-y-0 left-0 w-3/5 overflow-hidden"
                                  @if ($preset['id'] === 'scene') x-bind:style="sceneColors[0] ? { background: sceneColors[0] } : {}" @endif
                                  style="{{ ! empty($f['image']) ? '' : 'background: '.$f['color'].';' }} opacity: {{ $f['opacity'] }}; {{ ($f['blur'] ?? 0) > 0 ? 'backdrop-filter: blur('.$f['blur'].'px);' : '' }} {{ ! empty($f['wash']) ? $maskCss($f['wash']) : '' }}">
                                @if (! empty($f['image']))
                                    <img src="{{ $f['image'] }}" alt="" class="h-full w-full object-cover" style="transform: scale(2.5); transform-origin: 50% 40%">
                                @endif
                            </span>
                        </span>
                        <span class="truncate text-xs text-panel-label">{{ $preset['label'] }}</span>
                    </button>
                @endforeach
            </div>
        </x-ui.settings-section>

        <x-ui.settings-section :title="__('Layout')" name="panel-layout">
            <div class="space-y-2">
                <div class="flex gap-1 rounded-lg" role="radiogroup" aria-label="{{ __('Layout') }}">
                    @foreach ($sideNames as $sideId => $sideName)
                        @php $isOn = $side === $sideId; [$gx, $gy, $gw, $gh] = $sideGlyphs[$sideId]; @endphp
                        <button type="button" wire:click="updateSceneText({{ $tid }}, 'side', '{{ $sideId }}')"
                                role="radio" aria-checked="{{ $isOn ? 'true' : 'false' }}" aria-label="{{ $sideName }}"
                                data-tooltip="{{ $sideName }}" data-panel-side="{{ $sideId }}"
                                class="grid h-8 min-w-0 flex-1 cursor-pointer place-items-center first:rounded-l-lg last:rounded-r-lg"
                                style="background: var({{ $isOn ? '--color-panel-tile-active' : '--color-panel-tile' }}); color: var({{ $isOn ? '--color-panel-tile-glyph-active' : '--color-panel-tile-glyph' }})">
                            <svg viewBox="0 0 42 24" width="36" height="21" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">
                                <rect x="0.5" y="0.5" width="41" height="23" rx="3.5"/>
                                <rect x="{{ $gx }}" y="{{ $gy }}" width="{{ $gw }}" height="{{ $gh }}" rx="2.5" fill="currentColor" stroke="none" opacity=".55"/>
                            </svg>
                        </button>
                    @endforeach
                </div>
                @if ($side !== 'full')
                    <x-ui.slider-row :label="__('Size')" :min="20" :max="80" :step="1" :display-scale="1"
                                     :value="$size" :display="$num($size)" unit="%" :default="50"
                                     :on-input="$live('{ size: parseFloat($event.target.value) }')"
                                     :on-change="'updateSceneText('.$tid.', \'size\', parseFloat($event.target.value))'" />
                @endif
            </div>
        </x-ui.settings-section>

        <x-ui.settings-section :title="__('Fill')" name="panel-fill">
            <div class="space-y-2">
                <x-ui.segmented panel aria-label="{{ __('Fill') }}" name="panel-fill-{{ $id }}" class="w-full" tab-class="flex-1 !text-xs !font-semibold" model="fill"
                                :options="[['color', __('Colour')], ['image', __('Picture')]]"
                                on-change="fill = $event.target.value; if (fill === 'color') $wire.call('updateSceneText', {{ $tid }}, 'image', null)" />

                <div x-show="fill === 'color'" class="space-y-2">
                    <x-ui.color-field :color="$color" :opacity="$opacity"
                        :color-label="__('Colour')" :opacity-label="__('Opacity')"
                        :on-color-input="$live('{ color: $event.target.value }')"
                        :on-color-change="'updateSceneText('.$tid.', \'color\', $event.target.value)'"
                        :on-opacity-input="$live('{ opacity: $event.target.value / 100 }')"
                        :on-opacity-change="'updateSceneText('.$tid.', \'opacity\', $event.target.value / 100)'" />
                    {{-- The scene's own colours, read from its picture: one click and the panel is in the scene's palette. --}}
                    <div x-show="sceneColors.length" x-cloak class="space-y-1" data-panel-scene-colours>
                        <span class="block text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Scene colours') }}</span>
                        <div class="flex flex-wrap gap-1.5">
                            <template x-for="c in sceneColors" :key="c">
                                <button type="button" class="h-8 w-8 rounded-md ring-1 ring-inset ring-base-content/15 hover:ring-base-content/50"
                                        :style="{ background: c }" :aria-label="c" :data-tooltip="c"
                                        x-on:click="{{ $live('{ color: c }') }}; $wire.call('updateSceneText', {{ $tid }}, 'color', c)"></button>
                            </template>
                        </div>
                    </div>
                </div>

                <div x-show="fill === 'image'" x-cloak class="space-y-2">
                    @if ($images)
                        <div class="grid grid-cols-4 gap-1.5" role="group" aria-label="{{ __('Picture') }}">
                            @foreach ($images as $url)
                                <button type="button" data-panel-image="{{ $url }}" aria-pressed="{{ $image === $url ? 'true' : 'false' }}"
                                        wire:click="patchBackingPanel({{ $tid }}, { image: @js($url), opacity: {{ $image ? $opacity : 1 }} })"
                                        class="h-11 overflow-hidden rounded border bg-base-100 {{ $image === $url ? 'border-primary ring-1 ring-primary' : 'border-panel-border hover:border-base-content/40' }}">
                                    <img src="{{ $url }}" alt="" loading="lazy" class="h-full w-full object-cover">
                                </button>
                            @endforeach
                        </div>
                    @else
                        <p class="text-prose text-panel-hint">{{ __('This scene has no pictures yet.') }}</p>
                    @endif
                    @if ($image)
                        {{-- The crop: zoom in about a point, then move that point (a split panel's Uitsnede). --}}
                        @php $focusJs = fn (string $k) => "{ focus: { x: ".($k === 'x' ? 'parseFloat($event.target.value)' : $focus['x']).", y: ".($k === 'y' ? 'parseFloat($event.target.value)' : $focus['y']).", zoom: ".($k === 'zoom' ? 'parseFloat($event.target.value)' : $zoom)." } }"; @endphp
                        @foreach (['zoom' => [__('Zoom'), 1, 4, 0.05, $zoom, 1], 'x' => [__('Horizontal position'), 0, 100, 1, $focus['x'], 50], 'y' => [__('Vertical position'), 0, 100, 1, $focus['y'], 50]] as $k => [$label, $min, $max, $step, $v, $def])
                            <x-ui.slider-row :label="$label" :min="$min" :max="$max" :step="$step" :display-scale="1"
                                             :value="$v" :display="$k === 'zoom' ? $num($v, 2).'x' : $num($v)" :unit="$k === 'zoom' ? null : '%'" :default="$def"
                                             :on-input="$live($focusJs($k))"
                                             :on-change="'patchBackingPanel('.$tid.', '.$focusJs($k).')'" />
                        @endforeach
                        <x-ui.slider-row :label="__('Opacity')" :min="0.1" :max="1" :step="0.05"
                                         :value="$opacity" :display="$num($opacity * 100)" unit="%" :default="1"
                                         :on-input="$live('{ opacity: parseFloat($event.target.value) }')"
                                         :on-change="'updateSceneText('.$tid.', \'opacity\', parseFloat($event.target.value))'" />
                    @endif
                </div>

                <x-ui.slider-row :label="__('Frosted glass')" :min="0" :max="20" :step="1" :display-scale="1"
                                 :value="$blur" :display="$num($blur)" unit="px" :default="10"
                                 :on-input="$live('{ blur: parseFloat($event.target.value) }')"
                                 :on-change="'updateSceneText('.$tid.', \'blur\', parseFloat($event.target.value))'" />
            </div>
        </x-ui.settings-section>

        {{-- The watercolour edge: the same shapes as the scene picture's Mask tab, with the paper's tooth over the fill. --}}
        <x-ui.settings-section :title="__('Watercolour edge')" name="panel-wash">
            <div class="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="{{ __('Watercolour edge') }}">
                <button type="button" data-panel-wash="none" wire:click="updateSceneText({{ $tid }}, 'wash', null)"
                        role="radio" aria-checked="{{ $wash ? 'false' : 'true' }}" aria-label="{{ __('Straight') }}" data-tooltip="{{ __('Straight') }}"
                        class="h-11 rounded border p-1 {{ $wash ? 'border-panel-border' : 'border-primary ring-1 ring-primary' }}">
                    <span class="block h-full w-full rounded-sm bg-base-content/80"></span>
                </button>
                @foreach (\App\Livewire\Wizard\Step3SceneConfigurator::PAPER_MASKS as $mk)
                    <button type="button" data-panel-wash="{{ $mk }}" wire:click="updateSceneText({{ $tid }}, 'wash', '{{ $mk }}')"
                            role="radio" aria-checked="{{ $wash === $mk ? 'true' : 'false' }}"
                            aria-label="{{ $mk === 'book' ? __('Book') : __('Watercolour :n', ['n' => $loop->index]) }}"
                            data-tooltip="{{ $mk === 'book' ? __('Book') : __('Watercolour :n', ['n' => $loop->index]) }}"
                            class="h-11 rounded border p-1 {{ $wash === $mk ? 'border-primary ring-1 ring-primary' : 'border-panel-border' }}">
                        <span class="block h-full w-full bg-base-content/80" style="{{ $maskCss($mk) }}"></span>
                    </button>
                @endforeach
            </div>
        </x-ui.settings-section>
    </div>
</div>
