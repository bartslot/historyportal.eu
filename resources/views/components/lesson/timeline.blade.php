@props([
    'scenes'          => collect(),
    'selectedSceneId' => null,
    'editable'        => true,
    // Configure only: the pinned title screen item, ['title' => string, 'image' => ?string, 'selected' => bool].
    'titleScreen'     => null,
    // Configure only: LessonProblems per scene id, for the thumbnail's dot.
    'problems'        => [],
])

{{-- Vertical scene rail (LessonUp/Keynote-style): numbered thumbnails down the left edge.
     Replaces the old horizontal bottom timeline — vertical scanning matches how teachers
     read slide decks, and it frees the bottom strip for the step CTA. --}}
{{-- Full-height left column: the panel reaches the top edge (aligned with the header, whose
     logo sits over it), while pt-20 keeps the 'Scenes' block at its original height. --}}
{{-- Compact rail: when the rail is dragged narrow (≤ 92px), the container query collapses
     each thumb to just its centered number on a transparent background (no image / year /
     place) so scenes can still be scanned and reordered in a sliver of width. --}}
<style>
    [data-rail-col] { container: railcol / inline-size; }
    @container railcol (max-width: 92px) {
        [data-rail-col] [data-thumb] {
            aspect-ratio: auto !important;
            height: 2.1rem;
            background: transparent !important;
            box-shadow: none !important;                 /* kills the Tailwind ring (box-shadow) */
            --tw-ring-offset-width: 0px;
        }
        [data-rail-col] [data-thumb-full] { display: none !important; }
        [data-rail-col] [data-thumb-compact] { display: flex !important; }
        [data-rail-col] [data-thumb-selected] { background: color-mix(in oklab, var(--color-primary) 14%, transparent) !important; }
        [data-rail-col] [data-thumb-selected] [data-thumb-compact] { color: var(--color-primary) !important; }
        [data-rail-col] [data-rail-label] { display: none !important; }
        [data-rail-col] [data-rail-add] { aspect-ratio: auto !important; height: 2.1rem !important; border-radius: 0.5rem !important; }
    }
</style>
<aside {{ $attributes->merge(['class' => 'fixed left-0 top-0 bottom-0 z-30 overflow-hidden']) }}
       style="width: var(--rail-w, 11rem)">
    <div class="lp-panel-surface" aria-hidden="true"></div>
    {{-- The scene thumbs' repeated icons, drawn once and reused with <use> (scene-thumb.blade): inline, each
         thumb carried ~9 KB of SVG, 1.3 MB on a 163-scene lesson, in every Livewire response. --}}
    <svg width="0" height="0" class="absolute" aria-hidden="true">
        <symbol id="rail-story" viewBox="0 0 53 45"><x-lesson.icon-story style="width:100%;height:100%" /></symbol>
        <symbol id="rail-more" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" /></symbol>
        <symbol id="rail-duplicate" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" /></symbol>
        <symbol id="rail-delete" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></symbol>
    </svg>
    <div class="lp-panel-content">
    <div class="flex h-full flex-col pt-20" data-rail-col>
        {{-- The title screen: always first, never deleted or dragged. It sits OUTSIDE the sortable
             track, so no scene can be dropped above it and it stays put while the scenes scroll. --}}
        @if ($titleScreen)
            <div class="px-3 pt-3">
                <button type="button"
                        wire:click="selectTitle"
                        data-thumb data-title-thumb
                        aria-label="{{ __('Title screen') }}"
                        @if ($titleScreen['selected']) data-thumb-selected aria-current="true" @endif
                        @class([
                            'group relative aspect-video w-full overflow-hidden rounded-md transition-all',
                            'ring-2 ring-primary ring-offset-2 ring-offset-slate-900' => $titleScreen['selected'],
                            'ring-1 ring-slate-700/50 hover:ring-slate-500' => ! $titleScreen['selected'],
                        ])>
                    <span data-thumb-full class="contents">
                        <div class="absolute inset-0 bg-slate-800/60"></div>
                        @if ($titleScreen['image'])
                            <img src="{{ $titleScreen['image'] }}" onerror="this.style.display='none'"
                                 class="relative h-full w-full object-cover" alt="" />
                        @endif
                        <span class="absolute inset-0 bg-linear-to-t from-black/80 to-transparent"></span>
                        <span class="absolute inset-x-1.5 bottom-1 truncate text-left font-history text-xs font-bold text-white">
                            {{ $titleScreen['title'] }}
                        </span>
                        <span data-micro-label class="absolute left-1.5 top-1 text-3xs font-semibold leading-none text-white/75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                            {{ __('Title') }}
                        </span>
                    </span>
                    <span data-thumb-compact aria-hidden="true"
                          class="pointer-events-none absolute inset-0 hidden items-center justify-center font-mono text-sm font-semibold text-panel-hint">T</span>
                </button>
            </div>
        @endif

        {{-- p-3 (not just pb-3): the selected thumb's ring-offset-2 overspill would be clipped
             by overflow-y-auto without top/side breathing room. See overflow-clips-rings memory. --}}
        <div id="timeline-track"
             class="flex-1 space-y-2 overflow-y-auto p-3"
             @if ($editable) data-sortable="timeline" @endif>
            @foreach ($scenes as $scene)
                {{-- No gap inside a Decision point: its question and two choices stay together. --}}
                @if ($editable && ! in_array($scene->branch_role, ['option_a', 'option_b'], true))
                    {{-- Insert here: after the scene above, or first (0) above scene 1. --}}
                    <button type="button"
                            data-no-drag data-rail-gap
                            wire:click="openAddSceneAfter({{ $loop->first ? 0 : $scenes->values()[$loop->index - 1]->id }})"
                            class="flex h-8 w-full items-center justify-center text-white/30 transition-colors hover:text-primary"
                            data-tooltip="{{ __('Add scene here') }}" aria-label="{{ __('Add scene here') }}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5" aria-hidden="true">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                        </svg>
                    </button>
                @endif
                <x-lesson.scene-thumb :scene="$scene"
                                      :problems="$problems[$scene->id] ?? []"
                                      :selected="$scene->id === $selectedSceneId"
                                      :number="$loop->iteration"
                                      :editable="$editable"
                                      wide />
            @endforeach

            @if ($editable)
                {{-- At the end, whatever is selected. --}}
                <button type="button"
                        data-no-drag data-rail-add
                        wire:click="openAddSceneAfter({{ $scenes->last()?->id ?? 0 }})"
                        class="flex aspect-video w-full flex-col items-center justify-center rounded-md border-2 border-dashed border-white/20 text-white/40 transition-all hover:border-primary hover:text-primary"
                        data-tooltip="{{ __('Add scene') }}" aria-label="{{ __('Add scene') }}">
                    {{-- A drawn plus, not the "+" glyph: a font's plus sits off its box's centre. --}}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15"/>
                    </svg>
                </button>
            @endif
        </div>
    </div>
    </div>{{-- /.lp-panel-content --}}
</aside>

@if ($editable)
@push('scripts')
<script>
(() => {
    function mountTimelineSortable() {
        const track = document.getElementById('timeline-track')
        // Skip if deps missing or already mounted on THIS element (guards double-init).
        if (!track || !window.Sortable || track._sortableMounted) return
        track._sortableMounted = true
        new window.Sortable(track, {
            animation: 150,
            // Pointer-driven dragging, not the browser's native drag-and-drop: every thumb is a
            // <button>, and native DnD on buttons starts (dragstart fires) and then never delivers
            // a move or a drop, so the scene snapped back. 4px before a drag starts keeps clicks
            // selecting the scene.
            forceFallback: true,
            fallbackTolerance: 4,
            {{-- Each scene is a wrapper carrying data-scene-block (the thumb button plus its delete
                 X), so THAT is the direct child Sortable moves — never the "Add" button. --}}
            draggable: '[data-scene-block]',
            filter: '[data-no-drag]',
            // Default preventOnFilter:true calls preventDefault() on [data-no-drag], which swallows
            // the click on the "Add scene" button. Keep native clicks alive on filtered elements.
            preventOnFilter: false,
            onEnd: () => {
                const ids = [...track.querySelectorAll('[data-scene-block]')].map(el => Number(el.dataset.sceneBlock))
                window.Livewire.dispatch('timeline:reordered', { ids })
            },
        })
    }
    function boot() {
        mountTimelineSortable()
        // wire:poll.3s re-renders the rail; if the morph swaps the track element, re-mount on it.
        window.Livewire?.hook('morph.updated', ({ el }) => { if (el && el.id === 'timeline-track') mountTimelineSortable() })
    }
    // Livewire defers stacked scripts, so `livewire:initialized` has usually ALREADY fired by the
    // time this runs — mount immediately in that case (the old code only listened, so it never mounted).
    if (window.Livewire) boot()
    else document.addEventListener('livewire:initialized', boot)
    document.addEventListener('livewire:navigated', mountTimelineSortable)
})()
</script>
@endpush
@endif
