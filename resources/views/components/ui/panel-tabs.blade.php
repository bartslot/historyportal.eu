@props([
    /** [[key, label], …] — labels already translated by the caller. */
    'tabs' => [],
    /** Alpine expression holding the active key. The row READS it rather than keeping a copy. */
    'model' => 'tab',
])

{{-- The inspector's tab row.

     Stock DaisyUI `tabs tabs-box`, coloured by the learningportal theme. The Figma tab-header
     draws the active tab as a pill on an unfilled band, where tabs-box puts a tray behind the
     whole row; that is a few pixels of difference and DaisyUI wins, because a hand-tuned tab is
     exactly the kind of drift a design-pattern audit has to clean up later. --}}
<div {{ $attributes->class(['tabs tabs-box tabs-xs w-full']) }} role="tablist">
    @foreach ($tabs as [$key, $label])
        <button type="button" role="tab"
                x-on:click="{{ $model }} = '{{ $key }}'"
                :class="{{ $model }} === '{{ $key }}' ? 'tab-active' : ''"
                :aria-selected="{{ $model }} === '{{ $key }}' ? 'true' : 'false'"
                class="tab">{{ $label }}</button>
    @endforeach
</div>
