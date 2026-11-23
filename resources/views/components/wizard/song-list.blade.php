{{--
    The music library as a list to pick from: play a song to hear it (one at a time, across every list
    on the page), then Use it. Shared by Lesson settings > Music and the scene inspector's Music tab.

    <x-wizard.song-list :tracks="$tracks" action="useTrack" :in-use="$ids" />
    $tracks: MusicTrack rows (music only, not ambience). action: the Livewire method Use calls with the
    track id. in-use: ids already playing here, marked and not offered again.
--}}
@props(['tracks', 'action', 'inUse' => [], 'useLabel' => null])

@php $inUse = collect($inUse)->filter()->map(fn ($id) => (int) $id)->all(); @endphp

<div {{ $attributes->merge(['class' => 'space-y-1']) }} x-data="songListPreview()" x-on:livewire:navigating.window="stop()" data-song-list>
    <div class="flex items-center justify-between gap-2">
        <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Songs') }}</span>
        <span class="text-2xs text-panel-hint">{{ trans_choice(':count song|:count songs', $tracks->count(), ['count' => $tracks->count()]) }}</span>
    </div>
    <p x-show="failed" x-cloak class="text-xs text-error">{{ __('That song could not be loaded.') }}</p>
    <ul class="max-h-64 divide-y divide-panel-hairline overflow-y-auto rounded-box border border-panel-hairline">
        @foreach ($tracks as $track)
            @php $used = in_array($track->id, $inUse, true); @endphp
            <li class="flex items-center gap-2 px-2 py-1.5" wire:key="song-{{ $track->id }}" data-song="{{ $track->id }}"
                :class="current === {{ $track->id }} && 'bg-base-200'">
                <button type="button" class="btn btn-circle btn-ghost btn-xs shrink-0"
                        x-on:click="toggle({{ $track->id }}, @js($track->url()))"
                        :aria-label="current === {{ $track->id }} ? @js(__('Stop :title', ['title' => $track->title])) : @js(__('Play :title', ['title' => $track->title]))"
                        :title="current === {{ $track->id }} ? @js(__('Stop')) : @js(__('Play'))" data-song-play>
                    <x-icons.play class="h-3 w-3" x-show="current !== {{ $track->id }}" />
                    <x-icons.pause class="h-3 w-3" x-show="current === {{ $track->id }}" x-cloak />
                </button>
                <span class="min-w-0 flex-1">
                    <span class="block truncate text-xs font-medium text-panel-value">{{ $track->title }}</span>
                    <span class="block text-2xs text-panel-hint">
                        <span x-text="current === {{ $track->id }} ? clock(position) + ' / ' + clock(duration) : ''"></span>
                        @if ($track->bpm)
                            <span x-show="current !== {{ $track->id }}">{{ __(':bpm BPM', ['bpm' => rtrim(rtrim(number_format($track->bpm, 1), '0'), '.')]) }}</span>
                        @endif
                    </span>
                </span>
                @if ($used)
                    <span class="badge badge-ghost badge-xs shrink-0">{{ __('In use') }}</span>
                @else
                    <button type="button" class="btn btn-xs btn-outline shrink-0" wire:click="{{ $action }}({{ $track->id }})"
                            x-on:click="stop()" aria-label="{{ __('Use :title', ['title' => $track->title]) }}" data-song-use>
                        {{ $useLabel ?? __('Use') }}
                    </button>
                @endif
            </li>
        @endforeach
    </ul>
</div>
