{{-- Class meters are the teacher's choice, never brought along by a Decision point: this is the
     switch that adds them (EditsStoryGame::addStoryMeters). Shown in Settings and on a choice. --}}
<div class="space-y-1.5" data-story-meters-add>
    <span class="text-2xs uppercase tracking-widest text-panel-hint">{{ __('Class meters') }}</span>
    <p class="text-xs text-panel-hint">{{ __('Let each choice push a few meters up or down, so the class sees what its decisions cost.') }}</p>
    <button type="button" wire:click="addStoryMeters" class="btn btn-sm btn-outline mt-1">
        {{ __('Add class meters') }}
    </button>
</div>
