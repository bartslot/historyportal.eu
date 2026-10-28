@props(['problem', 'scene', 'jump' => false])

{{-- One problem in a teacher's words (LessonProblems), with the ONE fix for the step that failed.
     At the top of the scene's own panel, and as a row in the Problems view (jump: the row opens
     that scene). While the fix runs the scene is generating, and the row says so. --}}
@php
    $blocks = $problem['severity'] === \App\Support\LessonProblems::BLOCKS;
    $busy = $scene?->status === 'generating';
    $label = match ($problem['fix']) {
        'audio' => __('Re-narrate'),
        'image', 'script' => __('Regenerate'),
        default => null,
    };
@endphp
<div data-scene-problem data-problem-row="{{ $problem['severity'] }}"
     @class(['flex items-start gap-2 rounded-lg border px-3 py-2',
             'border-error/40 bg-error/10' => $blocks,
             'border-warning/40 bg-warning/10' => ! $blocks])>
    <x-icons.exclamation-triangle @class(['mt-0.5 h-4 w-4 shrink-0', 'text-error' => $blocks, 'text-warning' => ! $blocks]) />
    <div class="min-w-0 flex-1">
        @if ($jump)
            <button type="button" wire:click="showProblemScene({{ $problem['scene_id'] }})"
                    class="block text-left text-xs text-base-content hover:text-primary">{{ $problem['message'] }}</button>
        @else
            <p class="text-xs text-base-content">{{ $problem['message'] }}</p>
        @endif
        @if ($scene?->status === 'failed' && $scene->updated_at)
            <p class="mt-0.5 text-prose text-slate-500" data-tooltip="{{ $scene->updated_at->isoFormat('D MMM YYYY, HH:mm') }}">{{ $scene->updated_at->diffForHumans() }}</p>
        @endif
    </div>
    @if ($busy)
        <span class="flex shrink-0 items-center gap-1 text-2xs text-slate-400"><x-icons.spinner class="h-3.5 w-3.5 animate-spin" />{{ __('Generating…') }}</span>
    @elseif ($label)
        <button type="button" wire:click="fixProblem({{ $problem['scene_id'] }}, '{{ $problem['fix'] }}')"
                wire:loading.attr="disabled" class="btn btn-ghost btn-xs shrink-0">{{ $label }}</button>
    @endif
</div>
