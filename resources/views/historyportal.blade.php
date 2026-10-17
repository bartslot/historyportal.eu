<x-layouts.landing title="History Portal">
    <x-slot:head>
        <x-seo
            page="home"
            {{-- What a teacher searches for first, the brand second (x-seo appends it). Bart, 2026-10-15. --}}
            :title="__('History lessons your class wants to finish')"
            :description="__('History lessons your class wants to see the end of. Real paintings, a narrated story, and a game they finish themselves. Built in minutes, plays anywhere.')"
            :graph="\App\Support\Seo::withFaq(\App\Support\Seo::organisationGraph())"
        />
    </x-slot:head>
    <x-landing.header />
    <x-landing.hero />
    <x-landing.how-it-works-link />
    <x-landing.lessons :lessons="$playableLessons ?? collect()" />
    <x-landing.trending :lessons="$trendingLessons ?? collect()" />
    <x-landing.pricing />
    <x-landing.faq />
    <x-landing.footer />
</x-layouts.landing>
