@props([
    /** teamDraft key: fixed, items, cards, options, prompts, evidence, roles. */
    'field',
    /** [heading, add label, columns]; no columns = a list of plain strings. */
    'list',
    'rows' => [],
])

{{-- One editable list of a team game (EditsTeamGame): every row's fields, a remove button per row
     and an add button. Items, dossier cards, options, evidence, prompts and roles all edit alike. --}}
@php
    [$heading, $addLabel, $columns] = $list;
    $label = 'text-xs font-semibold uppercase tracking-wide text-panel-label';
    $max = \App\Services\Lessons\TeamGameSpec::maxRows($field);
@endphp

<section class="space-y-2 border-t border-panel-hairline pt-3" data-team-rows="{{ $field }}">
    <div class="flex items-center justify-between gap-2">
        <h4 class="{{ $label }}">{{ $heading }}</h4>
        <span class="text-2xs text-panel-label">{{ count($rows) }} / {{ $max }}</span>
    </div>

    @foreach ($rows as $i => $row)
        <div class="flex items-start gap-2 rounded-box border border-panel-hairline p-2" wire:key="team-{{ $field }}-{{ $i }}">
            <div class="flex-1 space-y-1.5">
                @forelse ($columns as $col)
                    @php $model = "teamDraft.{$field}.{$i}.{$col['key']}"; @endphp
                    @if ($col['type'] === 'textarea')
                        <textarea rows="2" aria-label="{{ $col['label'] }}" placeholder="{{ $col['label'] }}"
                                  wire:model.blur="{{ $model }}" wire:change="saveTeamDraft"
                                  class="textarea textarea-sm w-full"></textarea>
                    @elseif ($col['type'] === 'checkbox')
                        <label class="flex items-center gap-2">
                            <input type="checkbox" wire:model.change="{{ $model }}" wire:change="saveTeamDraft" class="checkbox checkbox-xs" />
                            <span class="text-2xs text-panel-label">{{ $col['label'] }}</span>
                        </label>
                    @elseif ($col['type'] === 'number')
                        <label class="input input-sm w-full">
                            <span class="{{ $label }}">{{ $col['label'] }}</span>
                            <input type="number" min="{{ $col['min'] }}" max="{{ $col['max'] }}"
                                   wire:model.blur="{{ $model }}" wire:change="saveTeamDraft" class="grow" />
                        </label>
                        @error($model) <span class="text-2xs text-error">{{ $message }}</span> @enderror
                    @else
                        <input type="{{ $col['type'] === 'url' ? 'url' : 'text' }}" aria-label="{{ $col['label'] }}" placeholder="{{ $col['label'] }}"
                               wire:model.blur="{{ $model }}" wire:change="saveTeamDraft"
                               class="input input-sm w-full" />
                    @endif
                @empty
                    <input type="text" aria-label="{{ $heading }}"
                           wire:model.blur="teamDraft.{{ $field }}.{{ $i }}" wire:change="saveTeamDraft"
                           class="input input-sm w-full" />
                @endforelse
            </div>
            <button type="button" wire:click="removeTeamRow('{{ $field }}', {{ $i }})"
                    class="btn btn-ghost btn-xs btn-square" aria-label="{{ __('Remove') }}" data-tooltip="{{ __('Remove') }}">
                <x-icons.trash class="h-3.5 w-3.5" />
            </button>
        </div>
    @endforeach

    @if (count($rows) < $max)
        <button type="button" wire:click="addTeamRow('{{ $field }}')" class="btn btn-ghost btn-xs gap-1">
            <x-icons.plus class="h-3.5 w-3.5" />
            {{ $addLabel }}
        </button>
    @endif
</section>
