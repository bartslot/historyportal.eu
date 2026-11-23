/**
 * stage-handle.js — the look of a resize handle on the stage: Keynote's small white dot.
 * Pictures, speech balloons and text boxes all draw their handles with it, so a handle means
 * the same thing on every layer.
 */
export const handleCss = (pos, cursor) => `position:absolute; ${pos} width:10px; height:10px; pointer-events:auto;
  border-radius:50%; background:#fff; border:1px solid rgba(15,23,42,0.55); cursor:${cursor};
  box-shadow:0 1px 3px rgba(0,0,0,0.4); touch-action:none;`
