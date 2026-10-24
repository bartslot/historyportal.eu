@props(['lesson', 'bare' => false])

{{-- The one lesson poster card, app-wide: the landing carousel and the hero's finished lesson
     draw the same thing. Width and row-positioning classes come from the caller, because a
     carousel cell and a hero card sit differently but ARE the same card. --}}
@php $cover = $lesson->tallCardImageUrl(); @endphp

<a
    href="{{ route('lesson.play', $lesson->lesson_code) }}"
    {{ $attributes->class('group relative block rounded-[1.35rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60') }}
>
    <div class="lp-grain-poster relative aspect-[5/8] overflow-hidden rounded-[1.35rem] border border-white/10
                bg-black/40 transition duration-300 ease-out
                group-hover:border-sky-400/25">

        @if ($cover)
            <img src="{{ $cover }}" alt="{{ $lesson->title }}"
                 {{-- The hero poster (bare) is above the fold: load it at once and first. --}}
                 @if ($bare) loading="eager" fetchpriority="high" @else loading="lazy" @endif decoding="async"
                 width="480" height="768"
                 class="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]">
        @else
            <div class="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
                <x-icons.building-library class="w-10 h-10 opacity-40" />
            </div>
        @endif

        {{-- Legibility scrim for the title block; a bare card (the hero poster) has no title block. --}}
        @unless ($bare)
            <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent"></div>
        @endunless

        {{-- Play affordance on hover --}}
        <div class="absolute inset-0 flex items-center justify-center opacity-0 transition duration-300 ease-out group-hover:opacity-100">
            <span class="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-slate-950 backdrop-blur-sm">
                <svg class="ml-1 h-6 w-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </span>
        </div>

        {{-- A bare card is the poster alone (the hero): the poster already carries the name. --}}
        @unless ($bare)
            {{-- Title block --}}
            <div class="absolute inset-x-0 bottom-0 p-4 text-white">
                <p class="truncate text-2xs font-medium uppercase tracking-wide text-primary/90">
                    {{ __(\Illuminate\Support\Str::ucfirst((string) $lesson->subject)) }}@if ($lesson->era) · {{ $lesson->era }}@endif
                </p>
                <h3 class="mt-1 text-base font-semibold leading-tight tracking-tight text-white line-clamp-2">
                    {{ $lesson->title ?: $lesson->topic }}
                </h3>
            </div>
        @endunless
    </div>
</a>
