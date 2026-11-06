{{-- Articles written in WordPress on the marketing site, read here. The three newest get a card with
     their excerpt; the rest are one line each, so the archive stays quick to scan. --}}
@php
    use App\Support\Seo;

    $title = __('Notes on teaching history');
    $description = __('Writing from The Learning Portal about teaching history: what works in a classroom, where the sources come from, and what we are building next.');
    $featured = $articles->take(3);
    $older = $articles->skip(3);
@endphp

<x-layouts.landing :title="$title">
    <x-slot:head>
        <x-seo page="articles" :title="$title" :description="$description" :noindex="$noindex" />
    </x-slot:head>

    <x-landing.header />

    <main class="mx-auto max-w-5xl px-4 pb-16 pt-32 sm:px-6">
        <header class="mx-auto max-w-2xl text-center">
            <p class="text-xs font-medium uppercase tracking-eyebrow text-slate-400">{{ __('Articles') }}</p>
            <h1 class="mt-3 font-history text-4xl font-light tracking-tight text-white sm:text-5xl">{{ $title }}</h1>
            <p class="mt-5 text-lg leading-relaxed text-slate-300">{{ $description }}</p>
        </header>

        @if ($articles->isEmpty())
            <div class="mt-12 rounded-2xl border border-dashed border-slate-800 px-6 py-12 text-center">
                <p class="text-slate-300">{{ __('Nothing published here yet.') }}</p>
                <p class="mt-2 text-sm text-slate-400">
                    {{ __('Articles written on the main site appear here automatically.') }}
                </p>
                <a href="{{ config('services.wordpress.url') }}" rel="noopener"
                   class="btn btn-link btn-sm mt-5 px-0">
                    {{ __('Visit the main site') }}
                </a>
            </div>
        @else
            <div class="mt-16 grid gap-10 md:grid-cols-3">
                @foreach ($featured as $article)
                    <article data-article-featured>
                        <x-articles.meta :article="$article" />
                        <h2 class="mt-3 text-xl font-semibold text-white">
                            <a href="{{ Seo::url('article', ['slug' => $article['slug']]) }}" class="hover:underline">{{ $article['title'] }}</a>
                        </h2>
                        <p class="mt-3 leading-relaxed text-slate-300">{{ $article['excerpt'] }}</p>
                    </article>
                @endforeach
            </div>

            @if ($older->isNotEmpty())
                <ul class="mt-16 border-b border-slate-800">
                    @foreach ($older as $article)
                        <li data-article-row class="border-t border-slate-800 py-4">
                            <a href="{{ Seo::url('article', ['slug' => $article['slug']]) }}" class="font-semibold text-white hover:underline">{{ $article['title'] }}</a>
                            <x-articles.meta :article="$article" class="mt-1" />
                        </li>
                    @endforeach
                </ul>
            @endif
        @endif
    </main>
</x-layouts.landing>
