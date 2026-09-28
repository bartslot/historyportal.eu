@props([
    /** Radio-group name. Must be unique on the page — two groups sharing a name share a selection. */
    'name',
    /** [[value, label], …] — labels already translated by the caller. */
    'options' => [],
    /** Alpine expression holding the chosen value, e.g. 'mode'. The row READS it, never copies it. */
    'model' => null,
    /** Server-rendered selection, for a row with no Alpine model behind it. */
    'value' => null,
    /** Alpine statement run on change. `$event.target.value` is the chosen value. */
    'onChange' => null,
    /** Extra classes for each tab. */
    'tabClass' => '',
    /**
     * Wear the settings panel's own skin: a flat strip with a LIGHTER active box, rather than
     * tabs-box's filled pill with a darker one. See `.tabs-panel` in app.css.
     */
    'panel' => false,
])

{{-- One segmented control for the whole app — DaisyUI `tabs tabs-box`, radio inputs.

     DAISYUI SUPPLIES THE BEHAVIOUR, FIGMA SUPPLIES THE APPEARANCE. The component is tabs-box and
     stays tabs-box — never hand-roll a control DaisyUI implements, or the exclusivity, the
     arrow-key roving and the focus ring all have to be rebuilt. But its default LOOK is not the
     design's: tabs-box fills the tray and leaves the active tab darker than it, and the file draws
     the opposite. Pass `panel` for the file's skin; see `.tabs-panel` in app.css.

     Two earlier passes got this wrong from both ends — one hand-rolled the row believing the
     design deviated, the next kept DaisyUI's appearance believing the design matched it.

     Radio inputs rather than buttons, per the component's documented form
     (daisyui.com/components/tab/#tabs-box-using-radio-inputs): the browser owns the exclusivity and
     the arrow-key roving, and the label rides on `aria-label`.

     NO AMBER. These rows were `bg-amber-500 text-slate-950` on the active segment. Amber is the
     public site's; inside the teacher app the chosen state is the theme's own lighter surface,
     which is what tabs-box already paints, and the pill is fully rounded like every other control.
     Amber in the teacher app is the exact pattern being removed, so nothing here reintroduces it. --}}
<div {{ $attributes->class(['tabs tabs-box', 'tabs-panel' => $panel]) }} role="tablist">
    @foreach ($options as [$optValue, $optLabel])
        <input type="radio" name="{{ $name }}" value="{{ $optValue }}"
               class="tab {{ $tabClass }}"
               aria-label="{{ $optLabel }}"
               @if ($model) x-model="{{ $model }}" @endif
               @if ($onChange) x-on:change="{{ $onChange }}" @endif
               @checked($value !== null && (string) $value === (string) $optValue) />
    @endforeach
</div>
