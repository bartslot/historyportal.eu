@php
    // What each setting does to the picture, drawn over its preview while the teacher's hand is on it
    // (stage25dInspector showHud; the keys are the rows' data attributes).
    $arrows = [
        'x' => 'M22 30h56M22 30l7-5M22 30l7 5M78 30l-7-5M78 30l-7 5',
        'y' => 'M50 8v44M50 8l-5 7M50 8l5 7M50 52l-5-7M50 52l5-7',
        'z' => 'M28 54 46 18M72 54 54 18M50 8l-7 11M50 8l7 11',
        'scale' => 'M32 48 68 12M32 48l9-1M32 48l1-9M68 12l-9 1M68 12l-1 9',
        'rotation' => 'M68 14A22 22 0 1 0 72 30M68 14l1 9M68 14l-9 1',
        'opacity' => 'M16 30a8 8 0 1 0 16 0a8 8 0 1 0-16 0M38 30h24M62 30l-6-4M62 30l-6 4M68 30a8 8 0 1 0 16 0a8 8 0 1 0-16 0M72 24l8 12M70 28l6 9M78 23l5 8',
        'outline' => 'M36 12h40v36H36zM8 30h22M30 30l-7-5M30 30l-7 5',
        'etch' => 'M46 48 72 12M56 48 82 12M66 48 90 15M8 30h26M34 30l-7-5M34 30l-7 5',
        'amount' => 'M16 30q11-4 23 0t23 0t23 0M50 8v10M50 52V42M50 8l-4 5M50 8l4 5M50 52l-4-5M50 52l4-5',
        'speed' => 'M26 16l14 14-14 14M46 16l14 14-14 14M66 16l14 14-14 14',
        'offset' => 'M16 44h68M16 38v12M44 30V14M44 14l-5 6M44 14l5 6',
    ];
@endphp

@foreach ($arrows as $key => $path)
    <svg x-show="hud === '{{ $key }}'" x-cloak viewBox="0 0 100 60" fill="none" stroke-linecap="round" stroke-linejoin="round"
         class="pointer-events-none absolute inset-0 h-full w-full" data-stage25d-hud="{{ $key }}" aria-hidden="true">
        <path d="{{ $path }}" stroke="var(--color-panel)" stroke-width="5" vector-effect="non-scaling-stroke" />
        <path d="{{ $path }}" stroke="var(--color-primary)" stroke-width="2" vector-effect="non-scaling-stroke" />
    </svg>
@endforeach
