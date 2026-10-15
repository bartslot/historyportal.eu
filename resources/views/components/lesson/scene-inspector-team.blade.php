@props(['draft' => [], 'isDefault' => true])

{{-- Team game inspector (EditsTeamGame). Every field autosaves through saveTeamDraft(); every save
     is a Scene save, so Cmd-Z undoes it, and Reset puts back the game the lesson was built with.
     Lists are drawn from one table below, so items, dossier cards, options and evidence all edit
     the same way. --}}
@php
    $mode = $draft['mode'] ?? 'budget';
    $text = fn (string $key, string $label) => ['key' => $key, 'label' => $label, 'type' => 'text'];
    $long = fn (string $key, string $label) => ['key' => $key, 'label' => $label, 'type' => 'textarea'];
    $num = fn (string $key, string $label, int $min, int $max) => ['key' => $key, 'label' => $label, 'type' => 'number', 'min' => $min, 'max' => $max];
    $url = fn (string $key, string $label) => ['key' => $key, 'label' => $label, 'type' => 'url'];
    $check = fn (string $key, string $label) => ['key' => $key, 'label' => $label, 'type' => 'checkbox'];

    // field => [heading, add label, columns]; a list of plain strings has no columns.
    $lists = [
        'fixed' => [__('Always on board'), __('Add fixed item'), [$text('name', __('Name')), $num('cost', __('Cost'), 0, 99), $text('why', __('Why')), $url('image', __('Image URL'))]],
        'items' => [__('Cargo to choose from'), __('Add item'), [$text('name', __('Name')), $num('cost', __('Cost'), 0, 99), $text('why', __('Why')), $url('image', __('Image URL')), $check('real', __('On the real expedition'))]],
        'cards' => [__('Dossier cards'), __('Add card'), [$text('title', __('Title')), $long('text', __('Text')), $text('but', __('But'))]],
        'options' => [__('Options'), __('Add option'), [$text('label', __('Label')), $text('text', __('Text')), $url('image', __('Image URL'))]],
        'prompts' => [__('Discussion prompts'), __('Add prompt'), []],
        'evidence' => [__('Evidence images'), __('Add image'), [$url('image', __('Image URL')), $text('caption', __('Caption'))]],
        'roles' => [__('Roles in each team'), __('Add role'), []],
    ];
    $modeLists = ['budget' => ['fixed', 'items'], 'choose' => ['cards', 'options'], 'discuss' => ['prompts', 'evidence']][$mode] ?? [];
    $label = 'text-3xs font-semibold uppercase tracking-wide text-panel-label';
@endphp

<div class="space-y-3" data-team-inspector>
    <div class="flex items-center justify-between gap-2">
        {{-- Keyed by mode: the control seeds its state once, so a Reset or an undo that changes the
             mode must rebuild it, or it keeps showing the old one. --}}
        <div class="flex-1" wire:key="team-mode-{{ $mode }}">
            <x-ui.segmented panel class="w-full" name="team-mode" :value="$mode"
                            :options="[['budget', __('Budget')], ['choose', __('Choose')], ['discuss', __('Discuss')]]"
                            tab-class="flex-1"
                            on-change="$wire.call('setTeamMode', $event.target.value)" />
        </div>
        <button type="button" wire:click="resetTeamGame" @disabled($isDefault)
                class="btn btn-ghost btn-xs gap-1" data-tooltip="{{ __('Put back the game as the lesson was built. Cmd-Z undoes single edits.') }}">
            <x-icons.arrow-path class="h-3.5 w-3.5" />
            {{ __('Reset') }}
        </button>
    </div>

    {{-- The words on the class screen. --}}
    <div class="space-y-2">
        <label class="block">
            <span class="{{ $label }}">{{ __('Title') }}</span>
            <input type="text" maxlength="80" wire:model.blur="teamDraft.title" wire:change="saveTeamDraft" class="input input-sm mt-1 w-full" />
        </label>
        <label class="block">
            <span class="{{ $label }}">{{ __('Introduction') }}</span>
            <textarea rows="3" maxlength="1200" wire:model.blur="teamDraft.intro" wire:change="saveTeamDraft" class="textarea textarea-sm mt-1 w-full"></textarea>
        </label>
        @if ($mode === 'choose')
            <label class="block">
                <span class="{{ $label }}">{{ __('Situation') }}</span>
                <textarea rows="3" maxlength="1200" wire:model.blur="teamDraft.situation" wire:change="saveTeamDraft" class="textarea textarea-sm mt-1 w-full"></textarea>
            </label>
        @endif
        @if ($mode !== 'budget')
            <label class="block">
                <span class="{{ $label }}">{{ $mode === 'discuss' ? __('Question') : __('Team question') }}</span>
                <textarea rows="2" maxlength="300" wire:model.blur="teamDraft.question" wire:change="saveTeamDraft" class="textarea textarea-sm mt-1 w-full"></textarea>
            </label>
        @endif
    </div>

    <div class="grid grid-cols-2 gap-2">
        <label class="block">
            <span class="{{ $label }}">{{ __('Teams at the start') }}</span>
            <input type="number" min="2" max="8" wire:model.blur="teamDraft.teams" wire:change="saveTeamDraft" class="input input-sm mt-1 w-full" />
            @error('teamDraft.teams') <span class="text-2xs text-error">{{ $message }}</span> @enderror
        </label>
        <label class="block">
            <span class="{{ $label }}">{{ __('Timer (minutes)') }}</span>
            <input type="number" min="0" max="30" wire:model.blur="teamDraft.minutes" wire:change="saveTeamDraft" class="input input-sm mt-1 w-full" />
            @error('teamDraft.minutes') <span class="text-2xs text-error">{{ $message }}</span> @enderror
        </label>
        @if ($mode === 'budget')
            <label class="col-span-2 block">
                <span class="{{ $label }}">{{ __('Hold capacity (points)') }}</span>
                <input type="number" min="1" max="999" wire:model.blur="teamDraft.capacity" wire:change="saveTeamDraft" class="input input-sm mt-1 w-full" />
                @error('teamDraft.capacity') <span class="text-2xs text-error">{{ $message }}</span> @enderror
            </label>
            {{-- The look: the ship's hold (a ship picture with its painted hold, on a plate of the
                 lesson's own setting) or the cards. --}}
            <label class="col-span-2 block">
                <span class="{{ $label }}">{{ __('Look') }}</span>
                <select wire:model.change="teamDraft.presentation" wire:change="saveTeamDraft" class="select select-sm mt-1 w-full">
                    <option value="hold">{{ __('Ship hold') }}</option>
                    <option value="grid">{{ __('Cards') }}</option>
                </select>
            </label>
            @if (($draft['presentation'] ?? '') === 'hold')
                <label class="col-span-2 block">
                    <span class="{{ $label }}">{{ __('Background (image URL)') }}</span>
                    <input type="url" maxlength="2048" wire:model.blur="teamDraft.hold.backdrop" wire:change="saveTeamDraft" class="input input-sm mt-1 w-full" />
                </label>
                <label class="col-span-2 block">
                    <span class="{{ $label }}">{{ __('Ship picture (image URL)') }}</span>
                    <input type="url" maxlength="2048" wire:model.blur="teamDraft.hold.ship" wire:change="saveTeamDraft" class="input input-sm mt-1 w-full" />
                </label>
                <label class="col-span-2 block">
                    <span class="{{ $label }}">{{ __('Mission') }}</span>
                    <input type="text" maxlength="300" wire:model.blur="teamDraft.mission" wire:change="saveTeamDraft" class="input input-sm mt-1 w-full" />
                </label>
                <label class="col-span-2 flex items-center gap-2">
                    <input type="checkbox" wire:model.change="teamDraft.hold.draught" wire:change="saveTeamDraft" class="checkbox checkbox-xs" />
                    <span class="{{ $label }}">{{ __('Sinks when full') }}</span>
                </label>
                {{-- Each step's timer, seconds (the choosing step is the timer above). --}}
                @foreach ([['mission', __('Mission (seconds)')], ['compare', __('Results (seconds)')], ['exchange', __('Last chance (seconds)')], ['sail', __('Departure (seconds)')]] as [$key, $text])
                    <label class="block">
                        <span class="{{ $label }}">{{ $text }}</span>
                        <input type="number" min="0" max="600" wire:model.blur="teamDraft.timers.{{ $key }}" wire:change="saveTeamDraft" class="input input-sm mt-1 w-full" />
                        @error("teamDraft.timers.{$key}") <span class="text-2xs text-error">{{ $message }}</span> @enderror
                    </label>
                @endforeach
            @endif
        @endif
        @if ($mode === 'choose')
            <label class="col-span-2 block">
                <span class="{{ $label }}">{{ __('Map with the options (image URL)') }}</span>
                <input type="url" maxlength="2048" wire:model.blur="teamDraft.map" wire:change="saveTeamDraft" class="input input-sm mt-1 w-full" />
            </label>
        @endif
    </div>

    @foreach ($modeLists as $field)
        <x-lesson.team-rows :field="$field" :list="$lists[$field]" :rows="$draft[$field] ?? []" />
    @endforeach

    {{-- What the class sees after the game. --}}
    <div class="space-y-2 border-t border-panel-hairline pt-3">
        @if ($mode === 'choose')
            <label class="block">
                <span class="{{ $label }}">{{ __('Real decision') }}</span>
                <select wire:model.change="teamDraft.answer" wire:change="saveTeamDraft" class="select select-sm mt-1 w-full">
                    <option value="">{{ __('None') }}</option>
                    @foreach (($draft['options'] ?? []) as $i => $option)
                        <option value="{{ $i }}">{{ ['A', 'B', 'C', 'D'][$i] ?? $i }} {{ $option['text'] ?? '' }}</option>
                    @endforeach
                </select>
            </label>
        @endif
        <label class="block">
            <span class="{{ $label }}">{{ $mode === 'discuss' ? __('Closing line') : __('Reveal') }}</span>
            <textarea rows="4" maxlength="1200" wire:model.blur="teamDraft.{{ $mode === 'discuss' ? 'closing' : 'reveal' }}" wire:change="saveTeamDraft" class="textarea textarea-sm mt-1 w-full"></textarea>
        </label>
        @if ($mode === 'budget')
            <label class="block">
                <span class="{{ $label }}">{{ __('What later scenes need') }}</span>
                <textarea rows="2" maxlength="1200" wire:model.blur="teamDraft.needs" wire:change="saveTeamDraft" class="textarea textarea-sm mt-1 w-full"></textarea>
            </label>
        @endif
        @if ($mode !== 'discuss')
            <label class="block">
                <span class="{{ $label }}">{{ __('Follow-up question') }}</span>
                <input type="text" maxlength="300" wire:model.blur="teamDraft.followup" wire:change="saveTeamDraft" class="input input-sm mt-1 w-full" />
            </label>
            <label class="block">
                <span class="{{ $label }}">{{ __('Source') }}</span>
                <input type="text" maxlength="300" wire:model.blur="teamDraft.source" wire:change="saveTeamDraft" class="input input-sm mt-1 w-full" />
            </label>
        @endif
    </div>

    <x-ui.settings-section :title="__('Advanced')" :open="false" name="team-advanced" class="-mx-4">
        <div class="space-y-3">
            <label class="block">
                <span class="{{ $label }}">{{ __('Rules on screen') }}</span>
                <textarea rows="3" maxlength="1200" wire:model.blur="teamDraft.rules" wire:change="saveTeamDraft" class="textarea textarea-sm mt-1 w-full"></textarea>
            </label>
            <label class="flex items-center gap-2">
                <input type="checkbox" wire:model.change="teamDraft.roles_on" wire:change="saveTeamDraft" class="checkbox checkbox-xs" />
                <span class="{{ $label }}">{{ __('Roles') }}</span>
            </label>
            <x-lesson.team-rows :field="'roles'" :list="$lists['roles']" :rows="$draft['roles'] ?? []" />
            @if ($mode === 'budget' && ($draft['presentation'] ?? '') === 'hold')
                {{-- Where the ship sits on the plate, and how deep it goes as it fills. --}}
                <div class="grid grid-cols-2 gap-2">
                    @foreach ([
                        ['x', __('Ship across (%)'), 0, 100, 1],
                        ['y', __('Ship bottom (%)'), 0, 200, 1],
                        ['h', __('Ship height (%)'), 5, 400, 1],
                        ['waterline', __('Waterline'), 0, 1, 0.01],
                    ] as [$key, $text, $min, $max, $step])
                        <label class="block">
                            <span class="{{ $label }}">{{ $text }}</span>
                            <input type="number" min="{{ $min }}" max="{{ $max }}" step="{{ $step }}"
                                   wire:model.blur="teamDraft.hold.{{ $key }}" wire:change="saveTeamDraft" class="input input-sm mt-1 w-full" />
                            @error("teamDraft.hold.{$key}") <span class="text-2xs text-error">{{ $message }}</span> @enderror
                        </label>
                    @endforeach
                </div>
            @endif
        </div>
    </x-ui.settings-section>
</div>
