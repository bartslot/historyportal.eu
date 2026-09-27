@props(['lesson', 'translations'])

{{-- Language switch — bottom RIGHT of the title screen, opening upward (the top left belongs
     to "Edit scene" and a series wordmark, the top right to the QR code). The narrator card
     moves up to make room when this is shown. Only shown when this lesson has playable
     siblings in another language (Lesson::translations()). Switches the LESSON's language by
     opening the sibling's own player page; it never touches the interface locale. --}}
@if($translations->isNotEmpty())
    {{-- min-h-11/min-w-11 (44px) keeps the tap target legal at 375px width, where the
         name is dropped for the bare code (flag + "IT") so it never runs into the
         Start button on the left. --}}
    <div class="dropdown dropdown-top dropdown-end absolute bottom-6 right-6 sm:right-12" style="z-index:20">
        <div tabindex="0" role="button"
             class="btn btn-ghost min-h-11 h-11 min-w-11 gap-2 border-none bg-black/40 px-3 text-white/80 backdrop-blur hover:bg-black/60 hover:text-white"
             data-tooltip="{{ __('Lesson language') }}">
            <x-dynamic-component :component="'flags.'.\App\Support\Locales::flag($lesson->language)" class="block h-4 w-6 rounded-[2px]" />
            <span lang="{{ $lesson->language }}" class="text-xs font-semibold uppercase tracking-wide sm:hidden">{{ $lesson->language }}</span>
            <span lang="{{ $lesson->language }}" class="hidden text-xs font-semibold uppercase tracking-wide sm:inline">{{ \App\Support\Locales::name($lesson->language) }}</span>
        </div>
        <ul tabindex="0" class="menu dropdown-content z-20 mb-2 w-48 rounded-box bg-base-200/95 p-2 shadow-lg backdrop-blur">
            <li class="menu-title">{{ __('Lesson language') }}</li>
            @foreach($translations as $sibling)
                <li>
                    <a href="{{ route('lesson.play', ['lessonCode' => $sibling->lesson_code]) }}"
                       class="min-h-11"
                       data-tooltip="{{ \App\Support\Locales::name($sibling->language) }}">
                        <x-dynamic-component :component="'flags.'.\App\Support\Locales::flag($sibling->language)" class="block h-4 w-6 rounded-[2px]" />
                        <span lang="{{ $sibling->language }}">{{ \App\Support\Locales::name($sibling->language) }}</span>
                    </a>
                </li>
            @endforeach
        </ul>
    </div>
@endif
