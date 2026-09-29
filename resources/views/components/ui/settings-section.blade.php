@props([
    /** Section heading. Already translated by the caller. */
    'title',
    /** Whether the section starts open. */
    'open' => true,
    /** Persist the open/closed choice under this key; omit for a section that always starts fresh. */
    'name' => null,
])

{{-- A titled, collapsible band in a settings panel — Figma's `Title container`.

     The panel is a tall single column, so a heading that cannot be collapsed is a heading that
     pushes everything under it off the bottom. Open state is Alpine-local and, when `name` is
     given, remembered: a teacher who never uses Map style should not have to close it every time
     they open a lesson.

     `x-collapse` is not used — it animates height by measuring, and this panel lives inside an
     `overflow-y-auto` aside where that measurement is taken mid-scroll. A plain x-show is honest
     here; the chevron carries the state change. --}}
<div x-data="{
        open: @js($open),
        @if ($name) key: 'wizard.section.{{ $name }}', @endif
        init() {
            @if ($name)
            const saved = window.localStorage.getItem(this.key)
            if (saved !== null) this.open = saved === '1'
            this.$watch('open', (v) => window.localStorage.setItem(this.key, v ? '1' : '0'))
            @endif
        },
     }"
     {{ $attributes->class(['w-full border-t border-panel-hairline']) }}>

    <button type="button" x-on:click="open = !open"
            :aria-expanded="open ? 'true' : 'false'"
            class="flex w-full items-center justify-between px-4 py-3 text-left">
        <span class="text-2xs font-semibold tracking-wide text-panel-title">{{ $title }}</span>
        <x-icons.chevron-down class="h-2.5 w-2.5 shrink-0 text-panel-label transition-transform duration-150"
                              ::class="open ? '' : '-rotate-90'" />
    </button>

    <div x-show="open" x-cloak class="px-4 pb-3">
        {{ $slot }}
    </div>
</div>
