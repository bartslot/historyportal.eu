{{-- Lesson settings > Subtitle languages (App\Livewire\Wizard\CaptionTranslations). --}}
@php $rtl = in_array($language, \App\Services\Captions\CaptionTranslator::RTL, true); @endphp
<div class="space-y-3">
    <span class="block text-2xs uppercase tracking-widest text-slate-500">{{ __('Subtitle languages') }}</span>

    <div class="flex items-center gap-2">
        <select wire:model.live="language" aria-label="{{ __('Subtitle language') }}"
                class="select select-sm min-w-0 flex-1">
            @foreach ($this->languages() as $code => $name)
                <option value="{{ $code }}" lang="{{ $code }}">{{ $name }}</option>
            @endforeach
        </select>
        <button type="button" wire:click="translate" wire:loading.attr="disabled" wire:target="translate"
                @disabled($rows !== [] && $translated === count($rows))
                class="btn btn-sm shrink-0">
            <span wire:loading.remove wire:target="translate">{{ __('Translate') }}</span>
            <span wire:loading wire:target="translate">{{ __('Translating…') }}</span>
        </button>
    </div>

    <p class="text-xs tabular-nums text-slate-400">{{ __(':done of :total lines translated', ['done' => $translated, 'total' => count($rows)]) }}</p>

    @if ($translated > 0)
        <ul class="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
            @foreach ($rows as $row)
                @continue($row['machine'] === null)
                <li wire:key="cc-{{ $language }}-{{ $row['hash'] }}" class="space-y-1">
                    <p class="text-2xs leading-snug text-slate-500" lang="{{ $lesson->language }}">{{ $row['source'] }}</p>
                    <textarea rows="2" lang="{{ $language }}" dir="{{ $rtl ? 'rtl' : 'ltr' }}"
                              aria-label="{{ __('Translated line') }}"
                              wire:change="saveLine(@js($row['hash']), $event.target.value)"
                              class="textarea textarea-sm w-full leading-snug">{{ $row['teacher'] ?? $row['machine'] }}</textarea>
                    @if ($row['teacher'] !== null)
                        <button type="button" wire:click="resetLine(@js($row['hash']))"
                                class="btn btn-ghost btn-xs text-slate-400 hover:text-primary">
                            {{ __('Reset to the machine translation') }}
                        </button>
                    @endif
                </li>
            @endforeach
        </ul>
    @endif
</div>
