@props(['lesson'])

{{-- Format for the pinned title screen (EditsTitleScreen): its picture, where the title sits, and
     the join QR code. The stage shows the real player's title screen, reloaded after each change. --}}
@php $position = $lesson->title_position ?? \App\Enums\TitlePosition::BottomLeft; @endphp
<div class="space-y-6">
    <div>
        <p class="font-semibold text-primary">{{ __('Title screen') }}</p>
        <p class="text-xs text-slate-400">{{ $lesson->title }}</p>
    </div>

    <x-lesson.image-choice :label="__('Picture')"
                           :current="$lesson->titleBgUrl()"
                           :candidates="$lesson->posterCandidates()"
                           :chosen="$lesson->title_image"
                           select="selectTitleImage" reset="resetTitleImage" />

    {{-- How the title is drawn: the series' comic candidates (each a folder of artwork, so a new
         one appears here without code), then its logo, then the plain title. A small frame each. --}}
    @php $choices = $lesson->titleChoices(); $style = $lesson->titleStyle(); @endphp
    @if (count($choices) > 1)
        <div class="border-t border-slate-700/50 pt-4" data-title-style="{{ $style }}">
            <div class="flex items-center justify-between">
                <span class="text-2xs uppercase tracking-widest text-slate-500">{{ __('Title style') }}</span>
                @if ($lesson->title_style !== null)
                    <button type="button" wire:click="resetTitleStyle" class="text-2xs text-slate-500 transition-colors hover:text-primary">{{ __('Reset to default') }}</button>
                @endif
            </div>
            <div class="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="{{ __('Title style') }}">
                @foreach ($choices as $choice)
                    @php $isOn = $choice['key'] === $style; @endphp
                    <button type="button" role="radio" aria-checked="{{ $isOn ? 'true' : 'false' }}"
                            wire:click="setTitleStyle(@js($choice['key']))" data-title-choice="{{ $choice['key'] }}"
                            class="group text-left">
                        <span @class([
                            'relative block aspect-video overflow-hidden rounded-md bg-base-300 ring-1 transition',
                            'ring-2 ring-primary' => $isOn,
                            'ring-slate-700 group-hover:ring-slate-500' => ! $isOn,
                        ])>
                            @if ($choice['thumb_url'])
                                <img src="{{ $choice['thumb_url'] }}" alt="" loading="lazy"
                                     @class(['h-full w-full', 'object-contain p-2' => $choice['key'] === \App\Support\TitlePoster::LOGO, 'object-cover' => $choice['key'] !== \App\Support\TitlePoster::LOGO])>
                            @endif
                        </span>
                        <span @class(['mt-1 block truncate text-2xs', 'text-primary' => $isOn, 'text-slate-400' => ! $isOn])>{{ $choice['label'] }}</span>
                    </button>
                @endforeach
            </div>
        </div>
    @endif

    {{-- The lesson-type badges (LessonTypes): shown when true of the lesson, unless hidden here. --}}
    <div class="flex items-center gap-3 border-t border-slate-700/50 pt-4">
        <label class="flex flex-1 items-center justify-between gap-3">
            <span class="text-2xs uppercase tracking-widest text-slate-500">{{ __('Lesson type') }}</span>
            <input type="checkbox" @checked($lesson->show_lesson_types ?? true)
                   wire:change="setShowLessonTypes($event.target.checked)" data-lesson-types-toggle
                   class="toggle toggle-sm shrink-0" />
        </label>
        @if ($lesson->show_lesson_types === false)
            <button type="button" wire:click="setShowLessonTypes(true)" data-lesson-types-reset class="text-2xs text-slate-500 transition-colors hover:text-primary">{{ __('Reset to default') }}</button>
        @endif
    </div>

    {{-- Where the title sits: a small frame per preset with the block drawn in its place. --}}
    <div class="border-t border-slate-700/50 pt-4">
        <span class="text-2xs uppercase tracking-widest text-slate-500">{{ __('Title position') }}</span>
        <div class="mt-2 grid max-w-72 grid-cols-3 gap-2" role="radiogroup" aria-label="{{ __('Title position') }}">
            @foreach (\App\Enums\TitlePosition::cases() as $case)
                @php
                    $isOn = $case === $position;
                    $bar = match ($case) {
                        \App\Enums\TitlePosition::TopLeft => 'left-1.5 top-1.5',
                        \App\Enums\TitlePosition::TopCenter => 'left-1/2 top-1.5 -translate-x-1/2',
                        \App\Enums\TitlePosition::TopRight => 'right-1.5 top-1.5',
                        \App\Enums\TitlePosition::Center => 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                        \App\Enums\TitlePosition::BottomLeft => 'bottom-1.5 left-1.5',
                        \App\Enums\TitlePosition::BottomCenter => 'bottom-1.5 left-1/2 -translate-x-1/2',
                    };
                @endphp
                <button type="button" role="radio" aria-checked="{{ $isOn ? 'true' : 'false' }}"
                        wire:click="setTitlePosition('{{ $case->value }}')"
                        data-tooltip="{{ $case->label() }}" aria-label="{{ $case->label() }}"
                        @class([
                            'relative aspect-video rounded-md bg-slate-900 ring-1 transition',
                            'ring-2 ring-primary' => $isOn,
                            'ring-slate-700 hover:ring-slate-500' => ! $isOn,
                        ])>
                    <span @class(['absolute h-1.5 w-1/3 rounded-full', $bar, 'bg-primary' => $isOn, 'bg-slate-500' => ! $isOn])></span>
                </button>
            @endforeach
        </div>
    </div>

    <div class="border-t border-slate-700/50 pt-4">
        <label class="flex items-center justify-between gap-3">
            <span class="text-2xs uppercase tracking-widest text-slate-500">{{ __('QR code') }}</span>
            <input type="checkbox" @checked($lesson->show_qr ?? true)
                   wire:change="setShowQr($event.target.checked)"
                   class="toggle toggle-sm shrink-0" />
        </label>
    </div>
</div>
