@props(['lesson', 'translations'])

{{-- Language switch — top LEFT, under the logo/"Edit scene" row (QR takes top right;
     editor-nav convention keeps player chrome in the top corners). Only shown when this
     lesson has playable siblings in another language (Lesson::translations()). Switches
     the LESSON's language by opening the sibling's own player page; it never touches
     the interface locale.

     128px clears the logo/button row above it (its tallest content is the h-24 logo,
     ~110px including padding) at every width, so the two never overlap — they did,
     directly, when both sat at top-6 left-6. Inline top (not a top-32 utility class):
     this view's compiled CSS is a static build this environment cannot rebuild, and a
     Tailwind class this file never used before does not exist in it — it silently no-ops
     instead of erroring, which is how the overlap above shipped unnoticed. z-index on
     this same style attribute is already handled the same way elsewhere in this file. --}}
@if($translations->isNotEmpty())
    {{-- min-h-11/min-w-11 (44px) keeps the tap target legal at 375px width, where the
         name is dropped for the bare code (flag + "IT") so it never runs into the
         title (bottom of the screen) or the QR code (top right, also hidden below sm). --}}
    <div class="dropdown absolute left-4" style="top:128px; z-index:10">
        <div tabindex="0" role="button"
             class="btn btn-ghost min-h-11 h-11 min-w-11 gap-2 border-none bg-black/40 px-3 text-white/80 backdrop-blur hover:bg-black/60 hover:text-white"
             data-tooltip="{{ __('Lesson language') }}">
            <x-dynamic-component :component="'flags.'.\App\Support\Locales::flag($lesson->language)" class="block h-4 w-6 rounded-[2px]" />
            <span lang="{{ $lesson->language }}" class="text-xs font-semibold uppercase tracking-wide sm:hidden">{{ $lesson->language }}</span>
            <span lang="{{ $lesson->language }}" class="hidden text-xs font-semibold uppercase tracking-wide sm:inline">{{ \App\Support\Locales::name($lesson->language) }}</span>
        </div>
        <ul tabindex="0" class="menu dropdown-content z-20 mt-2 w-48 rounded-box bg-base-200/95 p-2 shadow-lg backdrop-blur">
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
