{{-- The per-property keyframe marker — the small outlined rhombus the file puts after Color, X, Y,
     W, H and Scale.

     DRAWN, NOT WIRED, and deliberately a <span> rather than a <button>.

     What it is for is settled: it is the per-property keyframe control that feeds the Animate tab.
     What it DOES is not — there is no spec yet for what pressing one adds, where that keyframe is
     stored, or how it relates to the whole-layer entrance the Animate tab already edits. A button
     that looks pressable and does nothing is worse than a marker that does not claim to be
     pressable, so this is inert and aria-hidden until the behaviour exists. Turning it into a
     control is then a one-line change here plus a handler.

     An earlier pass read this as Figma's own bind-to-a-variable chrome and left it out entirely.
     That was wrong: it is part of the design.

     Geometry is the file's — a 9.1px square turned 45 degrees inside a 12.9px box. --}}
<span {{ $attributes->class(['flex shrink-0 items-center justify-center']) }}
      style="width: 12.872px; height: 12.872px" aria-hidden="true">
    <span class="-rotate-45 rounded-[1px] border border-base-content/40"
          style="width: 9.102px; height: 9.102px"></span>
</span>
