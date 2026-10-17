@props([
    /** How roomy the editor is drawn: 0.7 dense, 1 default, 1.3 spacious. */
    'density' => 1.0,
])

{{-- The editor at a glance, drawn at one zoom level: the header, the scene rail on the left, the
     stage with the timeline under it, the inspector on the right. Heroicons' outline language
     (1.5 stroke, round joins, currentColor), so the selected one simply turns amber.

     Denser means smaller chrome and MORE of everything in it: more scenes in the rail, more rows
     in the inspector, more lanes in the timeline; roomier means fewer and larger. That is what the
     setting actually does to the editor, so the picture shows it rather than a generic grid. --}}
@php
    $f = (float) $density;
    $W = 96; $H = 60; $pad = 1.5;
    $head = 6 * $f;                                   // header bar
    $rail = 14 * $f;                                  // scene rail
    $insp = 22 * $f;                                  // inspector
    $tl = 13 * $f;                                    // timeline
    $top = $pad + $head;
    $bottom = $H - $pad;
    $stageX = $pad + $rail;
    $stageW = $W - 2 * $pad - $rail - $insp;
    $thumb = 6.5 * $f;                                // a scene in the rail
    $scenes = (int) floor(($bottom - $top - 3) / ($thumb + 2));
    $row = 4.5 * $f;                                  // an inspector row
    $rows = (int) floor(($bottom - $top - 4) / ($row + 2.5));
    $lane = 3 * $f;                                   // a timeline lane
    $lanes = (int) floor(($tl - 3) / ($lane + 1.5));
@endphp
<svg viewBox="0 0 {{ $W }} {{ $H }}" fill="none" stroke="currentColor" stroke-width="1.5"
     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" {{ $attributes->class(['w-full']) }}>
    <rect x="{{ $pad }}" y="{{ $pad }}" width="{{ $W - 2 * $pad }}" height="{{ $H - 2 * $pad }}" rx="3.5"/>
    <path d="M{{ $pad }} {{ $top }}H{{ $W - $pad }}"/>
    {{-- Scene rail --}}
    <path d="M{{ $stageX }} {{ $top }}V{{ $bottom }}"/>
    @for ($i = 0; $i < $scenes; $i++)
        <rect x="{{ $pad + 2.5 }}" y="{{ $top + 2 + $i * ($thumb + 2) }}" width="{{ $rail - 5 }}" height="{{ $thumb }}" rx="1" stroke-width="1"/>
    @endfor
    {{-- Inspector --}}
    <path d="M{{ $W - $pad - $insp }} {{ $top }}V{{ $bottom }}"/>
    @for ($i = 0; $i < $rows; $i++)
        <path d="M{{ $W - $pad - $insp + 3 }} {{ $top + 4 + $i * ($row + 2.5) }}h{{ $insp - 6 }}" stroke-width="{{ min(2.5, 1.2 * $f + 0.3) }}" opacity="0.7"/>
    @endfor
    {{-- Stage, and the timeline under it --}}
    <rect x="{{ $stageX + 4 }}" y="{{ $top + 4 }}" width="{{ $stageW - 8 }}" height="{{ $bottom - $top - $tl - 8 }}" rx="1.5"/>
    <path d="M{{ $stageX }} {{ $bottom - $tl }}H{{ $stageX + $stageW }}"/>
    @for ($i = 0; $i < $lanes; $i++)
        <path d="M{{ $stageX + 4 }} {{ $bottom - $tl + 3 + $i * ($lane + 1.5) }}h{{ ($stageW - 8) * (0.45 + 0.15 * ($i % 3)) }}" stroke-width="1" opacity="0.7"/>
    @endfor
</svg>
