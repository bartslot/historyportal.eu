<x-layouts.landing title="History Portal" :livewire="false">
    <x-slot:head>
        <x-seo
            page="home"
            {{-- What a teacher searches for first, the brand second (x-seo appends it). Bart, 2026-10-15.
                 Year groups added 2026-11-04: teachers search topic + year group, not "storytelling". --}}
            :title="__('KS2 and KS3 history lessons your class wants to finish')"
            :description="__('A narrated story, real paintings and a game your class finishes themselves. KS2 and KS3 history, built in minutes, plays on any screen.')"
            :graph="\App\Support\Seo::withFaq(\App\Support\Seo::organisationGraph())"
        />
    </x-slot:head>
    <x-landing.header />
    <x-landing.hero />
    <x-landing.how-it-works-link />
    <x-landing.lessons :lessons="$playableLessons ?? collect()" />
    <x-landing.trending :lessons="$trendingLessons ?? collect()" />
    {{-- Pricing hidden 2026-11-02 (Bart): the price put teachers off before they saw the value. Restore by uncommenting. --}}
    {{-- <x-landing.pricing /> --}}
    <x-landing.faq />
    <x-landing.footer />
</x-layouts.landing>
