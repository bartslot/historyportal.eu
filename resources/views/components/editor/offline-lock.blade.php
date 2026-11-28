{{-- No connection: every edit is a Livewire request, so nothing could be saved. Say so and pause the work area
     (the same lock the collab overlay uses) until the browser is back online, instead of clicks silently doing
     nothing (Bart, 2026-11-28, on a flight). Browser online/offline events, so it also clears by itself.
     The overlay only stops the pointer, so keys are stopped too: the focused field is left and typing and the
     editor's shortcuts are swallowed in the capture phase, before any editor handler sees them. --}}
<div wire:ignore
     x-data="{
        offline: ! navigator.onLine,
        swallow (e) { if (this.offline) { e.preventDefault(); e.stopImmediatePropagation() } },
        goOffline () { this.offline = true; document.activeElement?.blur?.() },
     }"
     x-init="if (offline) goOffline(); ['keydown', 'beforeinput', 'paste', 'drop'].forEach((t) => window.addEventListener(t, (e) => swallow(e), true))"
     @offline.window="goOffline()" @online.window="offline = false">
    <div x-cloak x-show="offline" class="collab-lock" data-offline-lock>
        <div class="collab-lock-bar alert" role="status">
            <x-ui.icon name="problem" class="h-5 w-5 shrink-0" />
            <span class="text-prose">{{ __("You're offline. Nothing can be saved until the connection is back.") }}</span>
        </div>
    </div>
</div>
