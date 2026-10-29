<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full" data-theme="learningportal" data-surface="auth">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $title ?? 'Sign In' }} · History Portal</title>

    @vite(['resources/css/app.css', 'resources/js/app.js'])
    <x-font-switch />
    @livewireStyles
</head>
<body class="flex min-h-screen h-full items-center justify-center bg-slate-950 text-slate-100 antialiased">
    <div class="w-full max-w-md px-4">
        <div class="mb-8 text-center">
            {{-- The logo carries the "History portal" wordmark itself, so it is the only mark here. --}}
            <a href="{{ route('home') }}" class="inline-flex flex-col items-center" aria-label="History Portal">
                <x-logo class="h-14 w-14" />
            </a>
        </div>

        {{ $slot }}
    </div>

    {{-- Strings the JavaScript renders (carousel arrows among them), translated; without it
         every t() on this page fell back to English (pair test round 4). --}}
    <x-js-lang />

    @livewireScripts
    <x-playtest-recorder />
</body>
</html>
