@props(['draft' => []])

{{-- Predict moment inspector (EditsPredict). Every field autosaves through savePredictDraft(); every
     save is a Scene save, so Cmd-Z undoes it. The rubric grades the WHY answers and never reaches the
     player. Lists use the team game's row markup (team-rows.blade.php). --}}
@php
    $label = 'text-3xs font-semibold uppercase tracking-wide text-panel-label';
    $mode = $draft['mode'] ?? 'paper';
    $lists = [
        'concepts' => [__('Ideas that count'), __('Add idea'), \App\Services\Lessons\PredictSpec::CONCEPTS_MAX],
        'misconceptions' => [__('Known misconceptions'), __('Add misconception'), \App\Services\Lessons\PredictSpec::MISCONCEPTIONS_MAX],
    ];
@endphp

<div class="space-y-3" data-predict-inspector>
    <div class="space-y-2">
        <label class="block">
            <span class="{{ $label }}">{{ __('Question') }}</span>
            <textarea rows="2" maxlength="300" wire:model.blur="predictDraft.question" wire:change="savePredictDraft" class="textarea textarea-sm mt-1 w-full"></textarea>
            @error('predictDraft.question') <span class="text-2xs text-error">{{ $message }}</span> @enderror
        </label>
        <label class="block">
            <span class="{{ $label }}">{{ __('What happened') }}</span>
            <textarea rows="2" maxlength="300" wire:model.blur="predictDraft.outcome" wire:change="savePredictDraft" class="textarea textarea-sm mt-1 w-full"></textarea>
        </label>
        <label class="block">
            <span class="{{ $label }}">{{ __('Debrief question') }}</span>
            <textarea rows="2" maxlength="300" wire:model.blur="predictDraft.debrief" wire:change="savePredictDraft" class="textarea textarea-sm mt-1 w-full"></textarea>
        </label>
    </div>

    <div class="grid grid-cols-2 gap-2">
        <div class="block">
            <span class="{{ $label }}">{{ __('On the board') }}</span>
            <div class="mt-1" wire:key="predict-mode-{{ $mode }}">
                <x-ui.segmented panel class="w-full" name="predict-mode" :value="$mode"
                                :options="[['paper', __('Paper')], ['typed', __('Typed')]]"
                                tab-class="flex-1"
                                on-change="$wire.call('setPredictMode', $event.target.value)" />
            </div>
        </div>
        <label class="block">
            <span class="{{ $label }}">{{ __('Writing time (seconds)') }}</span>
            <input type="number" min="0" max="{{ \App\Services\Lessons\PredictSpec::SECONDS_MAX }}" wire:model.blur="predictDraft.seconds" wire:change="savePredictDraft" class="input input-sm mt-1 w-full" />
            @error('predictDraft.seconds') <span class="text-2xs text-error">{{ $message }}</span> @enderror
        </label>
    </div>

    <section class="space-y-2 border-t border-panel-hairline pt-3">
        <h4 class="{{ $label }}">{{ __('Rubric') }}</h4>
        <label class="block">
            <span class="{{ $label }}">{{ __('Key cause') }}</span>
            <textarea rows="2" maxlength="300" wire:model.blur="predictDraft.rubric.key_cause" wire:change="savePredictDraft" class="textarea textarea-sm mt-1 w-full"></textarea>
        </label>
    </section>

    @foreach ($lists as $field => [$heading, $addLabel, $max])
        @php $rows = (array) ($draft['rubric'][$field] ?? []); @endphp
        <section class="space-y-2 border-t border-panel-hairline pt-3" data-predict-rows="{{ $field }}">
            <div class="flex items-center justify-between gap-2">
                <h4 class="{{ $label }}">{{ $heading }}</h4>
                <span class="text-2xs text-panel-label">{{ count($rows) }} / {{ $max }}</span>
            </div>
            @foreach ($rows as $i => $row)
                <div class="flex items-start gap-2 rounded-box border border-panel-hairline p-2" wire:key="predict-{{ $field }}-{{ $i }}">
                    <div class="flex-1 space-y-1.5">
                        <input type="text" aria-label="{{ $heading }}"
                               wire:model.blur="predictDraft.rubric.{{ $field }}.{{ $i }}" wire:change="savePredictDraft"
                               class="input input-sm w-full" />
                    </div>
                    <button type="button" wire:click="removePredictRow('{{ $field }}', {{ $i }})"
                            class="btn btn-ghost btn-xs btn-square" aria-label="{{ __('Remove') }}" data-tooltip="{{ __('Remove') }}">
                        <x-icons.trash class="h-3.5 w-3.5" />
                    </button>
                </div>
            @endforeach
            @if (count($rows) < $max)
                <button type="button" wire:click="addPredictRow('{{ $field }}')" class="btn btn-ghost btn-xs gap-1">
                    <x-icons.plus class="h-3.5 w-3.5" />
                    {{ $addLabel }}
                </button>
            @endif
        </section>
    @endforeach
</div>
