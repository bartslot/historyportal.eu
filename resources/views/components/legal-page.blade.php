{{-- Shared frame for the legal pages (privacy, terms): header, one readable column, footer.
     English only on purpose: legal text is not run through __(), so lang:audit does not ask for
     machine translations of it. Translate it as a whole, reviewed, when a language needs it. --}}
@props(['title', 'description', 'updated'])

<x-layouts.landing :title="$title">
    <x-slot:head>
        <x-seo :title="$title" :description="$description" />
    </x-slot:head>

    <x-landing.header />

    <main class="mx-auto max-w-3xl px-4 pb-20 pt-32 sm:px-6">
        <h1 class="font-history text-4xl font-light tracking-tight text-white sm:text-5xl">{{ $title }}</h1>
        <p class="mt-3 text-sm text-slate-500">Last updated {{ $updated }}</p>

        <div class="legal-copy mt-10 space-y-5 text-base leading-relaxed text-slate-300
                    [&_a]:text-primary [&_a]:underline [&_h2]:mt-12 [&_h2]:text-xl [&_h2]:font-semibold
                    [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-white [&_ul]:space-y-2">
            {{ $slot }}
        </div>
    </main>

    <x-landing.footer />
</x-layouts.landing>
