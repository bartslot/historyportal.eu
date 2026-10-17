<div class="mx-auto max-w-2xl px-4 py-10 sm:px-6">
    <h1 class="text-2xl font-bold text-slate-100">{{ __('Account Settings') }}</h1>
    <p class="mt-1 text-sm text-slate-400">{{ __('Manage your account preferences.') }}</p>

    @if (session('saved'))
        <div class="alert alert-success mt-4 text-sm" role="status">
            {{ __('Your settings have been saved.') }}
        </div>
    @endif

    <div class="card mt-6 border border-slate-800 bg-base-200">
        <div class="card-body gap-5">
            {{-- Read-only account info --}}
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                    <p class="text-xs uppercase tracking-wider text-slate-500">{{ __('Name') }}</p>
                    <p class="mt-0.5 text-slate-200">{{ auth()->user()->name }}</p>
                </div>
                <div>
                    <p class="text-xs uppercase tracking-wider text-slate-500">{{ __('Email') }}</p>
                    <p class="mt-0.5 truncate text-slate-200">{{ auth()->user()->email }}</p>
                </div>
            </div>

            <div class="border-t border-slate-800"></div>

            {{-- UI-language switcher --}}
            <div class="w-full max-w-xs">
                <p id="language-picker-label" class="mb-1 text-sm font-medium text-slate-300">{{ __('Language') }}</p>
                <x-ui.language-picker model="locale" :current="$locale" :label="__('Language')" />
                <p class="mt-1 text-xs text-slate-500">{{ __('Changes the language of the interface.') }}</p>
                @error('locale')
                    <p class="mt-1 text-xs text-error">{{ $message }}</p>
                @enderror
            </div>

            {{-- Teaching language: a separate question from the interface language. A teacher can
                 work in Dutch and teach in English, and this is what picks the narration voice. --}}
            <div class="w-full max-w-xs">
                <p id="teaching-language-picker-label" class="mb-1 text-sm font-medium text-slate-300">{{ __('Teaching language') }}</p>
                <x-ui.language-picker model="teaching_locale" :current="$teaching_locale" :label="__('Teaching language')" />
                <p class="mt-1 text-xs text-slate-500">{{ __('The language your lessons are written and read aloud in. This can differ from the language of the interface.') }}</p>
                @error('teaching_locale')
                    <p class="mt-1 text-xs text-error">{{ $message }}</p>
                @enderror
            </div>

            <div>
                <button type="button" wire:click="save"
                        class="btn border-0 bg-primary text-slate-950 hover:brightness-110">
                    {{ __('Save') }}
                </button>
            </div>
        </div>
    </div>

    {{-- The editor's zoom level (Bart, 2026-10-17, after Spotify's): three named sizes, each a
         picture of OUR editor at that size, over the 70-130% scale they sit on. A choice is saved
         at once and follows the teacher to every device; the editor reads it on its next load. --}}
    @php
        $presets = [70 => __('Dense'), 100 => __('Default'), 130 => __('Spacious')];
    @endphp
    <section class="card mt-6 border border-slate-800 bg-base-200" data-zoom-level>
        <div class="card-body gap-6">
            <h2 class="text-base font-semibold text-slate-100">{{ __('Zoom level') }}</h2>

            <div class="grid grid-cols-3 items-end" role="group" aria-label="{{ __('Zoom level') }}">
                @foreach ($presets as $scale => $name)
                    @php $isOn = $ui_scale === $scale; @endphp
                    <button type="button" wire:click="setUiScale({{ $scale }})" aria-pressed="{{ $isOn ? 'true' : 'false' }}"
                            data-zoom-preset="{{ $scale }}"
                            @class([
                                'group flex flex-col items-center gap-2 transition-colors',
                                'justify-self-start' => $scale === 70,
                                'justify-self-center' => $scale === 100,
                                'justify-self-end' => $scale === 130,
                                'text-primary' => $isOn,
                                'text-slate-500 hover:text-slate-300' => ! $isOn,
                            ])>
                        <x-settings.editor-miniature :density="$scale / 100" class="w-24 sm:w-28" />
                        <span @class(['text-sm', 'text-slate-100' => $isOn, 'text-slate-400 group-hover:text-slate-200' => ! $isOn])>{{ $name }}</span>
                    </button>
                @endforeach
            </div>

            {{-- The scale: one radio per step, on a line, as Spotify draws it. --}}
            <fieldset class="relative">
                <legend class="sr-only">{{ __('Zoom level') }}</legend>
                <span class="absolute inset-x-[7.14%] top-2.5 h-px bg-slate-700" aria-hidden="true"></span>
                <div class="relative grid grid-cols-7">
                    @foreach (\App\Models\User::UI_SCALES as $scale)
                        <label class="flex cursor-pointer flex-col items-center gap-2">
                            <input type="radio" name="ui-scale" value="{{ $scale }}" data-ui-scale
                                   class="radio radio-sm border-slate-600 bg-base-200 text-primary checked:border-primary"
                                   wire:click="setUiScale({{ $scale }})" @checked($ui_scale === $scale) />
                            <span @class(['text-xs tabular-nums', 'text-slate-100' => $ui_scale === $scale, 'text-slate-400' => $ui_scale !== $scale])>{{ $scale }}%</span>
                        </label>
                    @endforeach
                </div>
            </fieldset>

            <div class="flex justify-end">
                <button type="button" wire:click="resetUiScale" data-zoom-reset @disabled($ui_scale === 100)
                        class="btn btn-sm btn-outline rounded-full border-slate-600 text-slate-200">{{ __('Reset') }}</button>
            </div>
        </div>
    </section>
</div>
