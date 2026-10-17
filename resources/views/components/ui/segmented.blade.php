@props([
    /** Radio-group name. Must be unique on the page — two groups sharing a name share a selection. */
    'name',
    /**
     * [[value, label], …] — labels already translated by the caller. A third item is an icon: the
     * `d` of a 24px outline path (Heroicons geometry), or ['motion' => ms, 'factor' => f] for a
     * movement's own curve that plays on hover. The tab then shows the icon, and the label becomes
     * its tooltip and accessible name.
     */
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

     NO AMBER. These rows were `bg-primary text-slate-950` on the active segment. Amber is the
     public site's; inside the teacher app the chosen state is the theme's own lighter surface,
     which is what tabs-box already paints, and the pill is fully rounded like every other control.
     Amber in the teacher app is the exact pattern being removed, so nothing here reintroduces it. --}}
<div {{ $attributes->class(['tabs tabs-box', 'tabs-panel' => $panel]) }} role="tablist">
    @foreach ($options as $opt)
        @php [$optValue, $optLabel] = $opt; $optIcon = $opt[2] ?? null; @endphp
        @if ($optIcon)
            {{-- DaisyUI's icon tab: a label.tab holding the radio, so the browser still owns the
                 exclusivity and the arrow keys. .tabs-panel styles label:has(:checked). --}}
            <label class="tab {{ $tabClass }}" data-tooltip="{{ $optLabel }}" data-segment="{{ $optValue }}"
                   @if (is_array($optIcon)) x-on:mouseenter="matchMedia('(prefers-reduced-motion: reduce)').matches || $el.querySelector('animateMotion')?.beginElement()" @endif>
                <input type="radio" name="{{ $name }}" value="{{ $optValue }}" class="sr-only"
                       aria-label="{{ $optLabel }}"
                       @if ($model) x-model="{{ $model }}" @endif
                       @if ($onChange) x-on:change="{{ $onChange }}" @endif
                       @checked($value !== null && (string) $value === (string) $optValue) />
                @if (is_array($optIcon))
                    {{-- A motion icon (Appear's speed): the movement's curve, distance over time, as
                         long as it takes. Hovering runs a dot along it at the real duration, so the
                         icon shows the feel rather than naming it. Still under reduced motion. --}}
                    @php
                        $w = 8 * ($optIcon['factor'] ?? 1);
                        $curve = sprintf('M4 18 C %.2f 6 %.2f 6 %.2f 6 L20 6', 4 + $w / 3, 4 + 2 * $w / 3, 4 + $w);
                    @endphp
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" aria-hidden="true"
                         data-motion-icon>
                        <path stroke-linecap="round" stroke-linejoin="round" d="{{ $curve }}" opacity="0.55"/>
                        <circle r="2" fill="currentColor" stroke="none" cx="0" cy="0" transform="translate(4 18)">
                            <animateMotion begin="indefinite" dur="{{ (int) $optIcon['motion'] }}ms" fill="freeze"
                                           path="{{ sprintf('M0 0 C %.2f -12 %.2f -12 %.2f -12', $w / 3, 2 * $w / 3, $w) }}" />
                        </circle>
                    </svg>
                @else
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-5 w-5" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" d="{{ $optIcon }}"/>
                    </svg>
                @endif
            </label>
        @else
            <input type="radio" name="{{ $name }}" value="{{ $optValue }}"
                   class="tab {{ $tabClass }}"
                   aria-label="{{ $optLabel }}"
                   @if ($model) x-model="{{ $model }}" @endif
                   @if ($onChange) x-on:change="{{ $onChange }}" @endif
                   @checked($value !== null && (string) $value === (string) $optValue) />
        @endif
    @endforeach
</div>
