@props([
    'id'       => null,   // the menu's id, for a row the server renders
    'alpineId' => null,   // or an Alpine expression for it, for a row an x-for draws
    'label'    => '',
])

{{-- The "..." on a row that opens its small menu (Duplicate / Delete): the scene thumbs and the Object list
     (Bart 11-03: "not delete but a little menu"; 11-17: the Object list the same). A native popover: it sits in
     the top layer, so a panel's overflow never clips it, and Escape or a click outside close it for free. It
     opens beside its button. data-no-drag so grabbing it doesn't start a reorder. The caller places the button
     and decides when it shows (class); the items are the slot (<li><button>). --}}
<button type="button" data-no-drag
        @if ($alpineId) :popovertarget="{{ $alpineId }}" @else popovertarget="{{ $id }}" @endif
        aria-label="{{ $label }}" data-tooltip="{{ $label }}"
        {{ $attributes->class('h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-900 text-slate-300 transition hover:border-primary hover:text-white') }}>
    <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><use href="#rail-more"/></svg>
</button>
<ul popover data-no-drag
    @if ($alpineId) :id="{{ $alpineId }}" @else id="{{ $id }}" @endif
    x-data
    x-on:beforetoggle="if ($event.newState === 'open') { const r = document.querySelector(`[popovertarget='${$el.id}']`).getBoundingClientRect(); $el.style.left = (r.right + 6) + 'px'; $el.style.top = r.top + 'px' }"
    class="menu m-0 hidden w-44 open:flex rounded-box border border-slate-700 bg-base-200 p-1 text-sm shadow-none"
    style="position: fixed; inset: auto;">
    {{ $slot }}
</ul>
