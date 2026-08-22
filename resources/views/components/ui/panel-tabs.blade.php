@props([
    /** [[key, label], …] — labels already translated by the caller. */
    'tabs' => [],
    /** Alpine expression holding the active key. The row READS it rather than keeping a copy. */
    'model' => 'tab',
    /** Radio-group name; unique per row on the page, or two rows share one selection. */
    'name' => 'panel-tabs',
    /** Optional breadcrumb rendered before the tabs — Figma's `breadcrumb-row`. */
    'breadcrumb' => null,
])

{{-- The inspector's tab header — Figma's `tab-header` (1470:1879).

     The row is auto-layout with the breadcrumb first and the tabs after it, which is why the file
     reports `breadcrumb-row` and `tab-format-active` at the same x: the breadcrumb is hidden in
     that variant and takes no space. Hidden in one state is not absent from the design, so it is
     built here and shown whenever there is somewhere to go back to.

     The tabs themselves are <x-ui.segmented>, which is stock DaisyUI `tabs tabs-box`. --}}
<div {{ $attributes->class(['flex w-full items-center gap-1 border-y border-base-300/70 px-4 py-1.5']) }}>
    {{ $breadcrumb }}
    <x-ui.segmented :name="$name" :options="$tabs" :model="$model" class="shrink-0" />
</div>
