@props([
    'scene'    => null,
    'selected' => false,
    'wide'     => false,   // vertical rail: fill the rail width instead of fixed w-32
    'number'   => null,    // slide number badge (vertical rail)
    'editable' => false,   // Configure step: the hover menu that duplicates or deletes the scene
    // What LessonProblems found on this scene (the editor passes them; null = the old status dot).
    'problems' => null,
])

{{-- data-thumb / data-thumb-selected let the rail's @container "compact" rules (timeline.blade)
     collapse this to just the centered number on a transparent background when the rail is narrow. --}}
@php
    // Stable accessible name — in compact mode the visible content is just an aria-hidden
    // number, so without this the button would announce as unlabeled.
    $sceneAriaLabel = trim(__('Scene').' '.($number ?? $scene->order)
        .($scene->year ? ', '.$scene->year : '')
        .($scene->location ? ' · '.$scene->location : ''));
    // The delete X is a SIBLING of the thumb, never a child: a button inside a button is invalid
    // markup and the inner one stops firing. data-scene-block is what the rail drags and reads the
    // running order from, so the wrapper takes over that job from the button.
    $canDelete = $editable;
@endphp
@if ($canDelete)
<div class="group/thumb relative" data-scene-block="{{ $scene->id }}" wire:key="scene-block-{{ $scene->id }}">
@endif
<button type="button"
        wire:key="scene-thumb-{{ $scene->id }}"
        wire:click="selectScene({{ $scene->id }})"
        data-scene-id="{{ $scene->id }}"
        data-thumb
        aria-label="{{ $sceneAriaLabel }}"
        @if ($selected) data-thumb-selected aria-current="true" @endif
        @class([
            'group relative shrink-0 aspect-video rounded-md overflow-hidden transition-all',
            'w-full' => $wide,
            'w-32' => ! $wide,
            'ring-2 ring-primary ring-offset-2 ring-offset-slate-900'        => $selected,
            'ring-1 ring-slate-700/50 hover:ring-slate-500'                    => ! $selected && $scene->status !== 'failed',
            'ring-1 ring-error/50'                                          => $scene->status === 'failed',
        ])>
    {{-- Full thumbnail (image / year / place / badges). Hidden by the compact @container rule. --}}
    <span data-thumb-full class="contents">
    @if ($scene->kind === 'map')
        <div class="w-full h-full bg-sky-800/30 border border-sky-600/30 flex flex-col items-center justify-center gap-1 px-2 text-white [&>*]:shrink-0">
            <x-lesson.icon-map class="h-8 w-8 opacity-90" />
            <span class="text-2xs leading-snug opacity-70">{{ $scene->year ?? '—' }}</span>
        </div>
    @elseif ($scene->kind === 'game')
        <div class="w-full h-full bg-teal-700/30 border border-teal-600/30 flex flex-col items-center justify-center gap-1 px-2 text-white [&>*]:shrink-0">
            @switch($scene->game_type)
                @case('strategy') <x-lesson.icon-strategy class="h-8 w-8 opacity-90" /> @break
                @case('debate') <x-lesson.icon-debate class="h-7 w-7 opacity-90" /> @break
                @case('story_game') <x-lesson.icon-branching-story class="h-8 w-8 opacity-90" /> @break
                @default
                    {{-- Quiz (no bespoke icon): a checklist glyph. --}}
                    <svg class="h-7 w-7 opacity-90" fill="none" stroke="currentColor" stroke-width="1.6" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m-9 8h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z"/></svg>
            @endswitch
        </div>
    @elseif ($scene->kind === 'voyage')
        {{-- The itinerary scene is a voyage scene that stops nowhere, so it has no landfall to name.
             It gets its own glyph (the route with its stops numbered) and reads simply "Overview" —
             one word, no "Voyage" above it, because the icon already says which it belongs to. --}}
        @php $isVoyageOverview = (bool) ($scene->config['overview'] ?? false); @endphp
        <div class="w-full h-full bg-indigo-800/30 border border-indigo-500/30 flex flex-col items-center justify-center gap-1 px-2 text-white [&>*]:shrink-0">
            @if ($isVoyageOverview)
                <x-lesson.icon-voyage-overview class="h-9 w-auto opacity-90" />
            @else
                <x-lesson.icon-voyage class="h-8 w-8 opacity-90" />
                <span class="text-2xs leading-snug opacity-70 truncate max-w-[90%]">{{ $scene->location ?? '—' }}</span>
            @endif
        </div>
    @elseif ($scene->kind === 'video')
        <div class="w-full h-full bg-indigo-900/30 border border-indigo-500/30 flex flex-col items-center justify-center gap-1 px-2 text-white [&>*]:shrink-0">
            <x-lesson.icon-video class="h-8 w-auto opacity-90" />
        </div>
    @elseif ($scene->kind === 'gallery')
        <div class="w-full h-full bg-violet-800/30 border border-violet-500/30 flex flex-col items-center justify-center gap-1 px-2 text-white [&>*]:shrink-0">
            <x-lesson.icon-slideshow class="h-8 w-8 opacity-90" />
            <span class="text-2xs leading-snug opacity-70 truncate max-w-[90%]">{{ $scene->location ?? '—' }}</span>
        </div>
    @else
        {{-- Placeholder sits underneath; a present image covers it. If the image 404s
             (generation failed / file removed) onerror hides it, revealing the placeholder
             instead of the browser's broken-image glyph. --}}
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-800/60 text-panel-hint">
            <x-lesson.icon-story class="h-6 w-6 opacity-80" />
            <span class="text-2xs tracking-widest">{{ __('SCENE') }} {{ $scene->order }}</span>
        </div>
        @if ($scene->image_path)
            <img src="{{ \App\Support\MediaUrl::of($scene->image_path) }}"
                 onerror="this.style.display='none'"
                 class="relative w-full h-full object-cover" alt="" />
        @endif
        <span class="absolute bottom-0 inset-x-0 bg-black/55 text-2xs text-white px-1 py-0.5 text-left truncate">
            @if ($scene->kind === 'stage25d')
                {{ $scene->location ?: ($scene->chapter_name ?: ($scene->config['stage25d']['beat'] ?? '—')) }}
            @else
                {{ $scene->year ?? '—' }} · {{ $scene->location ?? '—' }}
            @endif
        </span>
    @endif

    @if ($number !== null)
        <span data-micro-label class="absolute left-1.5 top-1 text-3xs font-semibold leading-none text-white/75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {{ $number }}
        </span>
    @endif

    {{-- The dot explains itself: red when the class will notice, amber when the scene plays but
         not as the teacher left it (an older voice). The sentence is LessonProblems', never the
         raw error. Outside the editor (no problems passed) a failed scene keeps its plain dot. --}}
    @php
        $worst = $problems === null ? ($scene->status === 'failed' ? \App\Support\LessonProblems::BLOCKS : null) : \App\Support\LessonProblems::worst($problems);
        $why = $problems ? implode(' ', array_unique(array_column($problems, 'message'))) : null;
    @endphp
    @if ($worst)
        <span data-problem-dot="{{ $worst }}" data-micro-label @if ($why) data-tooltip="{{ $why }}" @endif
              @class(['pointer-events-auto absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full text-3xs font-bold',
                      'bg-error text-white' => $worst === \App\Support\LessonProblems::BLOCKS,
                      'bg-warning text-warning-content' => $worst !== \App\Support\LessonProblems::BLOCKS])>!</span>
    @endif
    </span>

    {{-- Compact: just the scene number, centered on a transparent background. Revealed by the
         rail's @container rule when the rail is dragged narrow; amber when this scene is selected. --}}
    <span data-thumb-compact aria-hidden="true"
          class="pointer-events-none absolute inset-0 hidden items-center justify-center font-mono text-sm font-semibold tabular-nums text-panel-hint">
        {{ $number ?? $scene->order }}
    </span>
</button>

@if ($canDelete)
    {{-- Hover (or keyboard focus) reveals a "..." that opens Duplicate / Delete (Bart 11-03: "not delete but a
         little menu"). A native popover: it sits in the top layer, so the rail's overflow never clips it, and
         Escape / a click outside close it for free. data-no-drag so grabbing it doesn't start a reorder.
         Delete has no confirm: its toast offers Undo, which is the gentler version of asking. --}}
    <button type="button"
            data-no-drag
            data-scene-menu="{{ $scene->id }}"
            popovertarget="scene-menu-{{ $scene->id }}"
            title="{{ __('Scene options') }}"
            aria-label="{{ __('Scene options') }}"
            class="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full
                   border border-slate-600 bg-slate-900 text-slate-300 opacity-0 transition
                   hover:border-primary hover:text-white
                   focus-visible:opacity-100 group-hover/thumb:opacity-100">
        <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
        </svg>
    </button>
    <ul id="scene-menu-{{ $scene->id }}" popover data-no-drag
        x-data
        x-on:beforetoggle="if ($event.newState === 'open') { const r = document.querySelector('[data-scene-menu=&quot;{{ $scene->id }}&quot;]').getBoundingClientRect(); $el.style.left = (r.right + 6) + 'px'; $el.style.top = r.top + 'px' }"
        class="menu m-0 hidden w-44 open:flex rounded-box border border-slate-700 bg-base-200 p-1 text-sm shadow-none"
        style="position: fixed; inset: auto;">
        <li>
            <button type="button" data-scene-duplicate="{{ $scene->id }}"
                    wire:click.stop="duplicateScene({{ $scene->id }})" wire:loading.attr="disabled"
                    x-on:click="$el.closest('[popover]').hidePopover()">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                </svg>
                {{ __('Duplicate scene') }}
            </button>
        </li>
        <li>
            <button type="button" data-scene-delete="{{ $scene->id }}" class="text-error"
                    wire:click.stop="deleteScene({{ $scene->id }})" wire:loading.attr="disabled"
                    x-on:click="$el.closest('[popover]').hidePopover()">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
                {{ __('Delete scene') }}
            </button>
        </li>
    </ul>
</div>
@endif
