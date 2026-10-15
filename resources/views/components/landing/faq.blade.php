{{-- The questions a teacher asks before trying it, on the homepage and /about. Text: App\Support\Faq,
     which also writes the page's FAQPage structured data, so the two can never disagree.
     One answer open at a time (details with a shared name), hairlines between, nothing boxed. --}}
@php($items = \App\Support\Faq::items())

<section id="faq" data-reveal-section aria-labelledby="faq-title" class="relative border-t border-base-300 bg-base-100 py-16 text-base-content sm:py-24">
    <div class="mx-auto w-full max-w-3xl px-5 md:px-10">
        <h2 id="faq-title" data-reveal="heading" class="font-history text-3xl md:text-4xl">{{ __('Questions') }}</h2>

        <div data-reveal="text" class="mt-8 border-t border-base-300">
            @foreach ($items as $item)
                <details name="faq" class="collapse collapse-arrow rounded-none border-b border-base-300">
                    <summary class="collapse-title px-0 pe-10 text-lg font-normal">{{ $item['question'] }}</summary>
                    <div class="collapse-content px-0 text-base leading-relaxed text-base-content/70">
                        <p>{{ $item['answer'] }}</p>
                        @if ($item['link'])
                            <a href="{{ $item['link']['url'] }}" class="link link-hover mt-2 inline-block text-base-content">{{ $item['link']['text'] }}</a>
                        @endif
                    </div>
                </details>
            @endforeach
        </div>
    </div>
</section>
