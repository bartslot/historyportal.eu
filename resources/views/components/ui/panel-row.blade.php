@props([
    /** Uppercase row label. Already translated by the caller. Null renders an empty label column,
     *  which still reserves the width so the controls beside it stay in line. */
    'label' => null,
    /** Property default. Present → the label double-clicks back to it, and says so with a cursor. */
    'default' => null,
    /** Show a keyframe diamond in the trailing column. The column is reserved either way. */
    'keyframe' => false,
    'keyframeTarget' => null,
    'keyframeProperty' => null,
])

{{-- ONE row shell for every control in a settings panel.

     Bart, 2026-08-24, on finding that a text layer, an icon and a map each had their own idea of
     where a position field goes:

     > "In Figma these are 2 different elements, but the UI is almost the same and it feels logical
     > because we know where things are. […] you have chosen to build things 1 by 1, causing
     > everything to be built without standardization in mind."

     He is right, and the evidence was six row components with six different shells — gap-1.5 next
     to gap-2 next to gap-3, py-1 on some and not others, a label column on half of them, and the
     keyframe diamond wherever the markup happened to leave it. Nothing could line up because
     nothing shared a grid.

     Three columns, always, in this order:

       1. LABEL     — fixed at the panel's label width, so every control starts at the same x
       2. CONTENT   — whatever the row is: fields, a slider, a dial, a pair of buttons
       3. KEYFRAME  — fixed width, RESERVED even when the row has no diamond

     Reserving the third column is what makes the right edge straight. A row that simply omitted it
     pulled its content 13px wider than its neighbours, which is the ragged edge in Bart's
     screenshot — and it is why Figma's own inspector puts every diamond in one column. --}}
<div {{ $attributes->class(['flex items-center gap-2']) }} style="min-height: var(--settings-panel-row-h, 2rem)">
    <span @if ($default !== null) data-scrub @endif
          @class([
              'shrink-0 select-none text-3xs font-semibold uppercase leading-tight tracking-wide text-panel-label',
              'cursor-col-resize' => $default !== null,
          ])
          style="width: var(--settings-panel-label-w, 3.0625rem)">{{ $label }}</span>

    <div class="flex min-w-0 flex-1 items-center gap-1.5">{{ $slot }}</div>

    <span class="flex shrink-0 items-center justify-center" style="width: 12.872px">
        @if ($keyframe)
            <x-ui.keyframe-diamond :target="$keyframeTarget" :property="$keyframeProperty" />
        @endif
    </span>
</div>
