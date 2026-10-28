<div class="space-y-2" data-curriculum-picker>
    <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Curriculum') }}</span>

    @if ($linked->isNotEmpty())
        <ul class="space-y-1.5">
            @foreach ($linked as $goal)
                <li class="flex items-start gap-2 text-xs text-slate-300" wire:key="linked-{{ $goal->id }}">
                    <span class="min-w-0 flex-1">
                        <span class="font-semibold">{{ $goal->label() }}</span>
                        <span class="block truncate" data-tooltip="{{ $goal->title }}">{{ $goal->title }}</span>
                    </span>
                    <select class="select select-xs w-28 shrink-0"
                            wire:change="setFit({{ $goal->id }}, $event.target.value)"
                            aria-label="{{ __('Fit') }}">
                        <option value="direct" @selected($goal->pivot->fit === 'direct')>{{ __('Direct') }}</option>
                        <option value="partial" @selected($goal->pivot->fit === 'partial')>{{ __('Partly') }}</option>
                    </select>
                    <button type="button" wire:click="detach({{ $goal->id }})"
                            class="grid h-6 w-6 shrink-0 place-items-center rounded text-panel-hint hover:text-error"
                            data-tooltip="{{ __('Remove') }}" aria-label="{{ __('Remove') }}">
                        <x-icons.x-mark class="h-4 w-4" />
                    </button>
                </li>
            @endforeach
        </ul>
    @endif

    <input type="search" wire:model.live.debounce.250ms="search"
           class="input input-sm w-full"
           placeholder="{{ __('Kerndoel, tijdvak or canon') }}"
           aria-label="{{ __('Add a curriculum goal') }}" />

    @if ($results->isNotEmpty())
        <ul class="max-h-56 overflow-y-auto rounded-lg border border-slate-700">
            @foreach ($results as $goal)
                <li wire:key="result-{{ $goal->id }}">
                    <button type="button" wire:click="attach({{ $goal->id }})"
                            class="block w-full px-2 py-1.5 text-left text-xs text-slate-300 hover:bg-slate-800 hover:text-primary">
                        <span class="font-semibold">{{ $goal->label() }}</span>
                        <span class="block truncate">{{ $goal->title }}</span>
                    </button>
                </li>
            @endforeach
        </ul>
    @endif
</div>
