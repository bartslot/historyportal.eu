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
])

{{-- One segmented control for the whole app — DaisyUI `tabs tabs-box`, radio inputs.

     STOCK DAISYUI, DELIBERATELY. The Figma's tab-header draws the active segment as a lighter box
     inside a darker tray, and that IS tabs-box: the design is built on DaisyUI, so when the two
     look like they disagree the answer is that the wrong variant was picked, not that the design
     deviates. An earlier pass here concluded there was a conflict and hand-rolled the row; there
     was no conflict.

     Radio inputs rather than buttons, per the component's documented form
     (daisyui.com/components/tab/#tabs-box-using-radio-inputs): the browser owns the exclusivity and
     the arrow-key roving, and the label rides on `aria-label`.

     NO AMBER. These rows were `bg-amber-500 text-slate-950` on the active segment. Amber is the
     public site's; inside the teacher app the chosen state is the theme's own lighter surface,
     which is what tabs-box already paints, and the pill is fully rounded like every other control.
     Amber in the teacher app is the exact pattern being removed, so nothing here reintroduces it. --}}
<div {{ $attributes->class(['tabs tabs-box']) }} role="tablist">
    @foreach ($options as [$optValue, $optLabel])
        <input type="radio" name="{{ $name }}" value="{{ $optValue }}"
               class="tab {{ $tabClass }}"
               aria-label="{{ $optLabel }}"
               @if ($model) x-model="{{ $model }}" @endif
               @if ($onChange) x-on:change="{{ $onChange }}" @endif
               @checked($value !== null && (string) $value === (string) $optValue) />
    @endforeach
</div>
