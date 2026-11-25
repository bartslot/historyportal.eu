<div class="space-y-4">
    <h3 class="text-base font-semibold">{{ __('Editors') }}</h3>

    <ul class="divide-y divide-base-300">
        @if ($owner)
            <li class="flex h-11 items-center gap-3">
                <span class="collab-avatar" style="--collab-color: {{ $owner['color'] }}">{{ $owner['initials'] }}</span>
                <span class="flex-1 truncate text-prose">{{ $owner['name'] }}</span>
                <span class="text-xs text-panel-hint">{{ __('Owner') }}</span>
            </li>
        @endif
        @foreach ($editors as $editor)
            <li class="flex h-11 items-center gap-3" wire:key="editor-{{ $editor['id'] }}">
                <span class="collab-avatar" style="--collab-color: {{ $editor['color'] }}">{{ $editor['initials'] }}</span>
                <span class="min-w-0 flex-1">
                    <span class="block truncate text-prose">{{ $editor['name'] }}</span>
                    <span class="block truncate text-xs text-panel-hint">{{ $editor['email'] }}</span>
                </span>
                @if ($isOwner)
                    <button type="button" class="btn btn-sm btn-ghost btn-square" wire:click="remove({{ $editor['id'] }})"
                            data-tooltip="{{ __('Remove') }}" aria-label="{{ __('Remove :name', ['name' => $editor['name']]) }}">
                        <x-ui.icon name="delete" />
                    </button>
                @endif
            </li>
        @endforeach
    </ul>

    @if ($isOwner)
        <form wire:submit="add" class="flex gap-2">
            <input type="email" wire:model="email" class="input input-sm flex-1" placeholder="{{ __('Email address') }}"
                   aria-label="{{ __('Email address') }}" autocomplete="off">
            <button type="submit" class="btn btn-sm btn-primary">{{ __('Add') }}</button>
        </form>
        @error('email') <p class="text-xs text-error">{{ $message }}</p> @enderror
    @endif
</div>
