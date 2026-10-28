@props(['scene' => null, 'activePanel' => 0])

@php
    $blur           = (float)  ($scene->skybox_blur      ?? 0.5);
    $opacity        = (float)  ($scene->skybox_opacity   ?? 1.0);
    $bgColor        = (string) ($scene->background_color ?? '#000000');
    $view           = (string) ($scene->scene_view       ?? 'skybox');
    $worldStatus    = (string) ($scene->world_labs_status ?? '');
    $worldYOffset   = (float)  ($scene->world_y_offset   ?? 0);
    $worldScale     = (float)  ($scene->world_scale      ?? 1);
    $worldCharScale = (float)  ($scene->world_char_scale ?? 0.53);
    $isGenerating   = $scene->status === 'generating';
    $isUpscaling    = ($scene->upscale_status ?? null) === 'upscaling';
    $isBusy         = $isGenerating;
    $hasSkyboxImage = ! empty($scene->skybox_image_path);
    // Standard or Split (two comic panels). The retired Parallax / Drawing modes read as Standard.
    $split          = \App\Services\Support\SceneSplit::of($scene->config);
    $panelShot      = $split ? (array) (array_values((array) ($scene->shots ?? []))[$activePanel] ?? []) : [];
    $panelFocus     = \App\Services\Support\SceneSplit::focus($panelShot['focus'] ?? []) ?? ['x' => 50.0, 'y' => 50.0];
    $candidates     = $scene->skybox_candidates ?? [];
    // Default image-source tab reflects how the current background was set.
    $bgKind         = $scene->config['background_credit']['kind'] ?? null;
    $srcDefault     = $bgKind === 'painting' ? 'paintings' : 'ai';
    $backgroundFit  = ($scene->config['background_fit'] ?? 'cover') === 'contain' ? 'contain' : 'cover';
    // On a split scene the Image controls show and set the active panel's own picture.
    $backgroundImageUrl = \App\Support\MediaUrl::versioned($split ? ($panelShot['image_path'] ?? null) : $scene->image_path, $scene->updated_at?->timestamp);
    $bgEmbed        = ($scene->config ?? [])['bg_embed'] ?? null;
    $gradient       = ($scene->config ?? [])['background_gradient'] ?? null;
    $bgType         = match (true) {
        ($bgEmbed['kind'] ?? '') === 'sketchfab' => '3d',
        ! empty($bgEmbed['src'])                 => 'video',
        ! empty($backgroundImageUrl)             => 'image',
        is_array($gradient)                      => 'gradient',
        default                                  => 'color',
    };
    // A split panel has its own colour; the scene's is the fallback, and the only one on Standard.
    $fillColor      = (string) ($panelShot['background_color'] ?? $bgColor);
    $gradientDraft  = is_array($gradient) ? $gradient : ['from' => $bgColor, 'to' => '#0f172a', 'angle' => 180];
@endphp

<div class="mt-2 space-y-3"
     x-data="{
        view:         '{{ $view }}',
        blur:         {{ $blur }},
        opacity:      {{ $opacity }},
        bgColor:      '{{ $bgColor }}',
        charYOffset:  {{ $worldYOffset }},
        worldScale:   {{ $worldScale }},
        charScale:    {{ $worldCharScale }},
        emitWorldScale() { window.dispatchEvent(new CustomEvent('lesson:world:scale',  { detail: { scale: Number(this.worldScale) } })); },
        emitCharScale()  { window.dispatchEvent(new CustomEvent('lesson:world:char-scale', { detail: { scale: Number(this.charScale) } })); },
        emitAllWorld()   { this.$nextTick(() => { this.emitCharY(); this.emitWorldScale(); this.emitCharScale(); }); },
        _onMounted: null,
        init() {
            this.$watch('view', v => { if (v === 'world') this.emitAllWorld(); });
            this._onMounted = (e) => {
                if (this.view !== 'world') return
                const d = e.detail
                if (d) {
                    if (d.worldYOffset   !== undefined) this.charYOffset = d.worldYOffset
                    if (d.worldScale     !== undefined) this.worldScale  = d.worldScale
                    if (d.worldCharScale !== undefined) this.charScale   = d.worldCharScale
                }
            };
            window.addEventListener('world:mounted', this._onMounted);
        },
        destroy() {
            if (this._onMounted) window.removeEventListener('world:mounted', this._onMounted);
        },
        emitBlur()    { window.dispatchEvent(new CustomEvent('lesson:skybox:blur',    { detail: { blur:    Number(this.blur)    } })); },
        emitOpacity() { window.dispatchEvent(new CustomEvent('lesson:skybox:opacity', { detail: { opacity: Number(this.opacity) } })); },
        emitBg()      { window.dispatchEvent(new CustomEvent('lesson:skybox:bgcolor', { detail: { color:   String(this.bgColor) } })); },
        emitCharY()   { window.dispatchEvent(new CustomEvent('lesson:world:character-y', { detail: { offset: Number(this.charYOffset) } })); },
     }">

    {{-- ── Upscaling progress banner (local env only) ────────────────────── --}}
    @if ($isUpscaling)
        <div class="flex items-center gap-2 rounded-lg bg-violet-950/60 border border-violet-700/50 px-3 py-2 text-xs text-violet-300">
            <x-icons.spinner class="w-3.5 h-3.5 animate-spin shrink-0 text-violet-400" />
            <span>{{ __('Upscaling with Upscayl… shader will update when done.') }}</span>
        </div>
    @endif

    {{-- ── Scene view — a dropdown (Figma): Slideshow · Panorama · 3D World. Keeps the
         lesson:scene:view dispatch + setSceneView/generateWorld wiring. ─────────────── --}}
    <div class="relative">
        <span class="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-panel-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true">
                <rect x="3" y="6" width="14" height="10" rx="1.5" /><path stroke-linecap="round" d="M20 8v8M17 6.5v11" />
            </svg>
        </span>
        <select x-model="view"
                @change="
                    window.dispatchEvent(new CustomEvent('lesson:scene:view', { detail: {
                        view:     view,
                        imageUrl: {{ json_encode(\App\Support\MediaUrl::of($scene->image_path)) }},
                        sceneId:  {{ $scene->id }},
                        duration: {{ $scene->duration_seconds ?? 10 }},
                    }}));
                    view === 'world'
                        ? $wire.call('generateWorld', $wire.get('selectedSceneId'))
                        : $wire.call('setSceneView', view);
                "
                class="select select-sm select-bordered w-full bg-base-100 pl-9 font-medium text-slate-200">
            <option value="slideshow">{{ __('Slideshow') }}</option>
            <option value="skybox">{{ __('Panorama') }}</option>
            <option value="world">{{ __('3D World') }}</option>
        </select>
    </div>

    {{-- ── Slideshow tab ────────────────────────────────────────────────────── --}}
    <div x-show="view === 'slideshow'" x-cloak class="space-y-2">
        {{-- Layout (Figma 2346:503): one strip of tiles, each a picture of its arrangement, that
             scrolls sideways to more of them. Single is one picture; every other tile splits the
             scene into comic panels. The panel clicked on the stage is the one the controls below
             work on; the dividers drag on the stage, the sliders are the exact fallback. --}}
        @if (\App\Services\Support\SceneSplit::allowedFor($scene->kind))
        @php
            $currentLayout = $split['layout'] ?? 'single';
            $layoutNames = [
                'single' => __('One picture'),
                'rows2' => __('Two rows'),
                'cols2' => __('Two columns'),
                'diag' => __('Diagonal'),
                'l1r2' => __('One left, two right'),
                'rows3' => __('Three rows'),
                'cols3' => __('Three columns'),
                'l2r1' => __('Two left, one right'),
                't1b2' => __('One top, two below'),
                'grid4' => __('Four squares'),
            ];
        @endphp
        <div class="space-y-2" data-split-controls>
            <div class="no-scrollbar flex gap-1 overflow-x-auto rounded-lg" data-drag-scroll role="radiogroup" aria-label="{{ __('Layout') }}">
                @foreach ($layoutNames as $layoutId => $layoutName)
                    @php $isOn = $currentLayout === $layoutId; @endphp
                    <button type="button" wire:click="setSplitLayout('{{ $layoutId }}')"
                            role="radio" aria-checked="{{ $isOn ? 'true' : 'false' }}" aria-label="{{ $layoutName }}"
                            data-tooltip="{{ $layoutName }}" data-split-layout="{{ $layoutId }}"
                            class="grid h-8 w-[54px] shrink-0 cursor-pointer place-items-center first:rounded-l-lg last:rounded-r-lg"
                            style="background: var({{ $isOn ? '--color-panel-tile-active' : '--color-panel-tile' }}); color: var({{ $isOn ? '--color-panel-tile-glyph-active' : '--color-panel-tile-glyph' }})">
                        <svg viewBox="0 0 42 24" width="42" height="24" fill="none" stroke="currentColor" stroke-width="1" aria-hidden="true">
                            <rect x="0.5" y="0.5" width="41" height="23" rx="3.5"/>
                            @if ($layoutId !== 'single')
                                <path d="{{ \App\Services\Support\SceneSplit::glyph($layoutId) }}"/>
                            @endif
                        </svg>
                    </button>
                @endforeach
            </div>
            @if ($split)
                {{-- One slider per divider; a diagonal's two are where its line meets the top and the bottom. --}}
                @foreach ($split['at'] as $k => $at)
                    <x-ui.slider-row :label="$split['layout'] === 'diag' ? ($k === 0 ? __('Top') : __('Bottom')) : (count($split['at']) > 1 ? __('Position').' '.($k + 1) : __('Position'))"
                                     :min="20" :max="80" :step="1"
                                     :value="$at * 100" :display="(string) round($at * 100)" unit="%"
                                     :default="round(\App\Services\Support\SceneSplit::LAYOUTS[$split['layout']]['at'][$k] * 100)"
                                     :on-change="'setSplitAt(' . $k . ', $event.target.value / 100)'" />
                @endforeach
                <span class="block text-2xs font-semibold uppercase tracking-wider text-panel-hint" data-split-panel-label>{{ __('Panel') }} {{ $activePanel + 1 }}</span>
            @endif
        </div>
        @endif

        {{-- Background — how this scene is filled, ONE thing at a time (Keynote model):
             a colour, an image, a gradient, a video or a 3D model. Objects go ON TOP via the Add
             tools, not here. Switching the dropdown only shows that type's controls; nothing is
             replaced until a value is set, so a mis-click never wipes a picture.
             A video background is an iframe (YouTube/Vimeo), never hosted by us, muted and
             looping. A film the class WATCHES is still a Video scene (Add ▸ Video). --}}
        <div data-bg-section x-data="{ bgType: @js($bgType), imgSrc: @js($srcDefault), promptOpen: false }" class="space-y-2">
            <select x-model="bgType" aria-label="{{ __('Background') }}"
                    class="select select-sm select-bordered w-full bg-base-100 font-medium text-slate-200">
                <option value="color">{{ __('Colour') }}</option>
                <option value="image">{{ __('Image') }}</option>
                <option value="gradient">{{ __('Gradient') }}</option>
                <option value="video">{{ __('Video') }}</option>
                <option value="3d">{{ __('3D model') }}</option>
            </select>

            {{-- Colour --}}
            <div x-show="bgType === 'color'" x-cloak class="flex items-center gap-2">
                <input type="color" value="{{ $fillColor }}" aria-label="{{ __('Colour') }}" x-ref="fillColor"
                       @change="$wire.setBackgroundColor($event.target.value)"
                       class="h-8 w-12 cursor-pointer rounded border border-slate-600 bg-transparent" />
                <span class="font-mono text-xs text-panel-hint">{{ $fillColor }}</span>
                {{-- Picking the colour already shown fires no change, so while something else fills
                     the backdrop a button applies it. Never the dropdown itself: a mis-click keeps the picture. --}}
                @if ($bgType !== 'color')
                    <button type="button" class="btn btn-xs ml-auto" data-bg-apply-color
                            @click="$wire.setBackgroundColor($refs.fillColor.value)">{{ __('Use colour') }}</button>
                @endif
            </div>

            {{-- Gradient: two colours and a direction; the swatch previews it before it is saved. --}}
            <div x-show="bgType === 'gradient'" x-cloak x-data="{ g: @js($gradientDraft), save() { $wire.setBackgroundGradient(this.g.from, this.g.to, Number(this.g.angle)) } }" class="space-y-2">
                <div class="h-10 rounded-md ring-1 ring-slate-700" :style="`background: linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`"></div>
                <div class="flex items-center gap-2">
                    <input type="color" x-model="g.from" @change="save()" aria-label="{{ __('From') }}"
                           class="h-8 w-10 cursor-pointer rounded border border-slate-600 bg-transparent" />
                    <input type="color" x-model="g.to" @change="save()" aria-label="{{ __('To') }}"
                           class="h-8 w-10 cursor-pointer rounded border border-slate-600 bg-transparent" />
                    <input type="range" min="0" max="359" step="1" x-model.number="g.angle" @change="save()"
                           aria-label="{{ __('Angle') }}" class="range range-xs flex-1" />
                    <span class="w-10 text-right font-mono text-xs text-panel-hint" x-text="`${g.angle}°`"></span>
                </div>
            </div>

            {{-- Video: a YouTube or Vimeo link, shown in an iframe behind everything. --}}
            <div x-show="bgType === 'video'" x-cloak class="space-y-2" x-data="{ link: '' }">
                <div class="flex gap-1.5">
                    <input type="url" x-model="link" placeholder="https://www.youtube.com/watch?v=…" aria-label="{{ __('Video link') }}"
                           class="input input-xs input-bordered flex-1 bg-slate-900" />
                    <button type="button" @click="if (link.trim()) { $wire.setBackgroundVideo(link); link = '' }"
                            class="btn btn-xs btn-neutral">{{ __('Set') }}</button>
                </div>
                @if ($bgType === 'video')
                    <div class="aspect-video overflow-hidden rounded-lg ring-1 ring-slate-700">
                        <iframe src="{{ $bgEmbed['src'] }}" class="h-full w-full" style="border:0" allow="autoplay; fullscreen" allowfullscreen></iframe>
                    </div>
                    <button type="button" wire:click="clearBgEmbed" class="text-2xs text-error/80 underline hover:text-error">{{ __('Remove video') }}</button>
                @endif
            </div>

          {{-- Image — where the background image comes from: AI, a painting, or a drawing --}}
          <div x-show="bgType === 'image'" x-cloak class="space-y-2">
            {{-- Also a drop target: drag a picture from the desktop onto this card and it becomes the
                 background, whatever the scene already has. A drop on the CANVAS is ambiguous (a
                 scene with a backdrop gets the picture as a layer instead), but pointing at the
                 background slot is not — see updatedDroppedBackground().

                 The counter, rather than a boolean: dragleave fires every time the pointer crosses
                 into a child, so a plain flag flickers off while the file is still over the card.
                 No "drop here" caption — the highlight is the affordance, and the editor carries
                 controls and labels, not instructions. --}}
            <div x-data="{ depth: 0, files: (e) => Array.from(e.dataTransfer?.types ?? []).includes('Files') }"
                 x-on:dragenter.prevent="if (files($event)) depth++"
                 x-on:dragover.prevent="if (files($event)) $event.dataTransfer.dropEffect = 'copy'"
                 x-on:dragleave="depth = Math.max(0, depth - 1)"
                 x-on:drop.prevent="depth = 0; const f = $event.dataTransfer.files[0]; if (f) $wire.upload('droppedBackground', f)"
                 wire:click="openPaintingPicker" role="button" tabindex="0"
                 x-on:keydown.enter.prevent="$wire.openPaintingPicker()"
                 data-tooltip="{{ __('Choose or upload an image') }}"
                 :class="depth > 0 ? 'border-base-content/40 bg-base-content/5' : 'border-slate-700/70 bg-slate-900/40 hover:border-base-content/30'"
                 class="flex cursor-pointer items-center gap-2.5 rounded-lg border p-1.5 transition-colors">
                @if ($backgroundImageUrl)
                    <img src="{{ $backgroundImageUrl }}"
                         class="h-14 w-24 shrink-0 rounded object-cover ring-1 ring-slate-700"
                         alt="{{ __('Current scene background') }}" />
                @else
                    <div class="flex h-14 w-24 shrink-0 items-center justify-center rounded bg-slate-800 text-2xs font-medium uppercase tracking-wider text-panel-hint ring-1 ring-dashed ring-slate-600">
                        {{ __('none') }}
                    </div>
                @endif
                <div class="min-w-0 leading-tight">
                    <span class="block text-2xs font-semibold uppercase tracking-wider text-panel-hint">{{ __('Current image') }}</span>
                    <span class="block truncate text-2xs text-panel-hint">{{ $backgroundImageUrl ? __('Scene background') : __('No background selected') }}</span>
                </div>
            </div>

            {{-- Fit — how the image fills the 16:9 stage. Cover crops the overflow (and anchors a
                 portrait to the top so the face survives); Contain shows the whole work. --}}
            @if ($backgroundImageUrl && ! $split)
                <div x-data="{ fit: @js($backgroundFit) }">
                    <span class="mb-1 block text-2xs font-semibold uppercase tracking-wider text-panel-hint">{{ __('Fit') }}</span>
                    <x-ui.segmented panel name="background-fit" model="fit"
                                    :options="[['cover', __('Fill frame')], ['contain', __('Whole image')]]"
                                    on-change="$wire.call('setBackgroundFit', $event.target.value)" />
                    <p class="mt-1 text-prose leading-tight text-panel-hint" x-show="fit === 'cover'" x-cloak>
                        {{ __('Fills the frame. Portraits are cropped from the top so faces stay in shot.') }}
                    </p>
                    <p class="mt-1 text-prose leading-tight text-panel-hint" x-show="fit === 'contain'" x-cloak>
                        {{ __('Shows the whole picture, with bars where it does not reach the edges.') }}
                    </p>
                </div>
            @endif

            {{-- Split panel: which part of its picture the crop keeps. --}}
            @if ($split && $backgroundImageUrl)
                <div class="space-y-1" data-panel-focus>
                    <span class="block text-2xs font-semibold uppercase tracking-wider text-panel-hint">{{ __('Crop') }}</span>
                    {{-- Each row keys the panel's background on the timeline (bg:<panel>), as a
                         layer's sliders key the layer. --}}
                    <x-ui.slider-row :label="__('Horizontal')" :min="0" :max="100" :step="1"
                                     :value="$panelFocus['x']" :display="(string) round($panelFocus['x'])" unit="%" :display-scale="1" :default="50"
                                     keyframe :keyframe-target="'bg:'.$activePanel" keyframe-property="x"
                                     on-change="setPanelFocus('x', $event.target.value)" />
                    <x-ui.slider-row :label="__('Vertical')" :min="0" :max="100" :step="1"
                                     :value="$panelFocus['y']" :display="(string) round($panelFocus['y'])" unit="%" :display-scale="1" :default="50"
                                     keyframe :keyframe-target="'bg:'.$activePanel" keyframe-property="y"
                                     on-change="setPanelFocus('y', $event.target.value)" />
                    {{-- The wheel over the pane on the stage sets the same zoom: a factor, as the
                         timeline row has it, shown as a percentage. --}}
                    <x-ui.slider-row :label="__('Zoom')" :min="1" :max="4" :step="0.05"
                                     :value="$panelFocus['zoom'] ?? 1" :display="(string) round(($panelFocus['zoom'] ?? 1) * 100)" unit="%" :default="1"
                                     keyframe :keyframe-target="'bg:'.$activePanel" keyframe-property="zoom"
                                     on-change="setPanelFocus('zoom', $event.target.value)" />
                </div>
            @endif

            {{-- Reuse an image already in THIS lesson — a single-row carousel (latest first), arrows to
                 scroll. Clicking sets it as this scene's background (local paths reused; external
                 URLs downloaded once). Mirrors the Poster picker's "pick from the lesson" idea. --}}
            @php $reuseImages = array_reverse($scene->lesson?->posterCandidates() ?? []); @endphp
            @if (count($reuseImages))
                <x-lesson.picture-strip :images="$reuseImages" select="useLessonImageBackground" :current="$backgroundImageUrl" :label="__('Reuse from this lesson')" />
            @endif

            <x-ui.segmented panel name="image-source" model="imgSrc"
                            :options="[['ai', __('AI Gen')], ['paintings', __('Paintings')]]" />

            {{-- AI generated — Regenerate / Edit prompt (Figma item 5) --}}
            <div x-show="imgSrc === 'ai'" x-cloak class="space-y-2">
                <span class="block text-2xs font-medium text-slate-300">{{ __('AI Generated image') }}</span>
                <div class="flex flex-col gap-1.5">
                    <button type="button"
                            wire:click="regenerate({{ $scene->id }}, 'image')"
                            wire:loading.attr="disabled" wire:target="regenerate"
                            @disabled($isBusy)
                            class="inline-flex items-center gap-1.5 text-xs text-slate-300 transition hover:text-base-content disabled:opacity-50">
                        @if ($isGenerating)
                            <x-icons.spinner class="h-3.5 w-3.5 animate-spin" /><span>{{ __('Generating…') }}</span>
                        @else
                            <x-icons.regenerate class="h-3.5 w-3.5" /><span>{{ $scene->image_path ? __('Regenerate') : __('Generate') }}</span>
                        @endif
                    </button>
                    <button type="button" @click="promptOpen = !promptOpen"
                            class="inline-flex items-center gap-1.5 text-xs text-slate-300 transition hover:text-base-content">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" /></svg>
                        <span>{{ __('Edit prompt') }}</span>
                    </button>
                </div>
                <textarea x-show="promptOpen" x-cloak
                          wire:model.blur="selectedScene.image_prompt" wire:change="saveSelected" rows="3"
                          class="textarea textarea-sm textarea-bordered mt-1 w-full bg-slate-900"></textarea>
            </div>

            {{-- Paintings (curated public-domain / museum works) as the background image --}}
            <div x-show="imgSrc === 'paintings'" x-cloak class="space-y-1.5">
                {{-- NOT gated on $isBusy. A narration scene only reaches 'ready' with script + image
                     + audio, so a hand-built scene that has a script and narration but no image sits
                     at status 'generating' — and gating this button on that status deadlocked the
                     scene: the one control that could supply the missing image was disabled because
                     the image was missing. Picking a painting is safe at any time regardless, since
                     GenerateSceneImage bails on hasManualBackground() before AND after generating.
                     The AI generate/regenerate buttons below stay gated, to avoid double-dispatch. --}}
                <button type="button" wire:click="openPaintingPicker"
                        class="btn btn-xs btn-outline border-slate-600 text-slate-300 hover:border-base-content/40 hover:text-base-content disabled:opacity-50 inline-flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="w-3 h-3">
                        <rect x="3" y="4" width="18" height="14" rx="2"/>
                        <path stroke-linecap="round" d="m3 15 4.5-4.5a1.4 1.4 0 0 1 2 0L14 15m-2-2 2.5-2.5a1.4 1.4 0 0 1 2 0L21 15"/>
                        <circle cx="9" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>
                    </svg>
                    <span>{{ __('Browse paintings') }}</span>
                </button>
                <p class="text-prose text-panel-hint">{{ __('Public-domain paintings & museum works, matched to the scene’s era and place.') }}</p>
            </div>

          </div>{{-- /image sub-sources --}}

            {{-- 3D — Sketchfab model as the scene background --}}
            <div x-show="bgType === '3d'" x-cloak class="space-y-2">
                <div x-data="{ link: '' }">
                    <span class="mb-1 block text-2xs font-semibold uppercase tracking-wider text-panel-hint">{{ __('Sketchfab model link or embed code') }}</span>
                    <div class="flex gap-1.5">
                        <input type="text" x-model="link" placeholder="https://sketchfab.com/3d-models/…"
                               class="input input-xs input-bordered flex-1 bg-slate-900" />
                        <button type="button" @click="if (link.trim()) { $wire.setSketchfabEmbed(link); link = '' }"
                                class="btn btn-xs btn-neutral">{{ __('Set') }}</button>
                    </div>
                    <p class="mt-1 text-prose text-panel-hint">{{ __('Paste a Sketchfab model URL or its <iframe> embed code.') }}</p>
                </div>

                @if ($bgEmbed && ($bgEmbed['kind'] ?? '') === 'sketchfab')
                    <div class="aspect-video overflow-hidden rounded-lg ring-1 ring-slate-700">
                        <iframe src="{{ $bgEmbed['src'] }}" class="h-full w-full" style="border:0" allow="autoplay; fullscreen; xr-spatial-tracking" allowfullscreen></iframe>
                    </div>
                    <button type="button" wire:click="clearBgEmbed" class="text-2xs text-error/80 underline hover:text-error">{{ __('Remove 3D background') }}</button>
                @endif
            </div>
        </div>

    </div>

    {{-- ── Skybox tab ───────────────────────────────────────────────────────── --}}
    <div x-show="view === 'skybox'" x-cloak class="space-y-2">

        @if (count($candidates) && ! $hasSkyboxImage)
            {{-- ── State A: candidates ready, awaiting the teacher's pick ───────── --}}
            <div class="space-y-2">
                <span class="text-2xs uppercase tracking-widest text-panel-hint block">{{ __('Pick your panorama') }}</span>
                <div class="grid grid-cols-2 gap-1.5">
                    @foreach ($candidates as $i => $path)
                        <button type="button"
                                wire:click="selectSkyboxCandidate({{ $scene->id }}, {{ $i }})"
                                wire:loading.attr="disabled" wire:target="selectSkyboxCandidate,generateSkyboxCandidates"
                                class="group relative block w-full overflow-hidden rounded ring-1 ring-slate-700 hover:ring-base-content/40 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                style="aspect-ratio:2/1">
                            <img src="{{ asset('storage/' . $path) }}"
                                 class="w-full h-full object-cover" />
                        </button>
                    @endforeach
                </div>
                <button type="button"
                        wire:click="generateSkyboxCandidates({{ $scene->id }})"
                        wire:loading.attr="disabled" wire:target="generateSkyboxCandidates"
                        @disabled($isBusy)
                        class="text-2xs text-panel-hint hover:text-panel-link underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1">
                    <span wire:loading wire:target="generateSkyboxCandidates"><x-icons.spinner class="w-3 h-3 animate-spin" /></span>
                    <span wire:loading.remove wire:target="generateSkyboxCandidates">↻ Generate 4 new options</span>
                    <span wire:loading wire:target="generateSkyboxCandidates">{{ __('Generating…') }}</span>
                </button>
            </div>
        @elseif ($hasSkyboxImage)
            {{-- ── State B: a skybox has been chosen ───────────────────────────── --}}
            <div class="relative">
                <img src="{{ asset('storage/' . $scene->skybox_image_path) }}?v={{ $scene->updated_at?->timestamp }}"
                     class="w-full rounded object-cover @if($isUpscaling) opacity-60 @endif" style="aspect-ratio:2/1" />
                @if ($isUpscaling)
                    <div class="absolute inset-0 flex items-center justify-center gap-1.5 rounded">
                        <x-icons.spinner class="w-4 h-4 animate-spin text-violet-300" />
                        <span class="text-2xs text-violet-300 font-medium">{{ __('Upscaling…') }}</span>
                    </div>
                @endif
            </div>

            <div class="flex flex-wrap gap-1.5">
                <button type="button"
                        wire:click="generateSkyboxCandidates({{ $scene->id }})"
                        wire:loading.attr="disabled" wire:target="generateSkyboxCandidates"
                        @disabled($isBusy)
                        class="btn btn-outline btn-sm border-slate-600 text-panel-hint hover:border-sky-500 hover:text-panel-link disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
                    <span wire:loading wire:target="generateSkyboxCandidates"><x-icons.spinner class="w-3 h-3 animate-spin" /></span>
                    <span wire:loading.remove wire:target="generateSkyboxCandidates">↻ Regenerate</span>
                    <span wire:loading wire:target="generateSkyboxCandidates">{{ __('Generating…') }}</span>
                </button>
                <button type="button"
                        wire:click="enhanceSkybox({{ $scene->id }})"
                        wire:loading.attr="disabled" wire:target="enhanceSkybox"
                        @disabled($isBusy)
                        class="btn btn-xs bg-violet-600 text-white hover:bg-violet-500 border-0 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
                    <span wire:loading wire:target="enhanceSkybox"><x-icons.spinner class="w-3 h-3 animate-spin" /></span>
                    <span wire:loading.remove wire:target="enhanceSkybox">Enhance 4×</span>
                    <span wire:loading wire:target="enhanceSkybox">{{ __('Enhancing…') }}</span>
                </button>
            </div>
        @else
            {{-- ── State C: nothing generated yet ──────────────────────────────── --}}
            <div class="w-full rounded bg-slate-800 border border-dashed border-slate-600 flex items-center justify-center" style="aspect-ratio:2/1">
                @if ($isGenerating)
                    <x-icons.spinner class="w-5 h-5 animate-spin text-panel-hint" />
                @else
                    <span class="text-xs text-panel-hint">{{ __('No panorama yet') }}</span>
                @endif
            </div>

            <div class="flex flex-wrap gap-1.5">
                <button type="button"
                        wire:click="generateSkyboxCandidates({{ $scene->id }})"
                        wire:loading.attr="disabled" wire:target="generateSkyboxCandidates"
                        @disabled($isBusy || ! $scene->image_path)
                        class="btn btn-xs bg-sky-600 text-white hover:bg-sky-500 border-0 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5">
                    <span wire:loading wire:target="generateSkyboxCandidates"><x-icons.spinner class="w-3 h-3 animate-spin" /></span>
                    <span wire:loading.remove wire:target="generateSkyboxCandidates">{{ __('Generate 4 panorama options') }}</span>
                    <span wire:loading wire:target="generateSkyboxCandidates">{{ __('Generating…') }}</span>
                </button>
            </div>
        @endif

        @if (! $scene->image_path)
            <p class="text-prose text-panel-hint">{{ __('Generate the flat image first to unlock panorama options.') }}</p>
        @endif

        {{-- Blur --}}
        <div>
            <div class="flex items-center justify-between mb-1">
                <label class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Blur') }}</label>
                <span class="text-2xs font-mono text-base-content/85" x-text="Number(blur).toFixed(2)"></span>
            </div>
            <span class="range-panel-knob min-w-0 w-full">
                <input type="range" min="0.01" max="0.9" step="0.01"
                       x-model.number="blur"
                       @input="emitBlur()"
                       @change="$wire.set('selectedScene.skybox_blur', Number(blur)); $wire.call('saveSelected')"
                       class="range range-panel" />
            </span>
        </div>

        {{-- Opacity --}}
        <div>
            <div class="flex items-center justify-between mb-1">
                <label class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Opacity') }}</label>
                <span class="text-2xs font-mono text-base-content/85" x-text="Math.round(opacity * 100) + '%'"></span>
            </div>
            <span class="range-panel-knob min-w-0 w-full">
                <input type="range" min="0" max="1" step="0.01"
                       x-model.number="opacity"
                       @input="emitOpacity()"
                       @change="$wire.set('selectedScene.skybox_opacity', Number(opacity)); $wire.call('saveSelected')"
                       class="range range-panel" />
            </span>
        </div>

        {{-- Background color --}}
        <div>
            <div class="flex items-center justify-between mb-1">
                <label class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Background') }}</label>
                <span class="text-2xs font-mono text-base-content/85" x-text="bgColor"></span>
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
                <span class="w-6 h-6 rounded border border-slate-600 overflow-hidden relative shrink-0"
                      :style="'background:' + bgColor">
                    <input type="color"
                           x-model="bgColor"
                           @input="emitBg()"
                           @change="$wire.set('selectedScene.background_color', String(bgColor)); $wire.call('saveSelected')"
                           class="absolute inset-0 opacity-0 w-full h-full cursor-pointer" />
                </span>
            </label>
        </div>
    </div>

    {{-- ── World tab ────────────────────────────────────────────────────────── --}}
    <div x-show="view === 'world'" x-cloak class="space-y-3">

        <div class="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-xs space-y-1">
            @if($worldStatus === 'ready')
                <div class="flex items-center gap-2 text-success">
                    <span class="h-1.5 w-1.5 rounded-full bg-success"></span>
                    World ready
                </div>
            @elseif(in_array($worldStatus, ['pending', 'generating']))
                <div class="flex items-center gap-2 text-warning">
                    <span class="h-1.5 w-1.5 rounded-full bg-warning animate-pulse"></span>
                    Generating world… this takes ~5–10 min
                </div>
            @elseif($worldStatus === 'failed')
                <div class="flex items-center gap-2 text-error">
                    <span class="h-1.5 w-1.5 rounded-full bg-error"></span>
                    Generation failed
                </div>
                <button wire:click="generateWorld({{ $scene->id }})"
                        class="text-warning hover:text-base-content underline underline-offset-2 mt-1">{{ __('Retry') }}</button>
            @else
                <div class="text-panel-hint">Select to start WorldLabs generation</div>
            @endif
        </div>

        <div x-data="{
                 open:        false,
                 savedY:      {{ $worldYOffset }},
                 savedScale:  {{ $worldScale }},
                 savedChar:   {{ $worldCharScale }},
                 get dirty() {
                     return Math.abs(charYOffset - this.savedY)    > 0.001
                         || Math.abs(worldScale  - this.savedScale) > 0.001
                         || Math.abs(charScale   - this.savedChar)  > 0.001
                 },
                 save() {
                     $wire.call('saveWorldSettings', Number(charYOffset), Number(worldScale), Number(charScale))
                     this.savedY     = charYOffset
                     this.savedScale = worldScale
                     this.savedChar  = charScale
                 }
             }">
            <button @click="open = !open"
                    class="flex items-center justify-between w-full text-2xs uppercase tracking-widest text-panel-hint hover:text-slate-200 transition-colors">
                <span>World Settings</span>
                <svg class="w-3 h-3 transition-transform duration-200" :class="open ? 'rotate-180' : ''"
                     fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
            </button>
            <div x-show="open" class="mt-2 space-y-3">
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-2xs uppercase tracking-widest text-panel-hint">World Y</label>
                        <span class="text-2xs font-mono text-base-content/85" x-text="(charYOffset >= 0 ? '+' : '') + Number(charYOffset).toFixed(2)"></span>
                    </div>
                    <span class="range-panel-knob min-w-0 w-full">
                        <input type="range" min="-3" max="3" step="0.01" x-model.number="charYOffset"
                               @input="emitCharY()" class="range range-panel" />
                    </span>
                    <button @click="charYOffset = 0; emitCharY()" class="text-2xs text-panel-hint hover:text-slate-300 mt-1">reset</button>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-2xs uppercase tracking-widest text-panel-hint">World Scale</label>
                        <span class="text-2xs font-mono text-base-content/85" x-text="Number(worldScale).toFixed(2) + '×'"></span>
                    </div>
                    <span class="range-panel-knob min-w-0 w-full">
                        <input type="range" min="0.1" max="5" step="0.01" x-model.number="worldScale"
                               @input="emitWorldScale()" class="range range-panel" />
                    </span>
                    <button @click="worldScale = 1; emitWorldScale()" class="text-2xs text-panel-hint hover:text-slate-300 mt-1">reset</button>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <label class="text-2xs uppercase tracking-widest text-panel-hint">Char Scale</label>
                        <span class="text-2xs font-mono text-base-content/85" x-text="Number(charScale).toFixed(2) + '×'"></span>
                    </div>
                    <span class="range-panel-knob min-w-0 w-full">
                        <input type="range" min="0.1" max="3" step="0.01" x-model.number="charScale"
                               @input="emitCharScale()" class="range range-panel" />
                    </span>
                    <button @click="charScale = 1; emitCharScale()" class="text-2xs text-panel-hint hover:text-slate-300 mt-1">reset</button>
                </div>
                <button @click="dirty && save()"
                        :disabled="!dirty"
                        :class="dirty ? 'bg-slate-600 hover:bg-slate-500 text-white cursor-pointer' : 'bg-slate-800 text-panel-hint cursor-not-allowed'"
                        class="w-full rounded px-2 py-1 text-2xs uppercase tracking-widest transition-colors">
                    Save world settings
                </button>
            </div>
        </div>
    </div>

</div>
