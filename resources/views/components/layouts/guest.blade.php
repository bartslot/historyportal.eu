<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full" data-theme="learningportal">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ $title ?? 'Sign In' }} · History Portal</title>

    @vite(['resources/css/app.css', 'resources/js/app.js'])
    @livewireStyles
</head>
<body class="flex min-h-screen h-full items-center justify-center bg-slate-950 text-slate-100 antialiased">
    <div class="w-full max-w-md px-4">
        <div class="mb-8 text-center">
            <a href="{{ route('home') }}" class="inline-flex flex-col items-center gap-2">
                <x-logo class="h-14 w-14" />
                <span class="font-cinzel text-2xl font-bold tracking-wide text-amber-400">
                    History Portal
                </span>
            </a>
        </div>

        {{ $slot }}
    </div>

    @livewireScripts
</body>
</html>
