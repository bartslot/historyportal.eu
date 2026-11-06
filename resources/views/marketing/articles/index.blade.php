{{-- Articles from WordPress and this app's own article pages. The three newest show their excerpt;
     the rest are one line each, so the archive stays quick to scan. No boxes, hairlines between. --}}
@php
    use App\Support\Seo;

    $title = __('Notes on teaching history');
    $description = __('Writing from The Learning Portal about teaching history: what works in a classroom, where the sources come from, and what we are building next.');
    $featured = $articles->take(3);
    $older = $articles->skip(3);
    $href = fn (array $article) => $article['url'] ?? Seo::url('article', ['slug' => $article['slug']], $article['language']);
    $columns = match ($featured->count()) { 3 => 'md:grid-cols-3', 2 => 'md:grid-cols-2', default => 'max-w-2xl' };
@endphp

<x-layouts.landing :title="$title">
    <x-slot:head>
        <x-seo page="articles" :title="$title" :description="$description" />
    </x-slot:head>

    <x-landing.header />

    <main class="mx-auto max-w-5xl px-4 pb-24 pt-32 sm:px-6">
        <h1 class="font-history text-4xl font-light leading-tight tracking-tight text-white sm:text-5xl">{{ $title }}</h1>

        <div class="mt-10 border-t border-white/10 pt-8">
            <div class="grid gap-10 {{ $columns }}">
                @foreach ($featured as $article)
                    <article data-article-featured>
                        @if ($article['image'])
                            <a href="{{ $href($article) }}" tabindex="-1" aria-hidden="true" class="mb-4 block">
                                <img src="{{ $article['image'] }}" alt="" loading="lazy" decoding="async" class="aspect-[3/2] w-full rounded-lg object-cover">
                            </a>
                        @endif
                        <x-articles.meta :article="$article" />
                        <h2 class="mt-2 font-history text-2xl leading-snug text-white">
                            <a href="{{ $href($article) }}" class="hover:underline">{{ $article['title'] }}</a>
                        </h2>
                        <p class="mt-3 leading-relaxed text-base-content/70">{{ $article['excerpt'] }}</p>
                    </article>
                @endforeach
            </div>

            @if ($older->isNotEmpty())
                <ul class="mt-16 border-b border-white/10">
                    @foreach ($older as $article)
                        <li data-article-row class="border-t border-white/10 py-4 md:flex md:items-baseline md:justify-between md:gap-8">
                            <a href="{{ $href($article) }}" class="font-semibold text-white hover:underline">{{ $article['title'] }}</a>
                            <x-articles.meta :article="$article" class="mt-1 shrink-0 md:mt-0" />
                        </li>
                    @endforeach
                </ul>
            @endif
        </div>
    </main>

    <x-landing.footer />
</x-layouts.landing>
