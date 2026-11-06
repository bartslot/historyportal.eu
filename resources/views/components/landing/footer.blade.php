{{-- One note from a person, the places to go, the small print. Left aligned, hairline above, no band. --}}
@php
    use App\Support\Seo;

    $links = array_filter([
        [Seo::url('lessons'), __('Lessons')],
        [Seo::url('articles'), __('Articles')],
        app()->getLocale() === 'nl' ? [route('public.curriculum'), 'Kerndoelen en tijdvakken'] : null,
        [Seo::url('about'), __('About')],
        [route('privacy'), __('Privacy')],
        [route('terms'), __('Terms')],
        ['https://www.linkedin.com/in/bslot/', 'LinkedIn'],
        ['https://www.instagram.com/bart.travels/', 'Instagram'],
    ]);
@endphp

<footer id="contact" class="border-t border-white/10">
    <div class="section-container py-12 sm:py-16">
        <h2 class="font-history text-3xl tracking-tight text-white md:text-4xl">{{ __('Tell me what you think of it.') }}</h2>
        <a href="mailto:info@historyportal.eu" class="link link-hover mt-3 inline-block text-lg text-base-content">info@historyportal.eu</a>

        <nav class="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-base-content/80" aria-label="{{ __('Legal') }}">
            @foreach ($links as [$url, $label])
                <a href="{{ $url }}" class="hover:text-white" @if (str_starts_with($url, 'https://www.')) target="_blank" rel="noreferrer" @endif>{{ $label }}</a>
            @endforeach
        </nav>

        <p class="mt-8 max-w-3xl text-xs leading-relaxed text-base-content/70">
            {{ __('© :year History Portal, part of The Learning Portal. All rights reserved.', ['year' => 2026]) }}
            {{ __('All lesson content, scripts, prompts, illustrations, images, animations, interface designs, games, downloadable materials, and platform content are owned by The Learning Portal or used under licence, unless stated otherwise. No part of this website or platform may be copied, reproduced, scraped, redistributed, sold, modified, or used to train AI systems without prior written permission.') }}
        </p>
    </div>
</footer>
