<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full" data-theme="learningportal">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="robots" content="noindex">
    <title>{{ __('Harbour race') }} · History Portal</title>
    @vite(['resources/css/app.css', 'resources/js/race-device.js'])
    <x-js-lang />
    <script>window.RACE_DEVICE = @json($device, JSON_HEX_TAG | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);</script>
</head>
{{-- A team's phone in the harbour race (RaceDeviceController): pick the team, fill its meter, see
     who crews which ship. Everything inside is built by race-device.js with textContent. --}}
<body class="h-full bg-base-100 text-base-content">
    <main class="mx-auto flex min-h-full max-w-xl flex-col gap-4 p-4" data-race-device>
        <header class="flex items-center justify-between gap-3">
            <img src="{{ asset('assets/logo.svg') }}" alt="History Portal" class="h-12 w-auto">
            <span class="badge badge-outline font-mono tracking-widest">{{ $run->code }}</span>
        </header>
        <section class="flex flex-1 flex-col gap-4" data-race-view></section>
    </main>
</body>
</html>
