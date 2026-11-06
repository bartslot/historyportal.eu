{{-- The line above or below an article's title: when it was published and how long it takes. --}}
@props(['article'])

<p {{ $attributes->merge(['class' => 'text-xs text-slate-400']) }}>
    @if ($article['published_at'])
        <time datetime="{{ $article['published_at']->toDateString() }}">{{ $article['published_at']->isoFormat('LL') }}</time>
        <span class="mx-1" aria-hidden="true">·</span>
    @endif
    {{ __(':minutes min read', ['minutes' => $article['reading_minutes']]) }}
</p>
