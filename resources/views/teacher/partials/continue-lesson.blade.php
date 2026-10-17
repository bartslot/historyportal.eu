{{-- The lesson still being worked on, big and first (Bart, 2026-10-16: "Continue editing with the
     lesson big first on dashboard in view, if you are still working on a lesson"). One action: the
     whole card opens it where editing goes on (Lesson::cardEntryStep). --}}
@php
    $entryStep = $continueLesson->cardEntryStep();
    $href = $entryStep
        ? route('teacher.lessons.wizard', ['lesson' => $continueLesson->id, 'step' => $entryStep])
        : route('teacher.lessons.show', $continueLesson);
    $image = $continueLesson->coverImageUrl() ?? $continueLesson->cardImageUrl();
    $title = $continueLesson->title ?: $continueLesson->topic;
@endphp

<section aria-labelledby="continue-heading" data-continue-lesson>
    <a href="{{ $href }}" wire:navigate
       class="group relative block overflow-hidden rounded-2xl border border-white/10 bg-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
        <div class="aspect-[21/9] w-full sm:aspect-[3/1]">
            @if ($image)
                <img src="{{ $image }}" alt="" decoding="async"
                     class="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.02]">
            @endif
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>

        <div class="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-6 sm:p-8">
            <div class="min-w-0">
                <p class="text-xs font-medium uppercase tracking-eyebrow text-slate-300">{{ __('Continue editing') }}</p>
                <h2 id="continue-heading" class="mt-2 truncate font-history text-3xl font-light text-white sm:text-4xl">{{ $title }}</h2>
                <p class="mt-1 text-sm text-slate-300">{{ __('Edited :when', ['when' => $continueLesson->updated_at?->diffForHumans()]) }}</p>
            </div>
            <span class="btn btn-primary">
                <x-icons.pencil class="h-4 w-4" />
                {{ __('Continue') }}
            </span>
        </div>
    </a>
</section>
