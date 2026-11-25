@props(['lesson'])

{{-- Several accounts in one lesson: who else has the editor open (editor/collab.js fills $store.collab), and
     who may edit at all (LessonEditors). Lives in the wire:ignore top bar, so everything moving is Alpine. --}}
<div x-data="{ editorsOpen: false }" class="flex items-center gap-1 self-center" data-collab-people>
    <template x-for="p in ($store.collab?.people ?? []).filter(p => !p.me)" :key="p.id">
        <span class="collab-avatar" :style="`--collab-color: ${p.color}`" x-text="p.initials"
              :data-tooltip="p.name" :aria-label="p.name"></span>
    </template>

    <button type="button" @click="editorsOpen = true"
            class="grid h-11 w-11 place-items-center rounded-xl text-panel-hint transition hover:bg-base-200 hover:text-primary"
            data-tooltip="{{ __('Editors') }}" aria-label="{{ __('Editors') }}">
        <x-ui.icon name="account-add" class="h-6 w-6" />
    </button>

    @teleport('body')
        <div class="modal" :class="editorsOpen && 'modal-open'" @keydown.escape.window="editorsOpen = false">
            <div class="modal-box hp-modals max-w-md border border-base-300">
                <button type="button" class="btn btn-sm btn-ghost btn-square absolute right-3 top-3" @click="editorsOpen = false" aria-label="{{ __('Close') }}">
                    <x-ui.icon name="close" />
                </button>
                <livewire:wizard.lesson-editors :lesson-id="$lesson->id" wire:key="lesson-editors-{{ $lesson->id }}" />
            </div>
            <button type="button" class="modal-backdrop" @click="editorsOpen = false" aria-label="{{ __('Close') }}"></button>
        </div>
    @endteleport
</div>
