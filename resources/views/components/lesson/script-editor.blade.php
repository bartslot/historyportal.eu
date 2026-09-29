@props(['scene' => null])

{{-- The BOTTOM DOCK (Figma "Script panel"), with a tab per thing that belongs under the stage:

       Icons  — the icon library; pick one, or drag it onto the scene.
       Script — the scene's narration as timecoded lines synced to a REAL WaveSurfer play bar.

     One dock, so there is one height, one --work-bottom reservation and one resize grip however
     many tabs it grows: the canvas shrinks above it and it never overlays the scene. Its height is
     fixed: the drag-to-resize edge was grabbed by accident too often (Bart, 2026-09-29). View ▸
     Script hides and shows it. No close button, no cogwheel.

     It still lives in this file because the dock's geometry — height, resize, reserved space — is
     owned by the script editor's Alpine component. --}}
@php
    // One editable box per PARAGRAPH (blank-line separated). Single Enter = soft newline within a
    // paragraph; double Enter splits into a new paragraph (its own timecode + TTS topic).
    $paragraphs = $scene?->scriptParagraphs() ?? [];
    $audioUrl = $scene?->audioUrl();
    // Whether a recording is being made for this scene RIGHT NOW, decided on the server.
    // Pressing Re-narrate makes the wizard re-render, and that morph tears this panel down and
    // builds a new one — measured: destroy and init 300ms after the click. Everything the panel
    // only knew in the browser went with it, so the teacher was left looking at a play bar that
    // had forgotten it was waiting for anything, for ever. State the server owns survives that.
    $narrating = $scene?->status === 'generating' && ! $scene?->hasFreshAudio();
@endphp

{{-- {{ $attributes }} carries the wire:key="script-{sceneId}" from the parent so a scene change
     is a full teardown+rebuild (fresh lines + fresh WaveSurfer), not an in-place morph — otherwise
     the wire:ignore'd lines below would freeze the previous scene's script. --}}
<div x-show="$store.view.script" x-cloak
     {{ $attributes }}
     x-data="scriptEditor(@js($audioUrl), @js($paragraphs), {{ $scene?->id ?? 'null' }}, @js($narrating))"
     class="fixed bottom-0 z-30 flex flex-col overflow-hidden border-t border-slate-700/70 bg-base-300"
     :style="`left:var(--rail-w,11rem);right:var(--work-right,16rem);height:${panelH}px`">

    <div class="shrink-0 pb-1"></div>

    {{-- Which tab the dock is showing. Lives in $store.view alongside the panel toggles, so it
         survives a scene change (this component is rebuilt per scene) and a reload. --}}
    <div role="tablist" class="tabs tabs-boxed tabs-sm">
        <button type="button" role="tab" x-on:click="$store.view.showTab('timeline')"
                :aria-selected="$store.view.bottomTab === 'timeline'"
                :class="$store.view.bottomTab === 'timeline' ? 'tab-active' : ''"
                class="tab" data-tab="timeline">{{ __('Timeline') }}</button>
        <button type="button" role="tab" x-on:click="$store.view.showTab('icons')"
                :aria-selected="$store.view.bottomTab === 'icons'"
                :class="$store.view.bottomTab === 'icons' ? 'tab-active' : ''"
                class="tab">{{ __('Assets') }}</button>
        <button type="button" role="tab" x-on:click="$store.view.showTab('script')"
                :aria-selected="$store.view.bottomTab === 'script'"
                :class="$store.view.bottomTab === 'script' ? 'tab-active' : ''"
                class="tab">{{ __('Script') }}</button>
    </div>

    {{-- ── Timeline tab ──────────────────────────────────────────────────────────
         The rows are the scene's objects; a camera is one a map scene has. --}}
    <div x-show="$store.view.bottomTab === 'timeline'" x-cloak class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <x-lesson.animation-timeline :scene="$scene ?? null" />
    </div>

    {{-- ── Icons tab ─────────────────────────────────────────────────────────────
         Its own Livewire component: the dock owns the geometry, the panel owns the library. --}}
    <div x-show="$store.view.bottomTab === 'icons'" x-cloak class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <livewire:wizard.icon-panel />
    </div>

    {{-- ── Script tab ────────────────────────────────────────────────────────── --}}
    <div x-show="$store.view.bottomTab === 'script'" class="flex min-h-0 flex-1 flex-col overflow-hidden">

    {{-- EMPTY STATE — a scene with no narration is not a scene that cannot HAVE narration. Every
         kind can be narrated, voyage legs and map scenes included (the script is saved on the
         scene and read by the same TTS job), so offer the field instead of a dead sentence.
         Switched on Alpine's paras.length, not the server's, so the box appears the instant the
         teacher asks for it rather than after a round trip. --}}
    <div x-show="!paras.length" x-cloak
         class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2.5 px-4 py-6 text-center">
        <p class="max-w-sm text-xs leading-relaxed text-slate-500">
            {{ __('No narration yet. Write a few lines here and they will be read aloud over this scene.') }}
        </p>
        <button type="button" x-on:click="addNarration()"
                class="flex items-center gap-1.5 rounded-lg border border-slate-600/70 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-primary hover:text-amber-200">
            <!-- <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"/>
            </svg> -->
            <svg width="21" height="20" class="h-4 w-4" viewBox="0 0 21 20" fill="none" stroke="currentColor" stroke-width="1.5" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 6H15M6 9H10.5M0.75 10.5093C0.75 12.1104 1.87341 13.504 3.45746 13.737C4.58596 13.9029 5.72724 14.0296 6.87985 14.1155C7.23004 14.1416 7.55017 14.3253 7.74496 14.6174L10.5 18.75L13.255 14.6175C13.4498 14.3253 13.7699 14.1417 14.1201 14.1156C15.2727 14.0296 16.414 13.903 17.5425 13.7371C19.1266 13.5042 20.25 12.1106 20.25 10.5095V4.49056C20.25 2.88946 19.1266 1.49583 17.5425 1.26293C15.244 0.925013 12.8926 0.75 10.5003 0.75C8.10776 0.75 5.75612 0.925044 3.45747 1.26302C1.87342 1.49593 0.75 2.88956 0.75 4.49064V10.5093Z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>

            {{ __('Add narration') }}
        </button>
    </div>

    <div x-show="paras.length" x-cloak class="flex min-h-0 flex-1 flex-col overflow-hidden">
        {{-- Per-paragraph editable boxes, Alpine-managed (paras[]). wire:ignore so the 3s wire:poll
             morph can't reset the contenteditable text mid-edit; Alpine still updates timecodes /
             active state, and a scene change re-renders the whole component via wire:key.
             focusout saves; if focus left the panel entirely it also closes the script toolbar. --}}
        <div wire:ignore class="min-h-0 flex-1 overflow-y-auto px-3 py-2.5" x-on:focusout="onFocusOut($event)">
            <div class="space-y-3">
                <template x-for="(p, i) in paras" :key="p.id">
                    <div class="flex gap-3">
                        {{-- Timecode seeks; the paragraph is editable in place. --}}
                        <button type="button" x-on:click="seek(i)"
                                class="mt-0.5 w-9 shrink-0 cursor-pointer text-right font-mono text-2xs tabular-nums text-slate-500 transition hover:text-primary"
                                x-text="fmt(starts[i] ?? 0)"></button>
                        {{-- contenteditable paragraph. white-space:pre-wrap keeps soft newlines (single
                             Enter). Double Enter splits into a new box; Backspace at start merges up.
                             x-init seeds the text once (Alpine won't clobber it on later renders). --}}
                        <p data-line contenteditable="true" spellcheck="false"
                           x-init="$el.textContent = p.text"
                           x-on:input="onInput(i)"
                           x-on:keydown="onKeydown($event, i)"
                           x-on:paste="onPaste($event, i)"
                           x-on:focus="active = i; focusedPara = i"
                           x-on:keydown.escape.stop.prevent="$event.target.blur()"
                           :class="{
                               'text-amber-100': active === i,
                               'text-slate-300': active !== i,
                               'border-l-2 border-primary/60 pl-2': p.dirty,
                           }"
                           class="min-h-[1.6em] min-w-0 flex-1 cursor-text whitespace-pre-wrap rounded font-serif text-[15px] leading-relaxed transition hover:bg-white/5 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-primary/40"></p>
                    </div>
                </template>
            </div>
        </div>

        {{-- Script editing toolbar — shown while a paragraph is focused. Regenerate rewrites the
             focused paragraph from a short prompt; Summarize to list drops an on-slide bullet card.
             Cancelling mousedown keeps the paragraph's focus (and focusedPara) alive through a click
             on a BUTTON. It must not be cancelled over the toolbar's own prompt field, because the
             default action being cancelled IS the focus: the field could never be clicked into, and
             everything the teacher typed went into the narration behind it instead. --}}
        <div x-show="focusedPara !== null" x-cloak
             class="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-700/60 bg-base-200/40 px-3"
             x-on:mousedown="$event.target.closest('input, textarea, [contenteditable]') || $event.preventDefault()">
            <span class="text-2xs font-semibold uppercase tracking-widest text-slate-500">{{ __('Paragraph') }}</span>
            {{-- Regenerate with a prompt (inline expanding input). --}}
            <div class="flex items-center gap-1" x-show="!promptOpen">
                <button type="button" x-on:click="openPrompt()"
                        class="flex items-center gap-1 rounded-md border border-slate-600/70 px-2 py-1 text-2xs text-slate-200 transition hover:border-primary hover:text-amber-200 disabled:opacity-40"
                        :disabled="regenPara"
                        title="{{ __('Rewrite this paragraph from a prompt') }}">
                    <svg x-show="!regenPara" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/></svg>
                    <svg x-show="regenPara" x-cloak class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg>
                    {{-- "Regenerate" read as "make the audio again" and teachers avoided it for fear
                         of losing the words they had just written. It rewrites TEXT; it says so. --}}
                    <span x-text="regenPara ? @js(__('rewriting…')) : @js(__('Rewrite text'))"></span>
                </button>
            </div>
            <div class="flex min-w-0 flex-1 items-center gap-1" x-show="promptOpen" x-cloak>
                <input type="text" x-ref="prompt" x-model="promptText"
                       x-on:keydown.enter.stop.prevent="submitPrompt()"
                       x-on:keydown.escape.stop.prevent="closePrompt()"
                       placeholder="{{ __('e.g. make it shorter and more dramatic') }}"
                       class="min-w-0 flex-1 rounded-md border border-slate-600/70 bg-base-300 px-2 py-1 text-xs text-slate-100 placeholder:text-slate-500 focus:border-primary focus:outline-none" />
                <button type="button" x-on:click="submitPrompt()" :disabled="regenPara"
                        class="rounded-md bg-primary px-2 py-1 text-2xs font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-40">{{ __('Rewrite') }}</button>
                <button type="button" x-on:click="closePrompt()"
                        class="rounded-md px-1.5 py-1 text-2xs text-slate-400 hover:text-slate-200">✕</button>
            </div>
            {{-- Summarize the whole scene to an on-slide bullet list. --}}
            <button type="button" x-on:click="summarizeToList()" :disabled="summarizing"
                    class="flex items-center gap-1 rounded-md border border-slate-600/70 px-2 py-1 text-2xs text-slate-200 transition hover:border-primary hover:text-amber-200 disabled:opacity-40"
                    title="{{ __('Summarize the narration into a bullet list on the slide') }}">
                <svg x-show="!summarizing" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/></svg>
                <svg x-show="summarizing" x-cloak class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg>
                <span x-text="summarizing ? @js(__('summarizing…')) : @js(__('Summarize to list'))"></span>
            </button>
        </div>

        {{-- Play bar — the real WaveSurfer waveform, compact.
             Three states, and the control SAYS which one it is:
               · no audio yet     → a labelled "Narrate" button, because a dead play button left
                                    teachers with no way at all to get narration made;
               · text edited      → "Re-narrate" (the audio no longer matches the words);
               · audio up to date → the round Play/Pause. --}}
        <div class="flex shrink-0 items-center gap-2.5 border-t border-slate-700/60 bg-base-200/60 px-3 py-1.5">
            <button type="button" x-show="!hasAudio || dirty" x-on:click="renarrate()" :disabled="regenerating"
                    class="flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-2xs font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-40"
                    :title="hasAudio ? @js(__('Re-narrate the edited audio')) : @js(__('Record the narration for this scene'))">
                <svg x-show="regenerating" x-cloak class="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg>
                {{-- Microphone: this makes a recording, it does not touch the words. --}}
                <svg x-show="!regenerating" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" class="h-3.5 w-3.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"/></svg>
                <span x-text="regenerating ? @js(__('Narrating…')) : (hasAudio ? @js(__('Re-narrate')) : @js(__('Narrate')))"></span>
            </button>

            <button type="button" x-show="hasAudio && !dirty" x-on:click="toggle()" :disabled="!ready"
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-slate-950 transition hover:brightness-110 disabled:opacity-40"
                    :title="playing ? @js(__('Pause')) : @js(__('Play'))"
                    aria-label="{{ __('Play narration') }}">
                <svg x-show="!playing" viewBox="0 0 24 24" fill="currentColor" class="h-3.5 w-3.5"><path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z"/></svg>
                <svg x-show="playing" x-cloak viewBox="0 0 24 24" fill="currentColor" class="h-3.5 w-3.5"><path d="M6.75 5.25h3v13.5h-3zM14.25 5.25h3v13.5h-3z"/></svg>
            </button>

            {{-- wire:ignore so Livewire morphs never wipe WaveSurfer's rendered canvas. --}}
            <div x-ref="waveform" wire:ignore x-show="hasAudio" class="h-7 min-w-0 flex-1 cursor-pointer transition-opacity"
                 :class="dirty && 'pointer-events-none opacity-40'"></div>
            <span x-show="!hasAudio && !regenerating" class="min-w-0 flex-1 truncate text-2xs text-slate-500">
                {{ __('No narration yet') }}
            </span>
            <span class="shrink-0 font-mono text-2xs tabular-nums text-slate-400"
                  x-text="regenerating ? @js(__('recording…')) : (hasAudio ? (fmt(t) + ' / ' + fmt(dur)) : '–:––')"></span>
        </div>
    </div>
    </div>{{-- /Script tab --}}
</div>

@once
    @push('scripts')
    <script>
        const SCRIPT_DEF_H = 240;   // px — the dock's fixed height
        // Narration is a queued job. If the worker never runs, or dies without writing a status,
        // nothing comes back to switch the waiting state off — so give up out loud after this.
        const NARRATE_GIVE_UP_MS = 180_000;
        window.scriptEditor = window.scriptEditor || function (url, paragraphs, sceneId, narrating) {
            return {
                ws: null,
                sceneId: sceneId ?? null,
                t: 0,
                dur: 0,
                playing: false,
                ready: false,
                active: 0,
                // One entry per PARAGRAPH: { id, text, dirty }. Seeded from the server; edits
                // (type / split / merge / paste) mutate this array and the DOM boxes track it.
                paras: [],
                starts: [],
                _pid: 0,
                _seed: Array.isArray(paragraphs) ? paragraphs : [],
                // Script-editing toolbar (shown while a paragraph is focused).
                focusedPara: null,
                promptOpen: false,
                promptText: '',
                regenPara: false,
                summarizing: false,
                // Fixed height, capped on a short window so the stage keeps its room.
                panelH: Math.min(SCRIPT_DEF_H, Math.max(120, Math.round((window.innerHeight || 800) * 0.6))),
                // Does this scene have a recording at all? Drives Narrate vs Play — a scene that has
                // never been narrated used to show a disabled play button and nothing else.
                hasAudio: !!url,
                // Edited-since-narration state: the audio is stale until re-narrated. Both of these
                // are seeded from the server so a rebuilt panel comes back still waiting: while a
                // recording is being made the words on the scene are, by definition, not the words
                // in the recording.
                dirty: !!narrating,
                dirtyLines: [],
                regenerating: !!narrating,
                _narrateTimer: null,
                _ro: null,
                _waveRo: null,
                _lastSaved: '',
                _savedBefore: '',
                _unwatchAudio: null,

                // The panel's own root element. $el is NOT it: Alpine binds $el to the element the
                // expression sits on, so inside a handler on a paragraph it is that paragraph and
                // inside one on the toolbar it is that button. Anything asking "is this node mine?"
                // or "where are my boxes?" has to ask the root, which only init() can see.
                _root: null,

                async init() {
                    this._root = this.$el;
                    // Mounted while a recording is being made (a fresh panel after a morph, or a
                    // reload mid-job): keep waiting, and keep the give-up timer that goes with it.
                    if (this.regenerating) this._armGiveUpTimer();
                    this.paras = this._seed.map((p) => ({ id: this._pid++, text: p.text || '', dirty: false }));
                    this.starts = this._seed.map((p) => p.start || 0);   // server timecodes until audio loads
                    this.$nextTick(() => { this.reserveSpace(); this._lastSaved = this._currentScriptText(); });
                    // Keep the reserved bottom space in sync with the panel's real height + its
                    // shown/hidden state, so the stage always sits ABOVE the script panel.
                    this._ro = new ResizeObserver(() => this.reserveSpace());
                    this._ro.observe(this.$el);
                    this.$watch('$store.view.script', () => this.$nextTick(() => this.reserveSpace()));
                    // A re-narrate flips the scene status; the wizard's status poll re-fires
                    // scene:load with the fresh audio URL. Reload the waveform only when WE
                    // asked for it (regenerating) and it's this scene.
                    this._unwatchAudio = window.Livewire.on('scene:load', (e) => {
                        const p = Array.isArray(e) ? e[0]?.payload : e?.payload;
                        if (!p || !this.regenerating || p.sceneId !== this.sceneId) return;
                        // 'generating' is the server ACCEPTING the request, not answering it: it
                        // re-fires scene:load the moment it queues the job, and the payload still
                        // carries the OLD recording. Taking that as the answer cleared the whole
                        // narrating state within 200ms and put the panel back to "this audio matches
                        // your words" while the words were the edited ones and the audio was not.
                        if (p.status === 'generating') return;
                        // Same trap one step earlier: pressing Re-narrate saves the edit first, and
                        // that save answers with a scene:load of its own carrying the audio we are
                        // replacing. audioFresh is the server saying the recording matches the words
                        // on the scene, which only the finished job can make true.
                        if (p.audioUrl && p.audioFresh) { this.reloadAudio(p.audioUrl); return; }
                        // The narrator could not record it (no TTS service, a bad voice, a refusal).
                        // Say so and give the button back — this used to spin for ever.
                        if (p.status === 'failed') this.narrationFailed(p.errorMessage);
                    });
                    // Regenerate-paragraph result: the server rewrites one paragraph and hands it back.
                    this._unwatchPara = window.Livewire.on('scene:paragraph-result', (e) => {
                        const p = Array.isArray(e) ? e[0] : e;
                        if (p && p.sceneId === this.sceneId && this.regenPara) this.applyParagraph(p.text);
                    });
                    // Summarize-to-list finished (or failed) — drop the spinner.
                    this._unwatchSummary = window.Livewire.on('scene:summarize-done', (e) => {
                        const p = Array.isArray(e) ? e[0] : e;
                        if (p && p.sceneId === this.sceneId) this.summarizing = false;
                    });
                    // The server refused the save (the lesson's script-editing allowance is spent).
                    // We had already written the text down as saved, so the next attempt — including
                    // the one Re-narrate makes — was skipped as "no change" and the scene would have
                    // been spoken from the words the teacher no longer has on screen.
                    this._unwatchRejected = window.Livewire.on('scene:script-rejected', (e) => {
                        const p = Array.isArray(e) ? e[0] : e;
                        if (!p || p.sceneId !== this.sceneId) return;
                        this._lastSaved = this._savedBefore;
                    });

                    if (url) await this.mountWave(url);
                },

                /**
                 * Build the waveform for `src`. Called on load when the scene already has audio, and
                 * again after a first narration finishes — a scene that started without a recording
                 * has no WaveSurfer to reload, and used to stay silent until a full page refresh.
                 */
                async mountWave(src) {
                    if (this.ws || !src) return;
                    try {
                        const WS = await window.ensureWaveSurfer();
                        // Built WITHOUT url, then load() separately: switching scenes destroys this
                        // component mid-download, and WaveSurfer aborts the fetch. Loading through a
                        // promise we can catch keeps that from surfacing as an uncaught AbortError.
                        this.ws = WS.create({
                            container: this.$refs.waveform,
                            waveColor: '#475569',      // slate-600
                            progressColor: '#fcd34d',  // amber-500
                            cursorColor: '#fcd34d',    // amber-400 playhead
                            barWidth: 2, barGap: 1, barRadius: 2, height: 32, normalize: true,
                        });
                        this._load(src);
                        this.ws.on('ready', (d) => {
                            this.dur = d || 0;
                            this.ready = true;
                            this.hasAudio = true;
                            this.recomputeStarts();   // spread paragraph timecodes over the REAL length
                            this.refreshWave();
                        });
                        this.ws.on('audioprocess', (t) => { this.t = t; this.syncActive(); });
                        this.ws.on('interaction', () => { this.t = this.ws.getCurrentTime(); this.syncActive(); });
                        this.ws.on('play', () => { this.playing = true; });
                        this.ws.on('pause', () => { this.playing = false; });
                        this.ws.on('finish', () => { this.playing = false; });

                        // WaveSurfer draws nothing if it initialised while the panel was hidden
                        // (script off) or 0-width. Redraw whenever the container gets a real width.
                        this._waveRo = new ResizeObserver(() => this.refreshWave());
                        this._waveRo.observe(this.$refs.waveform);
                    } catch (_) { /* WaveSurfer failed to load — leave the play bar disabled */ }
                },

                // Pull each box's live text back into paras, then serialise: soft newlines (single
                // \n) stay inside a paragraph; paragraphs join with \n\n so the model — and TTS —
                // treat each as its own topic.
                _boxes() { return [...(this._root ?? this.$el).querySelectorAll('[data-line]')]; },
                _syncFromDom() {
                    this._boxes().forEach((el, i) => { if (this.paras[i]) this.paras[i].text = el.textContent; });
                },
                _currentScriptText() {
                    this._syncFromDom();
                    return this.paras
                        // Collapse any internal blank line to a single soft newline so a paragraph
                        // box never serialises as \n\n (which would reload as two paragraphs).
                        .map((p) => (p.text || '').replace(/[ \t]+$/gm, '').replace(/\n{2,}/g, '\n').trim())
                        .filter(Boolean)
                        .join('\n\n');
                },
                saveScript() {
                    const text = this._currentScriptText();
                    // Never persist an empty script: deleting all narration isn't an inline edit,
                    // and the server refuses it too (updateSceneScript returns early on empty).
                    if (!text) {
                        // A focusout can also fire mid-teardown (a scene switch rebuilds this
                        // component) when the boxes are already gone. Nothing was emptied then, so
                        // there is nothing to say and nothing to put back.
                        if (!this._boxes().length) return;
                        // The teacher emptied the box by hand. The panel used to keep showing that
                        // empty box, so the narration looked deleted while the words were still in
                        // the database and still read aloud to students.
                        this._refuseEdit(@js(__('Narration cannot be emptied here, so the previous words are back. Delete the scene instead.')));

                        return;
                    }
                    if (text === this._lastSaved) return;   // no change → no round-trip
                    this._savedBefore = this._lastSaved;    // to fall back on if the server refuses
                    this._lastSaved = text;
                    // sceneId lets the server reject a stale save aimed at a scene we already left.
                    try { window.Livewire.dispatch('scene:update-script', { text, sceneId: this.sceneId }); } catch (_) {}
                },

                /** Put the stored words back on screen and say why the edit did not land. */
                _refuseEdit(message) {
                    this._reseed(this._lastSaved);
                    try { window.dispatchEvent(new CustomEvent('toast', { detail: { type: 'warning', message } })); } catch (_) {}
                },

                /** Rebuild the boxes from a stored script, so the panel shows what is really saved. */
                _reseed(text) {
                    const chunks = String(text || '').split(/\n{2,}/).map((t) => t.trim()).filter(Boolean);
                    this.paras = chunks.map((t) => ({ id: this._pid++, text: t, dirty: false }));
                    this._lastSaved = chunks.join('\n\n');
                    // Nothing is unsaved any more — unless a recording is still being made, which
                    // keeps the audio out of date whatever the boxes say.
                    this.dirty = this.regenerating;
                    this.recomputeStarts();
                    // Fresh ids mean x-for builds new boxes and x-init seeds them, but write the
                    // text in as well: a reused node never re-runs x-init and would keep the old
                    // characters on screen.
                    this.$nextTick(() => this._boxes().forEach((el, i) => { el.textContent = this.paras[i]?.text ?? ''; }));
                },

                refreshWave() {
                    if (!this.ws || !this.$refs.waveform) return;
                    const width = this.$refs.waveform.clientWidth;
                    if (width > 0) { try { this.ws.setOptions({ width }); } catch (_) {} }
                    else requestAnimationFrame(() => this.refreshWave());
                },
                destroy() {
                    clearTimeout(this._narrateTimer);
                    try { this.ws?.destroy(); } catch (_) {}
                    if (this._ro) this._ro.disconnect();
                    if (this._waveRo) this._waveRo.disconnect();
                    if (this._unwatchAudio) { try { this._unwatchAudio(); } catch (_) {} }
                    if (this._unwatchPara) { try { this._unwatchPara(); } catch (_) {} }
                    if (this._unwatchSummary) { try { this._unwatchSummary(); } catch (_) {} }
                    if (this._unwatchRejected) { try { this._unwatchRejected(); } catch (_) {} }
                    document.getElementById('lesson-canvas-root')?.style.setProperty('--work-bottom', '0px');
                    document.documentElement.style.setProperty('--work-bottom', '0px');
                },

                // Start narrating a scene that has none: open one empty box and put the caret in
                // it. Nothing is saved until there are words — saveScript refuses an empty script,
                // so clicking this and walking away leaves the scene exactly as it was.
                addNarration() {
                    if (this.paras.length) { this._focusPara(0, 0); return }
                    this.paras.push({ id: this._pid++, text: '', dirty: false })
                    this.starts = [0]
                    this.$nextTick(() => this._focusPara(0, 0))
                },

                // ── Paragraph editing (single Enter = soft newline, double Enter = new paragraph) ──
                recomputeStarts() {
                    const total = Math.max(1, this.paras.reduce((n, p) => n + (p.text || '').length + 2, 0));
                    let at = 0;
                    this.starts = this.paras.map((p) => {
                        const s = (at / total) * (this.dur || 0);
                        at += (p.text || '').length + 2;   // + the "\n\n" join
                        return s;
                    });
                },
                onInput(i) {
                    const el = this._boxes()[i];
                    if (el && this.paras[i]) this.paras[i].text = el.textContent;
                    this.markDirty(i);
                },
                onKeydown(e, i) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        const el = e.target;
                        // Enter = start a NEW paragraph block and focus it. Shift+Enter = a soft
                        // newline within the current paragraph (same TTS topic).
                        if (e.shiftKey) { this._insertText('\n'); this.onInput(i); return; }
                        this.splitPara(i, el);
                        return;
                    }
                    // Backspace at a block's start (incl. an empty block) merges it into the previous
                    // one — the way to delete an empty paragraph you just created.
                    if (e.key === 'Backspace' && i > 0 && !this._hasSelection() && this._caretOffset(e.target) === 0) {
                        e.preventDefault();
                        this.mergeUp(i, e.target);
                    }
                },
                splitPara(i, el) {
                    const caret = this._caretOffset(el);
                    const text = el.textContent;
                    const before = text.slice(0, caret).replace(/\n+$/, '');   // drop the soft newline that triggered the split
                    const after = text.slice(caret);
                    this.paras[i].text = before;
                    this.paras[i].dirty = true;
                    el.textContent = before;                                    // x-init won't re-run, so sync the DOM
                    this.paras.splice(i + 1, 0, { id: this._pid++, text: after, dirty: true });
                    this.dirty = true;
                    this.recomputeStarts();
                    this.$nextTick(() => this._focusPara(i + 1, 0));
                },
                mergeUp(i, el) {
                    const prev = this.paras[i - 1];
                    const joinAt = (prev.text || '').length;
                    const cur = el.textContent;
                    prev.text = (prev.text || '') + (cur ? ' ' + cur : '');
                    prev.dirty = true;
                    this.dirty = true;
                    this.paras.splice(i, 1);
                    this.recomputeStarts();
                    this.$nextTick(() => {
                        const prevEl = this._boxes()[i - 1];
                        if (prevEl) { prevEl.textContent = prev.text; this._focusPara(i - 1, joinAt); }
                    });
                },
                onPaste(e, i) {
                    e.preventDefault();
                    const cd = e.clipboardData;
                    const html = cd && cd.getData('text/html');
                    const chunks = html ? this._htmlToParagraphs(html) : this._plainToParagraphs((cd && cd.getData('text/plain')) || '');
                    if (chunks.length === 0) return;
                    this._pasteParagraphs(i, e.target, chunks);
                },
                // Sanitise pasted HTML to plain paragraphs: strip ALL tags/attributes (no css/id/
                // aria/font). Block elements (p, h1-6, div, li, …) become paragraph breaks; <br>
                // becomes a soft newline. Only structure survives — never styling.
                _htmlToParagraphs(html) {
                    let doc;
                    try { doc = new DOMParser().parseFromString(html, 'text/html'); }
                    catch (_) { return this._plainToParagraphs(html); }
                    const BLOCK = new Set(['P','DIV','H1','H2','H3','H4','H5','H6','LI','UL','OL','BLOCKQUOTE','SECTION','ARTICLE','HEADER','FOOTER','TABLE','TR','PRE','HR','FIGURE','FIGCAPTION']);
                    const walk = (node) => {
                        let out = '';
                        node.childNodes.forEach((child) => {
                            if (child.nodeType === 3) { out += child.textContent.replace(/\s+/g, ' '); }
                            else if (child.nodeType === 1) {
                                const tag = child.tagName;
                                if (tag === 'BR') out += '\n';
                                else if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'HEAD') { /* drop */ }
                                else if (BLOCK.has(tag)) out += '\n\n' + walk(child) + '\n\n';
                                else out += walk(child);   // inline (span, b, i, a, strong, em…) → unwrap
                            }
                        });
                        return out;
                    };
                    return this._normalizeParas(walk(doc.body));
                },
                _plainToParagraphs(text) { return this._normalizeParas((text || '').replace(/\r\n?/g, '\n')); },
                _normalizeParas(raw) {
                    return raw
                        .replace(/ /g, ' ')
                        .replace(/[ \t]+/g, ' ')
                        .replace(/ *\n */g, '\n')
                        .replace(/\n{3,}/g, '\n\n')
                        .split(/\n[ \t]*\n+/)
                        .map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean).join('\n').trim())
                        .filter(Boolean);
                },
                _pasteParagraphs(i, el, chunks) {
                    // Single paragraph → insert at caret (replaces any selection via deleteContents).
                    if (chunks.length === 1) { this._insertText(chunks[0]); this.onInput(i); return; }
                    // Multi-paragraph → replace the selection (start..end): text before the selection
                    // takes the first chunk, text after takes the last; middles become new boxes.
                    const sel = this._selectionRange(el);
                    const text = el.textContent;
                    const before = text.slice(0, sel.start);
                    const after = text.slice(sel.end);
                    const first = before + chunks[0];
                    const tail = chunks.slice(1);
                    tail[tail.length - 1] = tail[tail.length - 1] + after;
                    this.paras[i].text = first; this.paras[i].dirty = true; el.textContent = first;
                    const inserted = tail.map((t) => ({ id: this._pid++, text: t, dirty: true }));
                    this.paras.splice(i + 1, 0, ...inserted);
                    this.dirty = true;
                    this.recomputeStarts();
                    const caretPos = chunks[chunks.length - 1].length;
                    this.$nextTick(() => this._focusPara(i + inserted.length, caretPos));
                },

                // ── caret / selection helpers (char offsets within a contenteditable box) ──
                _insertText(t) {
                    const sel = window.getSelection();
                    if (!sel || !sel.rangeCount) return;
                    const range = sel.getRangeAt(0);
                    range.deleteContents();
                    const node = document.createTextNode(t);
                    range.insertNode(node);
                    range.setStartAfter(node); range.setEndAfter(node); range.collapse(true);
                    sel.removeAllRanges(); sel.addRange(range);
                },
                _hasSelection() { const s = window.getSelection(); return !!s && !s.isCollapsed; },
                _textBeforeCaret(el) {
                    const sel = window.getSelection();
                    if (!sel || !sel.rangeCount) return '';
                    const r = sel.getRangeAt(0).cloneRange();
                    r.selectNodeContents(el);
                    r.setEnd(sel.getRangeAt(0).endContainer, sel.getRangeAt(0).endOffset);
                    return r.toString();
                },
                _caretOffset(el) { return this._textBeforeCaret(el).length; },
                // Char offsets [start, end] of the current selection within el (equal when collapsed).
                _selectionRange(el) {
                    const sel = window.getSelection();
                    const n = (el.textContent || '').length;
                    if (!sel || !sel.rangeCount) return { start: n, end: n };
                    const range = sel.getRangeAt(0);
                    const pre = document.createRange();
                    pre.selectNodeContents(el);
                    pre.setEnd(range.startContainer, range.startOffset);
                    const start = pre.toString().length;
                    return { start, end: start + range.toString().length };
                },
                _setCaret(el, offset) {
                    const sel = window.getSelection();
                    const range = document.createRange();
                    let remaining = Math.max(0, offset), target = null, targetOff = 0;
                    const walk = (n) => {
                        if (target) return;
                        if (n.nodeType === 3) {
                            const len = n.textContent.length;
                            if (remaining <= len) { target = n; targetOff = remaining; } else { remaining -= len; }
                        } else { n.childNodes.forEach(walk); }
                    };
                    walk(el);
                    if (target) range.setStart(target, targetOff);
                    else { range.selectNodeContents(el); range.collapse(false); }
                    range.collapse(true);
                    sel.removeAllRanges(); sel.addRange(range);
                },
                _focusPara(i, offset) {
                    const el = this._boxes()[i];
                    if (!el) return;
                    el.focus({ preventScroll: true });
                    this.focusedPara = i;
                    this.active = i;
                    this._setCaret(el, offset ?? 0);
                    // Defer the scroll until AFTER the focus toolbar (shown by focusedPara) has laid
                    // out — it shrinks the scroller from the bottom, so scrolling any earlier leaves
                    // the caret hidden behind it. $nextTick flushes Alpine; rAF flushes browser layout.
                    this.$nextTick(() => requestAnimationFrame(() => this._scrollBoxIntoView(el)));
                },
                // Explicitly scroll the panel's own scroller (nested scrollIntoView is unreliable) so
                // the target box + caret are visible.
                _scrollBoxIntoView(el) {
                    const scroller = el.closest('.overflow-y-auto');
                    if (!scroller) return;
                    const er = el.getBoundingClientRect(), sr = scroller.getBoundingClientRect();
                    if (er.bottom > sr.bottom) scroller.scrollTop += (er.bottom - sr.bottom) + 12;
                    else if (er.top < sr.top) scroller.scrollTop -= (sr.top - er.top) + 12;
                },

                // ── Script-editing toolbar (regenerate paragraph / summarize to list) ──
                onFocusOut(e) {
                    this.saveScript();
                    // Close the toolbar only when focus left the whole script panel. Measured
                    // against the panel ROOT: $el here is the scroller this handler sits on, whose
                    // sibling is the toolbar — so every move from a paragraph INTO the toolbar read
                    // as "focus left the panel", and the prompt field was hidden the instant it
                    // took focus, which made Rewrite text impossible to use at all.
                    if (!this._root.contains(e.relatedTarget)) { this.focusedPara = null; this.closePrompt(); }
                },
                openPrompt() { this.promptOpen = true; this.promptText = ''; this.$nextTick(() => this.$refs.prompt?.focus()); },
                closePrompt() { this.promptOpen = false; this.promptText = ''; },
                submitPrompt() {
                    const prompt = (this.promptText || '').trim();
                    const i = this.focusedPara;
                    if (this.regenPara || i == null || !this.paras[i]) return;
                    this._syncFromDom();
                    const text = (this.paras[i].text || '').trim();
                    if (!text) { this.closePrompt(); return; }
                    this.regenPara = true;
                    // Track the paragraph by its STABLE id, not its index — the boxes stay editable
                    // during the async rewrite, so a split/merge could shift indices and make the
                    // result land on the wrong paragraph.
                    this._regenId = this.paras[i].id;
                    try { window.Livewire.dispatch('scene:regenerate-paragraph', { sceneId: this.sceneId, text, prompt }); } catch (_) { this.regenPara = false; }
                },
                applyParagraph(newText) {
                    this.regenPara = false;
                    this.closePrompt();
                    const i = this.paras.findIndex((p) => p.id === this._regenId);
                    if (i < 0 || !newText) return;   // the target paragraph was deleted meanwhile → drop the result
                    this.paras[i].text = newText;
                    this.paras[i].dirty = true;
                    this.dirty = true;
                    const el = this._boxes()[i];
                    if (el) el.textContent = newText;
                    this.recomputeStarts();
                    this.saveScript();
                },
                summarizeToList() {
                    if (this.summarizing || this.sceneId == null) return;
                    this.saveScript();   // summarize the latest text
                    this.summarizing = true;
                    try { window.Livewire.dispatch('scene:summarize-to-list', { sceneId: this.sceneId }); } catch (_) { this.summarizing = false; }
                },

                // ── Edited-text → stale audio ────────────────────────────────────────────
                // Stale means "the recording no longer says what the words say". Only a change that
                // survives serialisation can do that: _currentScriptText trims each paragraph, so
                // typing a space used to take the Play button away, disable the waveform and offer
                // a re-narration for an edit that could never be saved and vanished on reload.
                markDirty(i) {
                    const changed = this._currentScriptText() !== this._lastSaved;
                    // While a recording is being made the audio is out of date whatever the text
                    // does, so typing and undoing must not hand the Play button back mid-job.
                    this.dirty = changed || this.regenerating;
                    if (this.paras[i]) this.paras[i].dirty = changed;
                    if (!changed) this.paras.forEach((p) => { p.dirty = false; });
                },
                _clearDirty() { this.dirty = false; this.paras.forEach((p) => { p.dirty = false; }); },
                onPlay() {
                    if (this.dirty) { this.renarrate(); return; }   // stale → re-narrate before playing
                    this.toggle();
                },
                renarrate() {
                    if (this.regenerating) return;
                    this.saveScript();               // persist the edited text first
                    if (this.sceneId == null) { this._clearDirty(); return; }
                    this.regenerating = true;
                    this._armGiveUpTimer();
                    try { window.Livewire.dispatch('scene:renarrate', { sceneId: this.sceneId }); } catch (_) {}
                },
                /** Never wait for ever: say the recording could not be made and give the button back. */
                _armGiveUpTimer() {
                    clearTimeout(this._narrateTimer);
                    this._narrateTimer = setTimeout(() => this.narrationFailed(null), NARRATE_GIVE_UP_MS);
                },
                narrationFailed(reason) {
                    clearTimeout(this._narrateTimer);
                    if (!this.regenerating) return;
                    this.regenerating = false;
                    const detail = {
                        type: 'error',
                        message: reason
                            ? @js(__('The narrator could not record this scene:')) + ' ' + reason
                            : @js(__('The narrator could not record this scene. Try again.')),
                    };
                    try { window.dispatchEvent(new CustomEvent('toast', { detail })); } catch (_) {}
                },
                reloadAudio(newUrl) {
                    clearTimeout(this._narrateTimer);
                    this.regenerating = false;
                    this._clearDirty();
                    if (!newUrl) return;
                    this.hasAudio = true;
                    // Bust the HTTP cache — the re-narrated file often reuses the same path.
                    const bust = newUrl + (newUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
                    // First narration for this scene: there is no waveform yet, so build one.
                    if (!this.ws) { this.$nextTick(() => this.mountWave(bust)); return; }
                    this._load(bust);
                },

                /** load() rejects with AbortError when the component is torn down mid-download. */
                _load(src) {
                    try { Promise.resolve(this.ws?.load(src)).catch(() => {}); } catch (_) {}
                },

                reserveSpace() {
                    const root = document.getElementById('lesson-canvas-root');
                    if (!root) return;
                    const shown = !!this.$store.view.script;
                    const h = shown ? Math.round(this.$el.getBoundingClientRect().height) : 0;
                    // Only write + nudge when the value actually changes, so the ResizeObserver
                    // can't churn a resize-dispatch loop.
                    if (root.style.getPropertyValue('--work-bottom') === h + 'px') return;
                    root.style.setProperty('--work-bottom', h + 'px');
                    // Also on <html> so the FIXED rail/objlist resize handles (siblings, not
                    // descendants of the canvas-root) can stop at the top of this panel instead
                    // of overlaying it.
                    document.documentElement.style.setProperty('--work-bottom', h + 'px');
                    window.dispatchEvent(new Event('resize'));   // refit the WebGL stage
                },

                toggle() { this.ws?.playPause(); },
                seek(i) {
                    // Only seek the CURRENT scene's loaded, up-to-date track. A not-ready or
                    // stale/regenerating waveform could otherwise play a clip from a scene you
                    // already left (e.g. clicking a timecode on a freshly-added empty paragraph).
                    if (!this.ws || !this.ready || this.dirty || this.regenerating) return;
                    const s = Math.max(0, Math.min(this.starts[i] ?? 0, this.dur || 0));
                    if (typeof this.ws.setTime === 'function') this.ws.setTime(s);
                    else this.ws.seekTo(this.dur ? s / this.dur : 0);
                    this.t = s;
                    this.syncActive();
                    if (!this.playing) this.ws.play();
                },
                syncActive() {
                    let a = 0;
                    for (let i = 0; i < this.starts.length; i++) { if (this.t >= this.starts[i]) a = i; }
                    this.active = a;
                },

                fmt(s) {
                    s = Math.max(0, Math.round(s || 0));
                    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
                },
            };
        };
    </script>
    @endpush
@endonce
