@props(['lesson'])

{{-- How long a scene's timeline runs in this lesson. A scene whose length was changed by hand keeps its own. --}}
<label class="mb-6 flex items-center justify-between gap-3" data-scene-length-setting>
    <span class="text-xs text-base-content">{{ __('Scene') }}</span>
    <span class="flex items-center gap-1.5 text-xs text-panel-hint">
        <input type="number" min="{{ \App\Models\Lesson::SCENE_LENGTH_MIN_MS }}" max="{{ \App\Models\Lesson::SCENE_LENGTH_MAX_MS }}" step="100"
               value="{{ $lesson->sceneLengthMs() }}"
               wire:change="setSceneLength($event.target.value)"
               class="input input-xs w-20 text-right" />
        ms
    </span>
</label>
