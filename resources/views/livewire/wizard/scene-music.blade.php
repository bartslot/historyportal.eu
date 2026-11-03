{{-- Scene inspector > Music. See App\Livewire\Wizard\SceneMusic. --}}
<div class="space-y-3 px-1" x-data="sceneMusicPreview(@js($trackUrls))" x-on:livewire:navigating.window="stop()">
    <div class="flex items-center justify-between gap-2">
        <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Music') }}</span>
        <div class="flex items-center gap-1">
            <button type="button" class="btn btn-xs btn-ghost" wire:click="undo" @disabled(! $canUndo)
                    aria-label="{{ __('Undo music change') }}" title="{{ __('Undo music change') }}">
                <x-icons.arrow-uturn-left class="h-3.5 w-3.5" />
            </button>
            <button type="button" class="btn btn-xs btn-outline" data-music-preview
                    x-on:click="toggle($wire.music)" :disabled="! $wire.music?.layers?.length">
                <span x-show="! playing">{{ __('Preview') }}</span>
                <span x-show="playing" x-cloak>{{ __('Stop') }}</span>
            </button>
        </div>
    </div>

    {{-- Keyed on the state: morph updates a checkbox's attribute, not its property, so after Undo the switch drew the old state. --}}
    <x-ui.toggle-row :label="__('Continue from scene before')" :checked="$music === null"
                     wire:key="music-inherit-{{ $music === null ? 'on' : 'off' }}"
                     on-change="setInherit($event.target.checked)" />

    <p x-show="failed" x-cloak class="text-xs text-error">{{ __('A track could not be loaded.') }}</p>

    @if ($music === null)
        <p class="text-xs text-panel-hint">{{ __('This scene keeps playing the music of the scene before it.') }}</p>
    @else
        @forelse ($music['layers'] as $i => $layer)
            @php $track = $tracks->firstWhere('id', $layer['track_id']); @endphp
            <div class="space-y-1 rounded-box border border-panel-hairline p-2" wire:key="music-layer-{{ $layer['track_id'] }}">
                <div class="flex items-center justify-between gap-2">
                    <span class="truncate text-xs font-medium text-panel-value">{{ $track?->title ?? __('Missing track') }}</span>
                    <button type="button" class="btn btn-xs btn-ghost" wire:click="removeLayer({{ $i }})"
                            aria-label="{{ __('Remove track') }}" title="{{ __('Remove track') }}">
                        <x-icons.x-mark class="h-4 w-4" />
                    </button>
                </div>
                <x-ui.slider-row :label="__('Volume')" :value="$layer['volume']" min="0" max="1" step="0.05"
                                 unit="%" :display="(int) round($layer['volume'] * 100)" :default="0.6"
                                 on-change="$set('music.layers.{{ $i }}.volume', Number($event.target.value))" />
                <x-ui.toggle-row :label="__('Loop')" :checked="$layer['loop']" wire:key="music-loop-{{ $layer['track_id'] }}-{{ $layer['loop'] ? 1 : 0 }}"
                                 on-change="$set('music.layers.{{ $i }}.loop', $event.target.checked)" />
                <div class="grid grid-cols-2 gap-2">
                    @foreach ([
                        'offset' => __('Start at'),
                        'fade_in' => __('Fade in'),
                        'loop_start' => __('Loop from'),
                        'loop_end' => __('Loop until'),
                        'fade_out' => __('Fade out'),
                    ] as $field => $label)
                        @continue(! $layer['loop'] && str_starts_with($field, 'loop_'))
                        <label class="block">
                            <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ $label }} (s)</span>
                            <input type="number" min="0" step="0.1" inputmode="decimal"
                                   wire:model.change="music.layers.{{ $i }}.{{ $field }}"
                                   @if ($field === 'loop_end') placeholder="{{ __('End') }}" @endif
                                   class="input input-xs w-full" aria-label="{{ $label }} ({{ __('seconds') }})" />
                        </label>
                    @endforeach
                </div>
            </div>
        @empty
            <p class="text-xs text-panel-hint">{{ __('No music plays under this scene.') }}</p>
        @endforelse

        @if (count($music['layers']) < \App\Support\SceneMusic::MAX_LAYERS && $tracks->isNotEmpty())
            <div class="flex gap-2">
                <select wire:model="addTrackId" class="select select-xs flex-1" aria-label="{{ __('Choose a track') }}">
                    <option value="">{{ __('Choose a track') }}</option>
                    @foreach ($tracks as $t)
                        <option value="{{ $t->id }}">{{ $t->title }}</option>
                    @endforeach
                </select>
                <button type="button" class="btn btn-xs btn-primary" wire:click="addLayer">{{ __('Add') }}</button>
            </div>
        @endif

        <x-ui.slider-row :label="__('Crossfade')" :value="$music['crossfade']" min="0" max="10" step="0.5"
                         unit="s" :display="$music['crossfade']" :default="2"
                         on-change="$set('music.crossfade', Number($event.target.value))" />
        <x-ui.slider-row :label="__('Under the voice')" :value="$music['duck']" min="0" max="1" step="0.05"
                         unit="%" :display="(int) round($music['duck'] * 100)" :default="0.4"
                         on-change="$set('music.duck', Number($event.target.value))" />
    @endif

    @if ($isAdmin)
        <details class="rounded-box border border-panel-hairline p-2">
            <summary class="cursor-pointer text-xs font-medium text-panel-value">{{ __('Add a track to the library') }}</summary>
            <form wire:submit="saveUpload" class="mt-2 space-y-2">
                <p class="text-xs text-panel-hint">{{ __('Download the song from Suno yourself on a paid plan, then upload the MP3 here.') }}</p>
                <input type="file" accept="audio/mpeg,audio/mp4,.mp3,.m4a" wire:model="upload" class="file-input file-input-xs w-full" aria-label="{{ __('Music file') }}" />
                @error('upload') <p class="text-xs text-error">{{ $message }}</p> @enderror
                <input type="text" wire:model="uploadTitle" class="input input-xs w-full" placeholder="{{ __('Title') }}" aria-label="{{ __('Title') }}" />
                @error('uploadTitle') <p class="text-xs text-error">{{ $message }}</p> @enderror
                <input type="url" wire:model="uploadSource" class="input input-xs w-full" placeholder="{{ __('Source link, e.g. the Suno share link') }}" aria-label="{{ __('Source link') }}" />
                @error('uploadSource') <p class="text-xs text-error">{{ $message }}</p> @enderror
                <select wire:model="uploadLicence" class="select select-xs w-full" aria-label="{{ __('Licence') }}">
                    @foreach ($licences as $licence)
                        <option value="{{ $licence->value }}">{{ $licence->label() }}</option>
                    @endforeach
                </select>
                <input type="text" wire:model="uploadNote" class="input input-xs w-full" placeholder="{{ __('Licence note, e.g. plan and download date') }}" aria-label="{{ __('Licence note') }}" />
                <button type="submit" class="btn btn-xs btn-primary w-full" wire:loading.attr="disabled" wire:target="upload,saveUpload">{{ __('Upload') }}</button>
            </form>
        </details>
    @endif
</div>
