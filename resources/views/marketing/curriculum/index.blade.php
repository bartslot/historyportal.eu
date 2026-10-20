{{-- The Dutch curriculum at a glance: every kerndoel, tijdvak, kenmerkend aspect and Canon window,
     with how many lessons cover it. An empty count is a lesson still to make. --}}
@php
    $title = 'Kerndoelen, tijdvakken en de Canon';
    $description = 'Welke History Portal-lessen passen bij welk kerndoel, tijdvak, kenmerkend aspect en canonvenster van het Nederlandse onderwijs.';
    $sections = [
        'canonvenster' => 'De Canon van Nederland',
        'tijdvak' => 'Tijdvakken en kenmerkende aspecten',
        'kerndoel' => 'Kerndoelen mens en maatschappij (onderbouw vo)',
    ];
@endphp

<x-layouts.landing :title="$title">
    <x-slot:head>
        <x-seo :title="$title" :description="$description" />
    </x-slot:head>

    <x-landing.header />

    <main class="mx-auto max-w-4xl px-4 pb-16 pt-32 text-slate-300 sm:px-6">
        <h1 class="font-history text-4xl font-light tracking-tight text-white sm:text-5xl">{{ $title }}</h1>
        <p class="mt-4 text-lg leading-relaxed">{{ $description }}</p>

        @foreach ($sections as $type => $heading)
            @continue(! isset($goals[$type]))
            <section class="mt-14">
                <h2 class="font-history text-2xl font-light text-white">{{ $heading }}</h2>
                <x-curriculum.goal-table class="mt-4" :goals="$type === 'tijdvak' ? $goals['tijdvak']->concat($goals['kenmerkend_aspect'] ?? collect())->sortBy('sort') : $goals[$type]" counts />
            </section>
        @endforeach
    </main>
</x-layouts.landing>
