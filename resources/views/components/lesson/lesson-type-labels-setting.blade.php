@props(['lesson'])

{{-- The lesson-type labels (LessonTypes) as "About this lesson" shows them, below the title screen
     since the calm title (2026-10-15), in every style. The switch sits with what it changes and
     previews its labels; a lesson with none has no switch (a control offers what it looks like). --}}
@php
    $types = \App\Support\LessonTypes::of($lesson);
    $on = $lesson->show_lesson_types ?? true;
@endphp
@if ($types !== [])
    <div class="mb-6 space-y-2" data-lesson-types-setting>
        <div class="flex items-center justify-between gap-3">
            <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('About this lesson') }}</span>
            @if (! $on)
                <button type="button" wire:click="setShowLessonTypes(true)" data-lesson-types-reset class="text-2xs text-panel-hint transition-colors hover:text-primary">{{ __('Reset to default') }}</button>
            @endif
        </div>
        <label class="flex items-center justify-between gap-3">
            <span class="text-xs text-base-content">{{ __('Lesson type labels') }}</span>
            <input type="checkbox" @checked($on) wire:change="setShowLessonTypes($event.target.checked)" data-lesson-types-toggle
                   class="toggle toggle-sm shrink-0" />
        </label>
        <ul class="flex flex-wrap gap-1.5" data-lesson-types-preview="{{ $on ? 'on' : 'off' }}" aria-hidden="true">
            @foreach ($types as $type)
                <li data-type-chip="{{ $type }}"
                    @class(['rounded-full px-2 py-0.5 text-2xs font-semibold transition-opacity',
                            'bg-type-interactive text-white' => $type === 'interactive',
                            'bg-type-comic text-white' => $type === 'comic',
                            'bg-type-teams text-white' => $type === 'teams',
                            'opacity-30 line-through' => ! $on])>{{ match ($type) { 'interactive' => __('Interactive'), 'comic' => __('Comic story'), 'teams' => __('Teams') } }}</li>
            @endforeach
        </ul>
    </div>
@endif
