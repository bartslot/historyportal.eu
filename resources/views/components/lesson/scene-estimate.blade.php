@props(['scene'])

@php
    $set = ($scene->config ?? [])['estimate_seconds'] ?? null;
    $default = round($scene->defaultEstimateSeconds() / 60, 1);
@endphp

{{-- How long this scene usually takes the class. A quiz or a map is paced by the students, so its
     length is a guess: it sizes the scene on the player's chapter bar and adds up into the lesson's
     total. Empty means the default, shown as the placeholder. --}}
<label class="form-control mt-3 text-sm">
    <span class="mb-1 block text-2xs font-semibold uppercase tracking-wider text-slate-400">{{ __('Duration') }} ({{ __('minutes') }})</span>
    <input type="number" min="0.5" max="60" step="0.5" inputmode="decimal"
           value="{{ $set ? round($set / 60, 1) : '' }}" placeholder="≈ {{ $default }}"
           @change="$wire.setSceneEstimate({{ $scene->id }}, $event.target.value === '' ? null : Number($event.target.value))"
           class="input input-xs input-bordered w-24 bg-slate-900" />
</label>
