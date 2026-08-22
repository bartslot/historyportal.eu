@props([
    /**
     * Alpine expression holding the chosen style key, e.g. 'style'. The picker READS the owner's
     * value rather than keeping a second copy: a card row with its own idea of what is selected
     * goes quietly out of step the first time anything else changes the style.
     */
    'model' => 'style',
    /** Alpine statement run after the choice changes — closing a popover, say. */
    'onSelect' => '',
])

@php
    /**
     * The three styles the Time-Map offers, with the thumbnail that shows what each looks like.
     * Antique and Pen-ink are deliberately not offered (they read almost identically to Soft
     * Atlas) but their thumbnails exist, so adding one back is a line here.
     *
     * Earth is Satellite v2, which is why its thumbnail is satellite.webp and not a third file.
     */
    $styles = [
        ['soft-atlas', __('Atlas'), 'img/map-styles/soft-atlas.webp'],
        ['night',      __('Night'), 'img/map-styles/night.webp'],
        ['earth',      __('Earth'), 'img/map-styles/satellite.webp'],
    ];
@endphp

{{-- The basemap chooser, as pictures.

     One row, one card per style, the chosen one ringed in white. The keys are the same strings
     `window.__applyMapStyle` already understands and the same ones written to `tm-style`, so this
     is a new face on the existing switch rather than a second switch. --}}
<div {{ $attributes->class(['flex items-start gap-2']) }} role="group" aria-label="{{ __('Map style') }}">
    @foreach ($styles as [$key, $label, $thumb])
        @php
            $isChosen = sprintf("%s === '%s'", $model, $key);
            $choose = sprintf(
                "%s = '%s'; window.__applyMapStyle && window.__applyMapStyle('%s'); window.localStorage.setItem('tm-style', '%s'); %s",
                $model, $key, $key, $key, $onSelect
            );
        @endphp
        <x-ui.map-style-card
            :value="$key"
            :label="$label"
            :thumb="$thumb"
            :selected-when="$isChosen"
            :on-select="$choose" />
    @endforeach
</div>
