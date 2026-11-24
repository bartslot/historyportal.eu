@props(['scene'])

{{-- The Map block's motion presets (Bart 11-24: "this field should hold presets about the selection ... not about the
     scene animations"). A preset writes keys on the timeline at the playhead and replaces the one picked before it
     (resources/js/anim/map-camera-presets.js, map-presets.js); the keys are then the teacher's to tweak there.
     Each tile's little picture plays the move while the pointer is on it (resources/css/app.css .lp-mp). --}}
@php
    $hasTerritory = filled($scene?->config['qid'] ?? null);
    $camera = [
        'fromSpace' => __('From space'),
        'zoomIn' => __('Zoom in'),
        'zoomOut' => __('Zoom out'),
        'aToB' => __('A to B'),
        'tiltZoomOut' => __('Tilt and zoom out'),
        'drift' => __('Slow drift'),
    ];
    $territory = [
        'draw' => __('Draw the border'),
        'drawThenFill' => __('Draw, then fill'),
        'fade' => __('Fade in'),
        'grow' => __('Grow over time'),
        'fadeOut' => __('Fade out'),
    ];
    // One small map for every camera tile: sea, a coast, the place the shot ends on.
    // Bigger than the tile, so a pan or a zoom out has more map to show.
    $miniMap = '<rect class="lp-mp-sea" x="-64" y="-40" width="192" height="120"/>'
        .'<path class="lp-mp-land" d="M-64 -40 H40 C36 -28 46 -20 38 -10 C30 0 40 8 30 14 C20 20 26 30 14 34 C2 38 -10 30 -20 40 L-64 60 Z"/>'
        .'<path class="lp-mp-land" d="M52 20 C58 12 70 16 76 10 C86 2 100 8 128 4 V80 H44 C40 60 56 50 48 40 C40 32 46 26 52 20 Z"/>'
        .'<path class="lp-mp-coast" d="M40 -40 C36 -28 46 -20 38 -10 C30 0 40 8 30 14 C20 20 26 30 14 34 C2 38 -10 30 -20 40 L-64 60"/>'
        .'<path class="lp-mp-coast" d="M128 4 C100 8 86 2 76 10 C70 16 58 12 52 20 C46 26 40 32 48 40 C56 50 40 60 44 80"/>'
        .'<circle class="lp-mp-dot" cx="10" cy="4" r="1"/><circle class="lp-mp-dot" cx="-6" cy="20" r="1"/><circle class="lp-mp-dot" cx="70" cy="30" r="1"/>'
        .'<circle class="lp-mp-pin" cx="30" cy="14" r="2.2"/>';
    $terrShape = 'M14 12 L30 8 L46 13 L50 24 L40 32 L22 31 L12 22 Z';
@endphp

<div class="space-y-3" x-data="{ picked: null }" data-map-motion-presets>
    <p class="text-prose leading-tight text-panel-hint">{{ __('Frame the shot it should end on, then pick a move. It lands on the timeline at the playhead, where you can tweak it.') }}</p>

    <div class="space-y-1">
        <p class="text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Camera') }}</p>
        <div class="grid grid-cols-2 gap-1.5" role="group" aria-label="{{ __('Camera') }}">
            @foreach ($camera as $id => $label)
                <button type="button" data-camera-preset="{{ $id }}"
                        x-on:click="picked = 'cam:{{ $id }}'; window.__timelineKeying?.cameraPreset?.(@js($id))"
                        class="lp-mp lp-mp-cam-{{ $id }} flex min-w-0 flex-col items-stretch gap-1 rounded p-1 text-left text-xs ring-1 transition-colors"
                        :class="picked === 'cam:{{ $id }}' ? 'bg-primary/10 text-base-content ring-primary' : 'bg-base-200 text-base-content/80 ring-transparent hover:ring-base-content/30'">
                    <span class="lp-mp-frame" aria-hidden="true">
                        <svg class="lp-mp-view" viewBox="0 0 64 40" preserveAspectRatio="xMidYMid slice">{!! $miniMap !!}</svg>
                        @if ($id === 'fromSpace')<span class="lp-mp-globe"></span>@endif
                        @if ($id === 'aToB')<span class="lp-mp-a">A</span>@endif
                    </span>
                    <span class="truncate px-0.5">{{ $label }}</span>
                </button>
            @endforeach
        </div>
    </div>

    @if ($hasTerritory)
        <div class="space-y-1">
            <p class="text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Territory') }}</p>
            <div class="grid grid-cols-2 gap-1.5" role="group" aria-label="{{ __('Territory') }}">
                @foreach ($territory as $id => $label)
                    <button type="button" data-map-preset="{{ $id }}"
                            x-on:click="picked = 'terr:{{ $id }}'; window.__timelineKeying?.mapPreset?.(@js($id))"
                            class="lp-mp lp-mp-terr-{{ $id }} flex min-w-0 flex-col items-stretch gap-1 rounded p-1 text-left text-xs ring-1 transition-colors"
                            :class="picked === 'terr:{{ $id }}' ? 'bg-primary/10 text-base-content ring-primary' : 'bg-base-200 text-base-content/80 ring-transparent hover:ring-base-content/30'">
                        <span class="lp-mp-frame" aria-hidden="true">
                            <svg viewBox="0 0 64 40" preserveAspectRatio="xMidYMid slice">
                                <rect class="lp-mp-land" x="-40" y="-20" width="144" height="80"/>
                                <g class="lp-mp-terr">
                                    <path class="lp-mp-terr-fill" d="{{ $terrShape }}"/>
                                    <path class="lp-mp-terr-line" pathLength="100" d="{{ $terrShape }}"/>
                                </g>
                            </svg>
                        </span>
                        <span class="truncate px-0.5">{{ $label }}</span>
                    </button>
                @endforeach
            </div>
        </div>
    @endif
</div>
