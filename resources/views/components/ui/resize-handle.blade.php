{{--
  The ONE resize handle for every drawer and panel divider in the lesson editor. It draws the
  separator and its grip and reports the pointer. The owner sizes its own panel, through the
  events in resources/js/ui/resize-handle.js (resize-start, -drag, -end, -step, -reset, -hide).

  axis="x": a vertical divider, drags left and right (col-resize).
  axis="y": a horizontal divider, drags up and down (row-resize).

  The handle fills the box you give it (position, size and id come from the caller); its line runs
  the full length of that box. Styles: .lp-resize in resources/css/app.css.
--}}
@props(['axis' => 'x', 'label'])
<div x-data="resizeHandle('{{ $axis }}')"
     x-on:pointerdown="down($event)"
     x-on:pointermove="move($event)"
     x-on:pointerup="up($event)"
     x-on:pointercancel="up($event)"
     x-on:keydown="key($event)"
     x-on:dblclick="$dispatch('resize-reset')"
     :data-dragging="dragging ? '' : null"
     data-resize-handle
     data-tooltip="{{ __('Drag to resize. Double-click to reset. Drag to the edge to hide.') }}"
     tabindex="0"
     role="separator"
     aria-orientation="{{ $axis === 'x' ? 'vertical' : 'horizontal' }}"
     aria-label="{{ $label }}"
     {{ $attributes->class(['lp-resize']) }}>
    <span class="lp-resize-line" aria-hidden="true"></span>
    <span class="lp-resize-pill" aria-hidden="true"></span>
</div>
