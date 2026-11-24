@props(['scene'])

{{-- The Map block's motion presets (Bart 11-24: "this field should hold presets about the selection ... not about the
     scene animations"). A preset writes keys on the timeline at the playhead and replaces the one picked before it
     (resources/js/anim/map-camera-presets.js, map-presets.js); the keys are then the teacher's to tweak there.
     The little pictures are real ground, in blues and white only (Bart 11-24: "make it purely in blue's and white. use
     real territory for example slovenia 1900"): the northern Adriatic with Venice and Ljubljana, and Slovenia's
     outline. Each rests on a picture of its move and plays it while the pointer is on it (resources/css/app.css .lp-mp).
     Shapes: public/map-chart land, Slovenia from Natural Earth (world.geo.json), Mercator, 160 x 100. --}}
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
    $camLand = 'M63.8 152.9 65.4 151.0 66.4 151.0 68.4 152.2 71.4 150.3 78.5 152.9 85.1 152.2 96.0 149.2 97.7 149.5 95.4 153.0 63.8 152.9 Z M18.2 138.1 19.0 138.1 18.8 138.9 18.2 138.1 Z M-29.8 123.9 -27.5 124.6 -26.7 126.5 -30.0 125.7 -29.8 123.9 Z M32.3 121.1 32.4 127.1 30.8 136.7 26.3 136.1 25.4 136.8 24.1 139.8 23.4 140.1 21.3 139.6 20.3 138.7 19.0 136.3 18.5 132.4 18.7 130.1 20.0 127.5 18.8 125.5 18.8 119.6 16.3 114.9 16.6 112.1 20.8 112.0 26.1 108.0 27.2 107.5 29.4 108.0 31.3 109.8 31.3 111.3 33.3 116.3 33.2 118.5 32.3 121.1 Z M79.5 114.2 79.0 114.5 78.6 113.9 78.9 113.8 79.5 114.2 Z M17.4 109.2 16.8 109.9 16.5 109.9 17.2 108.8 17.4 109.2 Z M30.7 94.0 27.9 102.7 27.0 103.6 25.7 103.5 23.4 101.6 23.4 99.9 22.2 99.0 22.0 97.0 21.1 96.3 21.5 94.4 20.3 92.6 21.1 91.3 20.6 89.9 22.5 86.9 28.0 84.6 29.3 80.6 30.1 81.5 30.1 85.7 30.9 90.0 30.7 94.0 Z M37.3 84.1 40.1 83.2 40.5 84.4 40.4 84.6 37.3 84.1 Z M106.7 77.4 111.9 78.0 113.6 78.6 109.0 78.4 106.7 77.4 Z M107.3 74.8 110.3 75.2 111.6 75.7 108.9 76.2 106.9 75.6 107.3 74.8 Z M94.3 65.5 95.4 66.3 95.6 66.8 94.3 65.5 Z M92.8 66.5 92.1 66.2 90.3 63.8 92.2 65.7 92.8 66.5 Z M93.5 64.5 93.7 65.0 91.7 63.0 93.5 64.5 Z M88.9 55.7 90.0 56.5 93.4 60.1 92.2 60.0 88.9 55.7 Z M87.4 52.8 88.2 52.5 89.3 54.2 88.0 53.5 87.4 52.8 Z M83.7 52.3 83.4 47.6 84.9 50.4 85.3 55.7 83.7 52.3 Z M86.1 47.1 87.4 48.2 88.3 50.5 85.7 49.2 85.3 48.4 86.1 47.1 Z M-30.0 -61.1 -29.6 -60.6 -29.8 -60.0 -30.0 -60.0 -30.0 -61.1 Z M211.9 113.6 210.9 112.8 202.6 110.6 198.9 111.8 195.4 111.5 190.8 113.8 187.4 114.2 188.4 116.8 188.4 118.3 191.7 119.6 193.4 122.0 189.6 119.8 187.1 120.0 189.7 123.4 189.9 124.3 189.4 124.9 186.1 121.6 183.5 121.1 183.6 122.5 186.0 125.6 184.2 125.1 181.8 121.4 177.8 118.5 177.8 116.5 175.4 117.9 174.7 120.4 175.2 124.6 182.3 135.9 182.0 136.7 180.6 137.3 180.2 134.9 178.8 134.4 177.8 134.8 177.5 135.8 178.5 138.0 179.3 138.5 175.2 140.8 181.3 143.7 189.4 149.3 190.4 153.0 178.0 153.0 178.4 152.2 180.5 151.7 180.8 150.8 172.6 147.2 162.9 148.1 160.7 146.6 159.9 147.9 158.6 147.8 156.5 143.3 154.5 140.9 155.1 139.9 158.4 140.2 158.4 139.0 154.4 138.2 149.7 134.4 146.1 128.7 144.7 124.8 138.9 119.6 138.9 119.0 139.7 118.5 139.0 114.8 140.1 109.8 140.0 104.1 141.3 100.2 141.0 98.8 137.1 96.0 131.0 89.1 121.4 83.6 114.4 80.5 119.2 81.8 111.9 75.1 107.4 72.9 101.9 72.2 100.6 70.3 95.9 66.0 92.7 62.2 93.0 61.6 94.8 61.3 95.0 60.5 90.3 55.3 89.6 49.5 86.7 46.1 84.9 45.1 83.6 45.2 80.3 51.4 79.0 52.5 76.5 49.0 75.2 45.0 75.3 42.7 77.0 40.3 76.4 38.7 71.5 38.3 64.3 42.3 63.0 42.7 63.7 41.5 63.1 41.7 61.6 42.8 60.7 44.8 61.1 47.2 63.5 50.7 62.8 52.6 61.2 52.8 60.9 53.9 62.4 61.1 64.2 64.0 75.4 73.0 80.3 84.7 82.7 88.2 87.3 92.7 92.6 95.8 103.5 97.1 103.9 98.6 101.3 101.2 101.3 102.5 105.8 105.5 114.2 109.6 122.5 114.9 125.9 118.0 129.2 122.2 128.2 125.9 126.8 126.6 125.1 125.4 121.9 121.0 116.7 119.4 114.5 117.4 112.7 117.7 109.1 123.4 107.8 128.0 108.5 129.5 113.5 133.1 114.6 135.9 114.6 139.2 108.6 142.1 107.6 147.2 103.0 152.8 98.4 153.0 98.1 150.7 100.3 147.9 101.0 143.9 103.8 142.2 104.2 140.3 101.1 131.0 98.1 124.4 93.9 123.3 91.0 121.5 90.3 120.6 90.6 118.5 89.3 116.3 87.9 115.4 84.4 115.6 84.5 113.8 80.6 112.7 77.4 107.2 69.4 106.0 64.2 102.3 53.2 90.9 50.7 89.6 48.4 89.5 49.0 88.3 48.5 87.4 43.9 82.0 41.9 80.6 41.4 77.1 38.5 68.4 36.4 65.6 27.1 60.3 21.4 59.5 14.2 66.4 4.9 71.1 -2.0 77.4 -6.8 79.3 -10.5 78.7 -18.5 74.2 -23.9 74.4 -30.0 71.8 -30.0 -55.2 -28.2 -55.7 -30.0 -56.3 -30.0 -57.7 -27.5 -57.2 -29.4 -59.1 -28.5 -59.8 -30.0 -62.5 -30.0 -64.4 -28.7 -66.5 212.0 -66.5 211.9 113.6 Z M159.9 153.0 161.5 150.6 164.3 150.2 166.5 148.5 177.4 153.0 159.9 153.0 Z M154.4 151.6 152.6 151.6 151.0 150.1 150.1 150.1 150.4 148.8 152.4 146.8 154.4 151.6 Z M211.5 148.4 210.4 145.2 212.0 144.7 212.0 150.4 210.7 149.4 211.5 148.4 Z M153.4 146.5 154.2 148.0 154.1 148.4 153.1 146.8 153.4 146.5 Z M191.8 144.7 193.3 150.1 196.0 151.2 196.1 152.9 194.6 153.0 193.4 152.3 190.3 148.0 186.3 146.4 184.9 144.5 181.8 141.9 178.3 140.9 180.5 139.3 182.6 138.9 185.7 141.7 191.8 144.7 Z M152.3 143.7 153.4 141.6 153.6 142.0 153.3 144.2 152.6 144.6 152.3 143.7 Z M195.2 139.9 195.8 139.8 197.0 141.4 196.1 141.7 195.2 139.9 Z M185.8 136.4 187.2 137.2 186.6 137.4 185.8 136.4 Z M212.0 137.1 210.7 136.2 210.7 135.4 212.0 134.8 212.0 137.1 Z M189.4 135.4 188.5 136.8 188.4 136.7 189.4 135.4 Z M144.2 131.4 142.8 129.0 142.8 127.8 144.9 127.7 144.8 130.6 147.0 133.3 144.2 131.4 Z M202.9 127.0 201.7 126.3 201.8 125.0 204.2 125.1 205.8 124.4 205.0 127.0 204.5 127.3 203.7 126.4 202.9 127.0 Z M208.7 122.8 210.9 121.6 211.4 122.4 208.7 122.8 Z M206.4 117.6 207.5 117.6 208.2 118.5 207.0 118.6 206.4 117.6 Z M195.7 114.9 197.7 113.3 198.6 114.7 198.5 115.5 196.7 116.0 195.7 114.9 Z M120.6 84.8 120.1 84.7 117.7 83.9 119.1 84.0 120.6 84.8 Z M110.9 82.0 109.4 81.0 114.7 81.6 110.9 82.0 Z';
    $camSlovenia = 'M77.9 26.2 87.0 27.4 92.5 23.8 102.1 23.4 104.2 20.7 106.1 20.9 108.2 26.3 99.5 30.5 98.4 36.9 94.6 38.5 94.6 42.9 90.3 42.6 86.5 40.1 84.5 42.7 76.9 42.2 79.3 40.8 76.7 34.0 77.9 26.2 Z';
    $terLand = 'M124.6 135.1 135.2 136.7 138.8 137.9 132.5 138.2 128.8 137.6 125.1 136.3 123.8 135.4 124.6 135.1 Z M125.2 129.8 131.8 130.5 133.7 131.0 134.6 131.8 133.9 132.7 132.6 133.1 128.6 132.8 124.3 131.5 124.0 130.9 124.2 130.4 125.2 129.8 Z M98.0 110.0 99.2 111.2 99.7 112.3 98.8 112.1 96.7 109.4 98.0 110.0 Z M88.1 105.8 93.6 112.1 92.0 111.0 88.1 105.8 Z M95.1 107.2 95.5 108.4 92.5 106.2 91.2 104.0 95.1 107.2 Z M84.9 88.1 87.4 89.8 94.8 97.8 93.4 98.4 92.1 97.5 88.7 94.1 86.3 90.8 84.9 88.1 Z M81.8 81.7 82.5 80.9 83.4 81.0 84.5 82.2 85.8 84.8 83.0 83.3 81.8 81.7 Z M73.5 74.7 72.8 71.3 73.1 70.3 75.0 72.9 76.4 76.6 77.0 81.2 77.1 88.0 75.9 86.8 73.7 80.6 73.4 78.4 73.5 74.7 Z M78.8 69.4 80.5 70.2 81.8 71.7 83.6 74.5 84.1 76.2 83.7 76.7 81.4 76.3 78.1 73.8 77.2 72.1 77.5 70.4 78.8 69.4 Z M141.1 142.4 140.5 141.7 143.7 142.4 141.1 142.4 Z M149.2 142.4 135.2 130.3 129.9 127.3 125.5 125.7 121.3 124.9 115.5 124.8 113.5 124.1 110.6 119.8 100.3 110.6 96.5 106.4 93.2 101.6 94.0 100.9 98.0 100.2 98.5 99.2 98.3 98.5 96.9 96.6 88.0 87.1 87.3 84.5 87.2 77.7 86.6 74.5 84.5 71.3 80.3 67.2 76.3 64.9 74.4 64.7 73.4 65.2 72.6 66.1 69.8 72.5 66.2 78.6 64.1 81.0 62.6 80.7 60.5 78.1 57.9 73.5 56.3 69.4 55.2 64.8 54.9 62.0 55.3 59.6 56.1 57.8 59.0 54.5 59.2 53.3 58.8 52.1 56.4 50.1 52.2 50.9 47.1 50.0 45.3 50.8 39.5 55.0 31.4 58.9 28.5 59.7 30.1 57.1 28.7 57.6 25.4 59.9 24.5 61.2 23.5 64.4 23.7 67.8 26.2 72.8 29.1 76.0 29.6 77.1 29.4 79.0 28.1 81.3 26.9 82.1 24.6 81.8 24.1 82.5 23.9 84.1 24.4 88.8 26.0 96.4 27.2 99.9 29.4 104.1 35.0 109.6 50.5 120.9 55.5 125.9 57.7 129.2 59.1 132.5 62.7 142.4 -17.5 142.4 -18.7 134.8 -22.3 125.7 -25.0 115.7 -27.3 111.6 -30.4 109.0 -30.4 -65.2 185.6 -65.2 185.6 142.4 149.2 142.4 Z';
    $terSlovenia = 'M61.0 23.7 80.8 26.4 92.9 18.5 113.9 17.6 118.5 11.7 122.5 12.1 127.2 23.9 108.0 33.1 105.7 47.1 97.4 50.6 97.5 60.2 88.0 59.5 79.9 54.0 75.5 59.7 58.8 58.6 64.1 55.5 58.4 40.8 61.0 23.7 Z';
    // Ljubljana (where every camera move ends) and Venice (where A to B sets off).
    // A short arrow from (x1, y1) to (x2, y2), head at the end, for the zoom cues.
    $arrow = function (float $x1, float $y1, float $x2, float $y2): string {
        $a = atan2($y2 - $y1, $x2 - $x1);
        $h = fn (float $d) => round($x2 - 5 * cos($a + $d), 1).' '.round($y2 - 5 * sin($a + $d), 1);
        return "M{$x1} {$y1} L{$x2} {$y2} M".$h(0.5)." L{$x2} {$y2} L".$h(-0.5);
    };
    [$bx, $by] = [85.6, 33.5];
    [$ax, $ay] = [61.6, 43.1];
    [$cx, $cy] = [88.1, 37.0];
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
                        <svg class="lp-mp-view" viewBox="0 0 160 100" style="transform-origin: {{ $bx / 1.6 }}% {{ $by }}%">
                            <rect class="lp-mp-sea" x="-400" y="-300" width="960" height="700"/>
                            <path class="lp-mp-land" d="{{ $camLand }}"/>
                            <path class="lp-mp-country" d="{{ $camSlovenia }}"/>
                            <circle class="lp-mp-pin" cx="{{ $bx }}" cy="{{ $by }}" r="3"/>
                            @if ($id === 'aToB')
                                <circle class="lp-mp-pin lp-mp-pin-a" cx="{{ $ax }}" cy="{{ $ay }}" r="3"/>
                            @endif
                        </svg>
                        {{-- What each tile shows before it plays: the move itself, drawn over the map. --}}
                        <svg class="lp-mp-cue" viewBox="0 0 160 100">
                            @switch($id)
                                @case('fromSpace')
                                    <rect class="lp-mp-space" width="160" height="100"/>
                                    <circle class="lp-mp-globe" cx="80" cy="50" r="30"/>
                                    <path class="lp-mp-globe-land" d="M62 34 C70 28 84 30 90 36 C96 42 104 40 106 48 C100 56 92 52 86 58 C80 66 70 62 66 54 C60 48 56 40 62 34 Z"/>
                                    <circle class="lp-mp-cue-dot" cx="84" cy="44" r="2.5"/>
                                    @break
                                @case('zoomIn')
                                    <rect class="lp-mp-cue-box" x="{{ $bx - 24 }}" y="{{ $by - 15 }}" width="48" height="30" rx="2"/>
                                    <path class="lp-mp-cue-line" d="{{ $arrow($bx - 46, $by - 29, $bx - 28, $by - 18) }} {{ $arrow($bx + 46, $by - 29, $bx + 28, $by - 18) }} {{ $arrow($bx - 46, $by + 29, $bx - 28, $by + 18) }} {{ $arrow($bx + 46, $by + 29, $bx + 28, $by + 18) }}"/>
                                    @break
                                @case('zoomOut')
                                    <rect class="lp-mp-cue-box" x="{{ $bx - 16 }}" y="{{ $by - 10 }}" width="32" height="20" rx="2"/>
                                    <path class="lp-mp-cue-line" d="{{ $arrow($bx - 20, $by - 13, $bx - 40, $by - 26) }} {{ $arrow($bx + 20, $by - 13, $bx + 40, $by - 26) }} {{ $arrow($bx - 20, $by + 13, $bx - 40, $by + 26) }} {{ $arrow($bx + 20, $by + 13, $bx + 40, $by + 26) }}"/>
                                    @break
                                @case('aToB')
                                    <path class="lp-mp-cue-route" d="M{{ $ax }} {{ $ay }} Q{{ ($ax + $bx) / 2 }} {{ min($ay, $by) - 26 }} {{ $bx }} {{ $by }}"/>
                                    <text class="lp-mp-cue-text" x="{{ $ax - 4 }}" y="{{ $ay + 13 }}">A</text>
                                    <text class="lp-mp-cue-text" x="{{ $bx - 4 }}" y="{{ $by + 13 }}">B</text>
                                    @break
                                @case('tiltZoomOut')
                                    <path class="lp-mp-cue-line" d="M20 86 L58 30 L102 30 L140 86 Z"/>
                                    @break
                                @case('drift')
                                    <path class="lp-mp-cue-route" d="M30 78 A60 60 0 0 1 130 78"/>
                                    @break
                            @endswitch
                        </svg>
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
                            <svg viewBox="0 0 160 100">
                                <rect class="lp-mp-sea" width="160" height="100"/>
                                <path class="lp-mp-land" d="{{ $terLand }}"/>
                                @if ($id === 'grow')
                                    <path class="lp-mp-terr-goal" d="{{ $terSlovenia }}"/>
                                @endif
                                <g class="lp-mp-terr" style="transform-origin: {{ $cx }}px {{ $cy }}px">
                                    <path class="lp-mp-terr-fill" d="{{ $terSlovenia }}"/>
                                    <path class="lp-mp-terr-line" pathLength="100" d="{{ $terSlovenia }}"/>
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
