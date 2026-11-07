{{-- Lesson settings > Music. See App\Livewire\Wizard\LessonMusic. --}}
<div class="space-y-2" x-data="lessonMusicTempo(@js($untimed))" data-lesson-music>
    <div class="flex items-center justify-between gap-2">
        <span>
            <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Music by scene') }}</span>
            <span class="mt-0.5 block text-xs text-panel-hint">{{ __('Each track plays from its scene until the next one takes over on the beat.') }}</span>
        </span>
        <button type="button" class="btn btn-xs btn-ghost shrink-0" wire:click="undo" @disabled(! $canUndo)
                aria-label="{{ __('Undo music change') }}" title="{{ __('Undo music change') }}">
            <x-icons.arrow-uturn-left class="h-3.5 w-3.5" />
        </button>
    </div>

    @error('rows') <p class="text-xs text-error">{{ $message }}</p> @enderror

    @foreach ($rows as $i => $row)
        @php $track = $tracks->firstWhere('id', $row['track_id']); @endphp
        <div class="space-y-1 rounded-box border border-panel-hairline p-2" wire:key="lesson-music-row-{{ $row['scene'] }}-{{ $row['track_id'] ?? 0 }}">
            <div class="flex items-center gap-2">
                <label class="w-14 shrink-0">
                    <span class="block truncate text-2xs uppercase tracking-widest text-panel-hint">{{ __('Scene') }}</span>
                    <input type="number" min="1" max="{{ $sceneCount }}" step="1" inputmode="numeric"
                           wire:model.change="rows.{{ $i }}.scene" class="input input-xs w-full"
                           aria-label="{{ __('From scene') }}" />
                </label>
                <label class="min-w-0 flex-1">
                    <span class="block truncate text-2xs uppercase tracking-widest text-panel-hint">{{ __('Track') }}</span>
                    <select wire:model.change="rows.{{ $i }}.track_id" class="select select-xs w-full" aria-label="{{ __('Track') }}">
                        <option value="">{{ __('No music') }}</option>
                        @foreach ($tracks as $t)
                            <option value="{{ $t->id }}">{{ $t->title }}</option>
                        @endforeach
                    </select>
                </label>
                <div class="flex shrink-0">
                    <button type="button" class="btn btn-ghost btn-xs px-1" wire:click="moveRow({{ $i }}, -1)" @disabled($i === 0)
                            aria-label="{{ __('Move track up') }}" title="{{ __('Move track up') }}">
                        <x-icons.chevron-down class="h-3 w-3 rotate-180" />
                    </button>
                    <button type="button" class="btn btn-ghost btn-xs px-1" wire:click="moveRow({{ $i }}, 1)" @disabled($i === count($rows) - 1)
                            aria-label="{{ __('Move track down') }}" title="{{ __('Move track down') }}">
                        <x-icons.chevron-down class="h-3 w-3" />
                    </button>
                </div>
                <button type="button" class="btn btn-xs btn-ghost shrink-0" wire:click="removeRow({{ $i }})"
                        aria-label="{{ __('Remove track') }}" title="{{ __('Remove track') }}">
                    <x-icons.x-mark class="h-4 w-4" />
                </button>
            </div>
            @if ($track)
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-panel-hint">
                    @if ($isAdmin)
                        <label class="flex items-center gap-1 whitespace-nowrap">
                            {{ __('BPM') }}
                            <input type="number" min="40" max="240" step="0.1" value="{{ $track->bpm }}" class="input input-xs w-16"
                                   wire:change="saveTempo({{ $track->id }}, $event.target.value, {{ $track->beat_offset ?? 0 }}, true)"
                                   aria-label="{{ __('Beats per minute') }}" />
                        </label>
                        <label class="flex items-center gap-1 whitespace-nowrap">
                            {{ __('First beat (s)') }}
                            <input type="number" min="0" max="10" step="0.01" value="{{ $track->beat_offset }}" class="input input-xs w-16"
                                   wire:change="saveTempo({{ $track->id }}, {{ $track->bpm ?? 'null' }}, $event.target.value, true)"
                                   aria-label="{{ __('First beat (s)') }}" />
                        </label>
                    @elseif ($track->bpm)
                        <span>{{ __(':bpm BPM', ['bpm' => rtrim(rtrim(number_format($track->bpm, 1), '0'), '.')]) }}</span>
                    @else
                        <span>{{ __('Tempo unknown, so the change uses the timed crossfade.') }}</span>
                    @endif
                    @if ($row['layers'] > 1)
                        <span>{{ __('+:count more in the scene', ['count' => $row['layers'] - 1]) }}</span>
                    @endif
                </div>
            @endif
        </div>
    @endforeach

    @if ($tracks->isEmpty())
        <p class="text-xs text-panel-hint">{{ __('The music library is empty.') }}</p>
    @elseif (count($rows) < $sceneCount)
        <button type="button" class="btn btn-xs btn-outline w-full" wire:click="addRow">{{ __('Add track') }}</button>
    @endif
</div>
