{{-- One WordPress article, rendered in this app's design.
     The body is author-written HTML from our own WordPress, so it is printed unescaped; it never
     contains visitor input. --}}
@php
    use App\Support\Seo;
@endphp

<x-layouts.landing :title="$article['title']">
    <x-slot:head>
        <x-seo
            page="article"
            :params="['slug' => $article['slug']]"
            :title="$article['title']"
            :description="$article['excerpt']"
            :image="$article['image']"
            :locale="$article['language']"
            :graph="Seo::articleGraph($article)"
            type="article"
        />
    </x-slot:head>

    <x-landing.header />

    <main class="mx-auto max-w-2xl px-4 pb-24 pt-32 sm:px-6">
        <a href="{{ Seo::url('articles') }}" class="link link-hover text-sm text-base-content/80">{{ __('Articles') }}</a>

        <article class="mt-6">
            <h1 class="font-history text-4xl font-light leading-tight tracking-tight text-white sm:text-5xl">{{ $article['title'] }}</h1>
            <x-articles.meta :article="$article" class="mt-4" />

            @if ($article['image'])
                <img src="{{ $article['image'] }}" alt="" decoding="async" class="mt-8 w-full rounded-lg">
            @endif

            <div class="article-body mt-8">
                {!! $article['html'] !!}
            </div>
        </article>

        <p class="mt-14 border-t border-white/10 pt-6 leading-relaxed text-base-content/70">
            {{ __('Every lesson in the library is narrated and free to play in the browser.') }}
            <a href="{{ Seo::url('lessons') }}" class="link text-base-content">{{ __('Browse the lesson library') }}</a>
        </p>
    </main>

    <x-landing.footer />
</x-layouts.landing>
