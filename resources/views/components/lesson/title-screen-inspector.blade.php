@props(['lesson'])

{{-- Format for the pinned title screen (EditsTitleScreen), in the order a teacher changes it: the
     style, the words, the picture, where the title and the QR sit; the rarely used under Advanced.
     The stage shows the real player's title screen, reloaded after each change. --}}
@php $position = $lesson->title_position ?? \App\Enums\TitlePosition::BottomLeft; @endphp
<div class="space-y-6" data-title-inspector>
    <p class="font-semibold text-primary">{{ __('Title screen') }}</p>

    {{-- How the title is drawn, first (Bart, 2026-10-17: "Titelstijl should be on top"): the series' comic candidates (each a folder of artwork, so a new
         one appears here without code), then its logo, then the plain title. A small frame each. --}}
    @php $choices = $lesson->titleChoices(); $style = $lesson->titleStyle(); @endphp
    @if (count($choices) > 1)
        <div data-title-style="{{ $style }}">
            <div class="flex items-center justify-between">
                <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Title style') }}</span>
                @if ($lesson->title_style !== null)
                    <button type="button" wire:click="resetTitleStyle" class="text-2xs text-panel-hint transition-colors hover:text-primary">{{ __('Reset to default') }}</button>
                @endif
            </div>
            <div class="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="{{ __('Title style') }}">
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
                        <span @class(['mt-1 block truncate text-2xs', 'text-primary' => $isOn, 'text-panel-hint' => ! $isOn])>{{ $choice['label'] }}</span>
                    </button>
                @endforeach
            </div>
        </div>
    @endif

    {{-- Then the words: the series and the subtitle after ": " (Lesson::titleParts), saved as the
         lesson's title together. A click on the title on the stage lands here (title-stage-pick.js). --}}
    @php $parts = $lesson->titleParts(); @endphp
    <div class="space-y-3 border-t border-slate-700/50 pt-4" wire:key="title-text-{{ md5((string) $lesson->title) }}"
         x-data="{ series: @js($parts['series']), subtitle: @js($parts['subtitle']), save() { $wire.setTitleText(this.series, this.subtitle) } }"
         x-on:title-edit-field.window="const el = $refs[$event.detail]; el?.focus(); el?.select()">
        <label class="block">
            <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Title') }}</span>
            <input type="text" value="{{ $parts['series'] }}" x-model="series" x-on:change="save()" required
                   maxlength="{{ \App\Models\Lesson::TITLE_MAX_CHARS }}" x-ref="title" data-title-field="title" class="input input-sm mt-1 w-full" />
        </label>
        <label class="block">
            <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Subtitle') }}</span>
            <input type="text" value="{{ $parts['subtitle'] }}" x-model="subtitle" x-on:change="save()"
                   maxlength="{{ \App\Models\Lesson::TITLE_MAX_CHARS }}" x-ref="subtitle" data-title-field="subtitle" class="input input-sm mt-1 w-full" />
        </label>
    </div>

    {{-- The picture in use, Change opens the lesson's own pictures (the shared strip), or an upload. --}}
    @php $ownPicture = trim((string) $lesson->title_image) !== ''; $titleBg = $lesson->titleBgUrl(); @endphp
    <div class="border-t border-slate-700/50 pt-4" data-title-picture x-data="{ changing: false }">
        <div class="flex items-center justify-between gap-3">
            <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Picture') }}</span>
            @if ($ownPicture)
                <button type="button" wire:click="resetTitleImage" class="text-2xs text-panel-hint transition-colors hover:text-primary">{{ __('Reset to default') }}</button>
            @else
                <span class="text-2xs text-panel-hint">{{ __('auto-picked') }}</span>
            @endif
        </div>
        <div class="mt-2 flex items-center gap-3">
            @if ($titleBg)
                <img src="{{ $titleBg }}" alt="" class="aspect-video w-28 shrink-0 rounded-md object-cover ring-1 ring-slate-700" />
            @endif
            <div class="flex min-w-0 flex-col items-start gap-1">
                @if (count($lesson->posterCandidates()))
                    <button type="button" x-on:click="changing = !changing" :aria-expanded="changing ? 'true' : 'false'" data-title-picture-change
                            class="btn btn-ghost btn-sm gap-1.5 px-2">
                        <x-icons.photo class="h-4 w-4" /> {{ __('Change') }}
                    </button>
                @endif
                <label class="btn btn-ghost btn-sm gap-1.5 px-2" data-title-picture-upload>
                    <x-icons.arrow-up-tray class="h-4 w-4" /> {{ __('Upload image') }}
                    <input type="file" accept="image/*" wire:model="titleUpload" class="hidden" />
                </label>
            </div>
        </div>
        <div wire:loading wire:target="titleUpload" class="mt-1 text-2xs text-panel-hint">{{ __('Uploading…') }}</div>
        @error('titleUpload') <p class="mt-1 text-prose text-error">{{ $message }}</p> @enderror
        @if (count($lesson->posterCandidates()))
            <div x-show="changing" x-cloak class="mt-3">
                <x-lesson.picture-strip :images="$lesson->posterCandidates()" select="selectTitleImage" id="title-picture"
                                        :current="$ownPicture ? $titleBg : null" />
            </div>
        @endif
    </div>

    {{-- Where the title sits: a small frame per preset with the block drawn in its place. --}}
    <div class="border-t border-slate-700/50 pt-4">
        <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Title position') }}</span>
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

    {{-- The join QR: shown or not. Its place follows the title: the bottom rail's right end,
         opposite Start, clear of every title position (title-qr.js). --}}
    @php $qrOn = $lesson->qrPosition() !== 'hidden'; @endphp
    <label class="flex items-center justify-between gap-3 border-t border-slate-700/50 pt-4" data-qr-position="{{ $lesson->qrPosition() }}">
        <span class="flex items-center gap-2">
            <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Show QR code') }}</span>
            {{-- The version the class's screens show under the QR (LessonVersion), and when it was made. --}}
            <span data-lesson-version class="font-mono text-2xs text-panel-hint"
                  @if ($lesson->content_version_at) data-tooltip="{{ $lesson->content_version_at->isoFormat('D MMM YYYY, HH:mm') }}" @endif>v{{ (int) ($lesson->content_version ?? 1) }}</span>
        </span>
        <input type="checkbox" @checked($qrOn) wire:change="setShowQr($event.target.checked)" data-qr-toggle class="toggle toggle-sm shrink-0" />
    </label>

    {{-- Rarely changed: closed until opened (the open state is remembered). --}}
    <x-ui.settings-section :title="__('Advanced')" :open="false" name="title-advanced" class="-mx-4" data-title-advanced>
        <div class="space-y-4 px-4 pb-2">

    {{-- "What you can expect": up to three short lines (the banner's white strip, else under the title). --}}
    @php $expect = array_values((array) ($lesson->expect ?? [])); @endphp
    <div data-title-expect-editor>
        <div class="flex items-center justify-between gap-3">
            <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('What to expect') }}</span>
            @if ($expect !== array_values((array) ($lesson->expect_default ?? [])))
                <button type="button" wire:click="resetExpect" data-expect-reset class="text-2xs text-panel-hint transition-colors hover:text-primary">{{ __('Reset to default') }}</button>
            @endif
        </div>
        <div class="mt-2 space-y-2">
            @for ($i = 0; $i < \App\Models\Lesson::EXPECT_MAX_LINES; $i++)
                <input type="text" value="{{ $expect[$i] ?? '' }}" maxlength="{{ \App\Models\Lesson::EXPECT_MAX_CHARS }}"
                       wire:key="expect-{{ $i }}-{{ md5($expect[$i] ?? '') }}"
                       wire:change="setExpectLine({{ $i }}, $event.target.value)" aria-label="{{ __('What to expect') }} {{ $i + 1 }}"
                       class="input input-sm w-full" />
            @endfor
        </div>
    </div>
        </div>
    </x-ui.settings-section>
</div>
