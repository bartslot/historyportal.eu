@props(['lesson'])

{{-- The scene on screen is somebody else's: the work area turns read-only (the rail and the top bar stay
     usable) and offers Take over. The server refuses the edits anyway (GuardsLessonClaims); this only
     says so before anyone tries. wire:ignore: Livewire must not morph what collab.js keeps. --}}
<div wire:ignore x-data x-init="window.startLessonCollab?.($wire, @js(\App\Services\Collaboration\LessonCollaboration::editorConfig($lesson)))">
    <div x-cloak x-show="$store.collab && !$store.collab.mine && $store.collab.holder" class="collab-lock" data-collab-lock>
        <div class="collab-lock-bar alert">
            <span class="collab-avatar" :style="`--collab-color: ${$store.collab?.holder?.color}`" x-text="$store.collab?.holder?.initials"></span>
            <span class="text-prose" x-text="@js(__(':name is editing this scene')).replace(':name', $store.collab?.holder?.name ?? '')"></span>
            <button type="button" class="btn btn-sm btn-primary" @click="window.__lessonCollab?.takeOver()">{{ __('Take over') }}</button>
        </div>
    </div>

    <div x-cloak x-show="$store.collab?.notice" x-transition.opacity class="collab-notice alert" role="status">
        <span class="text-prose" x-text="$store.collab?.notice"></span>
    </div>
</div>
