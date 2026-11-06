{{-- The line above or below an article's title: when it was published, how long it takes, and its
     language when that is not the language of the page it is listed on. --}}
@props(['article'])

<p {{ $attributes->merge(['class' => 'text-sm text-base-content/70']) }}>
    @if ($article['published_at'])
        <time datetime="{{ $article['published_at']->toDateString() }}">{{ $article['published_at']->isoFormat('LL') }}</time>
        <span class="mx-1" aria-hidden="true">·</span>
    @endif
    {{ __(':minutes min read', ['minutes' => $article['reading_minutes']]) }}
    @if ($article['language'] !== app()->getLocale())
        <span class="mx-1" aria-hidden="true">·</span>
        {{ \App\Support\Locales::name($article['language']) }}
    @endif
</p>
