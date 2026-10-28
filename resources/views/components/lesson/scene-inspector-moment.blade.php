@props(['draft' => [], 'isDefault' => true, 'layers' => []])

{{-- Power-meter moment on a story panel (EditsMoment). Every field autosaves through
     saveMomentDraft(); every save is a Scene save, so Cmd-Z undoes it, and Reset puts back the
     moment the lesson was built with. The words, meter and after line are in view; timing, teams,
     the reaction and the payoff sit under a closed Advanced. --}}
@php
    $on = (bool) ($draft['enabled'] ?? false);
    $label = 'text-xs font-semibold uppercase tracking-wide text-panel-label';
    $payoff = $draft['payoff']['type'] ?? 'none';
    $input = $draft['input'] ?? 'words';
    $sound = in_array($input, \App\Services\Lessons\MomentSpec::WORDLESS_INPUTS, true);
    $mic = in_array($input, \App\Services\Lessons\MomentSpec::MIC_INPUTS, true);
    $gesture = $draft['input_options']['gesture'] ?? 'shake';
    $race = (bool) ($draft['race']['enabled'] ?? false);
    $inputs = [
        'words' => __('Shouting the right words (tap)'),
        'loudness' => __('Cheering (microphone)'),
        'blow' => __('Blowing (microphone)'),
        'rhythm' => __('Clapping in rhythm (microphone)'),
        'silence' => __('Keeping quiet (microphone)'),
        'motion' => __('Shaking or tilting the phone (own device)'),
    ];
    $words = [
        'right' => [__('Right words'), __('Add right word'), \App\Services\Lessons\MomentSpec::RIGHT_MAX],
        'wrong' => [__('Wrong words'), __('Add wrong word'), \App\Services\Lessons\MomentSpec::WRONG_MAX],
    ];
    $ambients = [
        '' => __('Layer motion'), 'bob' => __('Bob'), 'roll' => __('Roll'), 'billow' => __('Billow'), 'swell' => __('Sea swell'),
        'breeze' => __('Breeze'), 'flutter' => __('Flutter'), 'drift' => __('Drift'), 'flicker' => __('Flicker'), 'rise' => __('Smoke'), 'oars' => __('Oars'),
    ];
    $moves = [
        'hold' => __('Hold'), 'push' => __('Push in'), 'pull' => __('Pull out'), 'pan-l' => __('Pan left'), 'pan-r' => __('Pan right'),
        'tilt-up' => __('Tilt up'), 'tilt-down' => __('Tilt down'), 'truck-l' => __('Truck left'), 'truck-r' => __('Truck right'), 'shake' => __('Shake'),
    ];
    $layerOptions = ['' => __('None')] + $layers;
@endphp

<section class="space-y-3 border-t border-panel-hairline pt-3" data-moment-inspector>
    <div class="flex items-center justify-between gap-2">
        <x-ui.toggle-row class="flex-1" :label="__('Power-meter moment')" :checked="$on" on-change="toggleMoment" />
        <button type="button" wire:click="resetMoment" @disabled($isDefault)
                class="btn btn-ghost btn-xs gap-1" data-tooltip="{{ __('Put back the moment as the lesson was built. Cmd-Z undoes single edits.') }}">
            <x-icons.arrow-path class="h-3.5 w-3.5" />
            {{ __('Reset') }}
        </button>
    </div>

    @if ($on)
        <div class="space-y-2">
            <label class="block">
                <span class="{{ $label }}">{{ __('Meter label') }}</span>
                <input type="text" maxlength="80" wire:model.blur="momentDraft.meter_label" wire:change="saveMomentDraft" class="input input-sm mt-1 w-full" />
            </label>
            <label class="block">
                <span class="{{ $label }}">{{ __('Instruction on screen') }}</span>
                <input type="text" maxlength="300" wire:model.blur="momentDraft.prompt" wire:change="saveMomentDraft" class="input input-sm mt-1 w-full" />
            </label>
            <label class="block">
                <span class="{{ $label }}">{{ __('The class fills the meter by') }}</span>
                <select wire:model.change="momentDraft.input" wire:change="saveMomentDraft" class="select select-sm mt-1 w-full">
                    @foreach ($inputs as $value => $name)
                        <option value="{{ $value }}">{{ $name }}</option>
                    @endforeach
                </select>
            </label>
        </div>

        @if ($input === 'words' && ! $race)
            {{-- One word at a time over the picture (word-stream.js), or all at once on a card. --}}
            <div class="grid grid-cols-3 gap-2" data-moment-words-style>
                <label class="col-span-2 block">
                    <span class="{{ $label }}">{{ __('The words appear') }}</span>
                    <select wire:model.change="momentDraft.words_style" wire:change="saveMomentDraft" class="select select-sm mt-1 w-full">
                        <option value="stream">{{ __('One by one over the picture') }}</option>
                        <option value="buttons">{{ __('All at once on a card') }}</option>
                    </select>
                </label>
                @if (($draft['words_style'] ?? 'buttons') === 'stream')
                    <label class="block">
                        <span class="{{ $label }}">{{ __('Seconds per word') }}</span>
                        <input type="number" min="1" max="6" step="0.5" placeholder="2.5" wire:model.blur="momentDraft.input_options.word_seconds" wire:change="saveMomentDraft" class="input input-sm mt-1 w-full" />
                        @error('momentDraft.input_options.word_seconds') <span class="text-2xs text-error">{{ $message }}</span> @enderror
                    </label>
                @endif
            </div>
        @endif

        <x-ui.toggle-row :label="__('Harbour race: a ship per team')" :checked="$race" on-change="toggleMomentRace" />

        @foreach ($words as $side => [$heading, $addLabel, $max])
            @php $rows = $draft['words'][$side] ?? []; @endphp
            <div class="space-y-1.5" data-moment-words="{{ $side }}">
                <div class="flex items-center justify-between gap-2">
                    <h4 class="{{ $label }}">{{ $heading }}</h4>
                    <span class="text-2xs text-panel-label">{{ count($rows) }} / {{ $max }}</span>
                </div>
                @foreach ($rows as $i => $word)
                    <div class="flex items-center gap-2" wire:key="moment-{{ $side }}-{{ $i }}">
                        <input type="text" maxlength="40" aria-label="{{ $heading }} {{ $i + 1 }}"
                               wire:model.blur="momentDraft.words.{{ $side }}.{{ $i }}" wire:change="saveMomentDraft"
                               class="input input-sm flex-1" />
                        <button type="button" wire:click="removeMomentWord('{{ $side }}', {{ $i }})"
                                class="btn btn-ghost btn-xs btn-square" aria-label="{{ __('Remove') }}" data-tooltip="{{ __('Remove') }}">
                            <x-icons.x-mark class="h-3.5 w-3.5" />
                        </button>
                    </div>
                @endforeach
                @if (count($rows) < $max)
                    <button type="button" wire:click="addMomentWord('{{ $side }}')" class="btn btn-ghost btn-xs gap-1">
                        <x-icons.plus class="h-3.5 w-3.5" />
                        {{ $addLabel }}
                    </button>
                @endif
            </div>
        @endforeach

        <label class="block">
            <span class="{{ $label }}">{{ $sound ? __('Meter size (steps)') : __('Right words to fill the meter') }}</span>
            <input type="number" min="1" max="{{ $sound ? \App\Services\Lessons\MomentSpec::RIGHT_MAX : max(1, count($draft['words']['right'] ?? [])) }}" wire:model.blur="momentDraft.goal" wire:change="saveMomentDraft" class="input input-sm mt-1 w-full" />
            @error('momentDraft.goal') <span class="text-2xs text-error">{{ $message }}</span> @enderror
        </label>

        <div class="space-y-1.5">
            <label class="block">
                <span class="{{ $label }}">{{ __('Narrator after the meter is full') }}</span>
                <textarea rows="2" maxlength="1200" wire:model.blur="momentDraft.after" wire:change="saveMomentDraft" class="textarea textarea-sm mt-1 w-full"></textarea>
            </label>
            @if (($draft['after'] ?? '') !== '')
                <div class="flex items-center justify-between gap-2">
                    <span class="badge badge-sm {{ ($draft['after_audio'] ?? '') !== '' ? 'badge-success' : 'badge-ghost' }}">
                        {{ ($draft['after_audio'] ?? '') !== '' ? __('Narrated') : __('Shown as text') }}
                    </span>
                    <button type="button" wire:click="renarrateMomentAfter" wire:loading.attr="disabled" class="btn btn-ghost btn-xs gap-1"
                            data-tooltip="{{ __('Record this line in the narrator\'s voice') }}">
                        <x-icons.microphone class="h-3.5 w-3.5" />
                        {{ __('Re-narrate') }}
                    </button>
                </div>
            @endif
        </div>

        <x-ui.settings-section :title="__('Advanced')" :open="false" name="moment-advanced" class="-mx-4">
            <div class="space-y-3">
                <label class="block">
                    <span class="{{ $label }}">{{ __('Name') }}</span>
                    <input type="text" maxlength="80" wire:model.blur="momentDraft.name" wire:change="saveMomentDraft" class="input input-sm mt-1 w-full" />
                </label>

                <div class="grid grid-cols-2 gap-2">
                    <label class="block">
                        <span class="{{ $label }}">{{ __('Start at second') }}</span>
                        <input type="number" min="0" max="600" step="0.5" placeholder="{{ __('At the end') }}"
                               value="{{ is_numeric($draft['at'] ?? null) ? $draft['at'] : '' }}"
                               wire:model.blur="momentDraft.at" wire:change="saveMomentDraft" class="input input-sm mt-1 w-full" />
                    </label>
                    <label class="block">
                        <span class="{{ $label }}">{{ __('Timer (seconds)') }}</span>
                        <input type="number" min="0" max="300" wire:model.blur="momentDraft.seconds" wire:change="saveMomentDraft" class="input input-sm mt-1 w-full" />
                        @error('momentDraft.seconds') <span class="text-2xs text-error">{{ $message }}</span> @enderror
                    </label>
                    <label class="block">
                        <span class="{{ $label }}">{{ __('Teams') }}</span>
                        <input type="number" min="0" max="8" placeholder="{{ __('None') }}" wire:model.blur="momentDraft.teams" wire:change="saveMomentDraft" class="input input-sm mt-1 w-full" />
                        @error('momentDraft.teams') <span class="text-2xs text-error">{{ $message }}</span> @enderror
                    </label>
                    <label class="block">
                        <span class="{{ $label }}">{{ __('Meter with teams') }}</span>
                        <select wire:model.change="momentDraft.team_meter" wire:change="saveMomentDraft" class="select select-sm mt-1 w-full">
                            <option value="shared">{{ __('One meter, teams take turns') }}</option>
                            <option value="each">{{ __('A meter per team') }}</option>
                        </select>
                    </label>
                </div>

                @if ($sound)
                    <div class="grid grid-cols-2 gap-2 border-t border-panel-hairline pt-3">
                        @if ($mic)
                            <label class="block">
                                <span class="{{ $label }}">{{ __('Loudness needed') }}</span>
                                <input type="number" min="0.05" max="1" step="0.05" placeholder="0.4" wire:model.blur="momentDraft.input_options.threshold" wire:change="saveMomentDraft" class="input input-sm mt-1 w-full" />
                            </label>
                        @endif
                        @if ($input === 'rhythm')
                            <label class="block">
                                <span class="{{ $label }}">{{ __('Tempo (beats per minute)') }}</span>
                                <input type="number" min="30" max="200" placeholder="60" wire:model.blur="momentDraft.input_options.bpm" wire:change="saveMomentDraft" class="input input-sm mt-1 w-full" />
                            </label>
                        @endif
                        @if ($input === 'motion')
                            <label class="block">
                                <span class="{{ $label }}">{{ __('Movement') }}</span>
                                <select wire:model.change="momentDraft.input_options.gesture" wire:change="saveMomentDraft" class="select select-sm mt-1 w-full">
                                    <option value="shake">{{ __('Shake') }}</option>
                                    <option value="tilt">{{ __('Tilt and hold') }}</option>
                                </select>
                            </label>
                        @endif
                        @if ($input === 'rhythm' || ($input === 'motion' && $gesture === 'shake'))
                            <label class="block">
                                <span class="{{ $label }}">{{ $input === 'rhythm' ? __('Claps to fill the meter') : __('Shakes to fill the meter') }}</span>
                                <input type="number" min="2" max="32" placeholder="8" wire:model.blur="momentDraft.input_options.beats" wire:change="saveMomentDraft" class="input input-sm mt-1 w-full" />
                            </label>
                        @endif
                        @if ($input === 'silence' || ($input === 'motion' && $gesture === 'tilt'))
                            <label class="block">
                                <span class="{{ $label }}">{{ $input === 'silence' ? __('Quiet for (seconds)') : __('Hold the tilt (seconds)') }}</span>
                                <input type="number" min="1" max="30" placeholder="5" wire:model.blur="momentDraft.input_options.hold_seconds" wire:change="saveMomentDraft" class="input input-sm mt-1 w-full" />
                            </label>
                        @endif
                    </div>
                @endif

                <div class="space-y-2 border-t border-panel-hairline pt-3">
                    <h4 class="{{ $label }}">{{ __('Reaction per right word') }}</h4>
                    <select wire:model.change="momentDraft.react.layer" wire:change="saveMomentDraft" aria-label="{{ __('Layer') }}" class="select select-sm w-full">
                        @foreach ($layerOptions as $id => $title)
                            <option value="{{ $id }}">{{ $title }}</option>
                        @endforeach
                    </select>
                    <div class="grid grid-cols-2 gap-2">
                        <select wire:model.change="momentDraft.react.ambient" wire:change="saveMomentDraft" aria-label="{{ __('Motion') }}" class="select select-sm w-full">
                            @foreach ($ambients as $mode => $name)
                                <option value="{{ $mode }}">{{ $name }}</option>
                            @endforeach
                        </select>
                        <label class="input input-sm w-full">
                            <span class="{{ $label }}">{{ __('Amount') }}</span>
                            <input type="number" min="0" max="2" step="0.1" wire:model.blur="momentDraft.react.amount" wire:change="saveMomentDraft" class="grow" />
                        </label>
                    </div>
                    {{-- How far the layer gets going before the meter is full (wind-world.js). --}}
                    <label class="input input-sm w-full" data-tooltip="{{ __('How far the layer moves forward as the meter fills, in % of the picture') }}">
                        <span class="{{ $label }}">{{ __('Moves forward') }}</span>
                        <input type="number" min="0" max="30" step="1" wire:model.blur="momentDraft.react.drift" wire:change="saveMomentDraft" class="grow" />
                        <span class="text-2xs text-panel-label">%</span>
                    </label>
                </div>

                <div class="space-y-2 border-t border-panel-hairline pt-3">
                    <h4 class="{{ $label }}">{{ __('When the meter is full') }}</h4>
                    <div wire:key="moment-payoff-{{ $payoff }}">
                        <x-ui.segmented panel class="w-full" name="moment-payoff" :value="$payoff"
                                        :options="[['move', __('Move a layer')], ['camera', __('Camera move')], ['none', __('Nothing')]]"
                                        tab-class="flex-1"
                                        on-change="$wire.call('setMomentPayoff', $event.target.value)" />
                    </div>
                    @if ($payoff === 'move')
                        <select wire:model.change="momentDraft.payoff.layer" wire:change="saveMomentDraft" aria-label="{{ __('Layer') }}" class="select select-sm w-full">
                            @foreach ($layerOptions as $id => $title)
                                <option value="{{ $id }}">{{ $title }}</option>
                            @endforeach
                        </select>
                        <div class="grid grid-cols-3 gap-2">
                            <label class="input input-sm w-full">
                                <span class="{{ $label }}">X</span>
                                <input type="number" min="-50" max="150" wire:model.blur="momentDraft.payoff.to_x" wire:change="saveMomentDraft" class="grow" />
                            </label>
                            <label class="input input-sm w-full">
                                <span class="{{ $label }}">Y</span>
                                <input type="number" min="-50" max="150" wire:model.blur="momentDraft.payoff.to_y" wire:change="saveMomentDraft" class="grow" />
                            </label>
                            <label class="input input-sm w-full">
                                <span class="{{ $label }}">{{ __('Seconds') }}</span>
                                <input type="number" min="0.3" max="30" step="0.5" wire:model.blur="momentDraft.payoff.duration" wire:change="saveMomentDraft" class="grow" />
                            </label>
                        </div>
                    @elseif ($payoff === 'camera')
                        <div class="grid grid-cols-3 gap-2">
                            <select wire:model.change="momentDraft.payoff.camera.move" wire:change="saveMomentDraft" aria-label="{{ __('Camera move') }}" class="select select-sm col-span-3 w-full">
                                @foreach ($moves as $move => $name)
                                    <option value="{{ $move }}">{{ $name }}</option>
                                @endforeach
                            </select>
                            <label class="input input-sm col-span-2 w-full">
                                <span class="{{ $label }}">{{ __('Amount') }}</span>
                                <input type="number" min="0" max="2" step="0.1" wire:model.blur="momentDraft.payoff.camera.amount" wire:change="saveMomentDraft" class="grow" />
                            </label>
                            <label class="input input-sm w-full">
                                <span class="{{ $label }}">{{ __('Seconds') }}</span>
                                <input type="number" min="0.3" max="30" step="0.5" wire:model.blur="momentDraft.payoff.camera.duration" wire:change="saveMomentDraft" class="grow" />
                            </label>
                        </div>
                    @endif
                </div>

                @if ($race)
                    <div class="space-y-2 border-t border-panel-hairline pt-3" data-moment-race>
                        <h4 class="{{ $label }}">{{ __('Harbour race') }}</h4>
                        <div class="grid grid-cols-3 gap-2">
                            <label class="input input-sm w-full">
                                <span class="{{ $label }}">{{ __('Start line') }}</span>
                                <input type="number" min="-50" max="150" wire:model.blur="momentDraft.race.start_x" wire:change="saveMomentDraft" class="grow" />
                            </label>
                            <label class="input input-sm w-full">
                                <span class="{{ $label }}">{{ __('Finish line') }}</span>
                                <input type="number" min="-50" max="150" wire:model.blur="momentDraft.race.finish_x" wire:change="saveMomentDraft" class="grow" />
                            </label>
                            <label class="input input-sm w-full" data-tooltip="{{ __('Seconds the 1642 fleet takes on a pupil\'s own device') }}">
                                <span class="{{ $label }}">{{ __('Fleet') }}</span>
                                <input type="number" min="5" max="120" wire:model.blur="momentDraft.race.ghost_seconds" wire:change="saveMomentDraft" class="grow" />
                            </label>
                        </div>
                        <label class="block">
                            <span class="{{ $label }}">{{ __('Narrator after the race') }}</span>
                            <textarea rows="2" maxlength="1200" wire:model.blur="momentDraft.race.after" wire:change="saveMomentDraft" class="textarea textarea-sm mt-1 w-full"></textarea>
                        </label>
                        <label class="block">
                            <span class="{{ $label }}">{{ __('Narrator after a race on a pupil\'s own device') }}</span>
                            <textarea rows="2" maxlength="1200" wire:model.blur="momentDraft.race.after_solo" wire:change="saveMomentDraft" class="textarea textarea-sm mt-1 w-full"></textarea>
                        </label>
                    </div>
                @endif

                <label class="block border-t border-panel-hairline pt-3">
                    <span class="{{ $label }}">{{ __('Note for the teacher') }}</span>
                    <textarea rows="2" maxlength="1200" wire:model.blur="momentDraft.why" wire:change="saveMomentDraft" class="textarea textarea-sm mt-1 w-full"></textarea>
                </label>
            </div>
        </x-ui.settings-section>
    @endif
</section>
