{{-- Under the homepage hero: the way to the tour that plays on /about (#how-it-works). --}}
<div class="relative flex justify-center border-t border-base-300 bg-base-100 py-8">
    <a href="{{ \App\Support\Seo::url('about') }}#how-it-works" class="btn btn-ghost inline-flex items-center gap-2 rounded-full px-6">
        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
        </svg>
        {{ __('See how it works') }}
    </a>
</div>
