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
