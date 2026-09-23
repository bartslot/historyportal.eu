<x-layouts.landing title="History Portal">
    <x-landing.header />
    <x-landing.hero />
    <x-landing.lessons :lessons="$playableLessons ?? collect()" />
    <x-landing.trending :lessons="$trendingLessons ?? collect()" />
    <x-landing.pricing />
    <x-landing.footer />
</x-layouts.landing>
