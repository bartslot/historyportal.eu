@props(['title' => config('app.name'), 'livewire' => true])
@php
    // A page with no Livewire component and no Alpine (the home page) skips livewire.min.js: 52 KB
    // on the mobile critical path for nothing. The local dev panel still needs it.
    $withLivewire = $livewire || (app()->environment('local') && auth()->check());
@endphp
<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', \App\Support\Locales::region(app()->getLocale())) }}" class="h-full scroll-smooth" data-theme="learningportal">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    {{-- Pages that care about being found pass <x-slot:head><x-seo .../></x-slot:head>, which owns
         the title, description, canonical, hreflang, social cards and structured data. Anything
         without it falls back to the plain title below. --}}
    @isset($head)
        {{ $head }}
    @else
        {{-- Carry the brand once. A page whose title already IS the brand had it appended anyway,
             so the live home page rendered "History Portal · History Portal". Same rule
             x-seo already applies for the pages that use it; this is the fallback path. --}}
        <title>{{ $title === 'History Portal' ? $title : $title.' · History Portal' }}</title>
        <meta name="description" content="{{ __('History lessons your class wants to see the end of. Real paintings, a narrated story, and a game they finish themselves. Built in minutes, plays anywhere.') }}">
    @endisset


    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <x-font-switch />
    @if ($withLivewire)
        @livewireStyles
    @endif
</head>
<body class="landing-shell relative isolate min-h-full bg-slate-950 text-white antialiased">
    {{-- Backdrop, behind the page: without -z-10 the 70% dark gradient painted over any page whose
         content is not positioned, and text near the bottom of the screen could hardly be read. --}}
    <div class="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_34%),radial-gradient(circle_at_bottom,_rgba(14,165,233,0.14),_transparent_28%)]"></div>
    <div class="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(180deg,rgba(15,23,42,0.15)_0%,rgba(2,6,23,0.7)_100%)]"></div>

    {{-- Strings the JavaScript renders (carousel arrows among them), translated; without it
         every t() on this page fell back to English (pair test round 4). --}}
    <x-js-lang />

    {{ $slot }}

    {{-- Dev role switching stays reachable here: a student has no workspace of its own and lands on the landing page. --}}
    @if (app()->environment('local') && auth()->check())
        @livewire('dev.test-panel')
    @endif

    @stack('scripts')
    @if ($withLivewire)
        @livewireScripts
    @endif
    <x-playtest-recorder />
</body>
</html>
