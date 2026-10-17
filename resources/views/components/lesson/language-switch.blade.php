@props(['lesson', 'translations'])

{{-- The lesson's language on the title screen's bottom rail, next to Start: a native select (the
     phone's own picker, a screen reader's own control), each language in its own name. Text only
     and one fixed width (--title-lang-w, app.css), so the rail never shifts when it changes.
     Choosing one opens that sibling's own player page (Lesson::translations()); it never touches
     the interface locale. Hidden when the lesson has only one language: a dead control is noise. --}}
@if($translations->isNotEmpty())
    @php
        $options = collect([$lesson])->concat($translations)
            ->map(fn ($l) => ['code' => $l->language, 'url' => route('lesson.play', ['lessonCode' => $l->lesson_code]), 'current' => $l->is($lesson)])
            ->sortBy(fn ($o) => \App\Support\Locales::name($o['code']))
            ->values();
    @endphp
    <div {{ $attributes->merge(['class' => 'title-lang relative shrink-0']) }}>
        <label for="title-lang-select" class="sr-only">{{ __('Language') }}</label>
        <select id="title-lang-select" onchange="window.location.href = this.value"
                class="title-pill block w-full cursor-pointer appearance-none truncate rounded-full border border-white/25 bg-black/20 pl-4 pr-9 text-sm sm:pl-5 sm:pr-10 font-semibold text-white transition-colors hover:border-white/80 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            @foreach ($options as $option)
                <option value="{{ $option['url'] }}" lang="{{ $option['code'] }}" class="text-brand-ink" @selected($option['current'])>{{ \App\Support\Locales::name($option['code']) }}</option>
            @endforeach
        </select>
        <svg class="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/80" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5"/></svg>
    </div>
@endif
