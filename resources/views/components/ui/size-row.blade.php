@props([
    'assetId',
    /** Stored base height, % of stage. */
    'height' => 40,
    /** Stored base width, or null when the layer has never had an explicit one. */
    'width' => null,
    /** Row label, already translated. */
    'label' => null,
    /** Whether the aspect starts held. */
    'locked' => true,
])

{{-- Dimensions: width, height, and the lock that keeps them in proportion.

     THE LOCK IS THE POINT. Held, editing one side scales the other by the proportion captured at
     the moment of locking — a 200 x 50 box asked for a width of 100 becomes 100 x 25, not 100 x 100.
     The proportion is captured ONCE and never re-derived from the rounded fields, because a ratio
     recomputed from what the panel displays compounds its rounding error and walks a square out of
     square while every single step still looks right. That maths is in
     resources/js/ui/aspect-lock.js and aspect-lock.test.js holds it, including a red-check that a
     recomputing implementation fails.

     Released, the two sides are independent — which is also when a layer first gets a `width` of
     its own. Until then it has only a height and takes its width from the image's aspect, so the
     field is seeded from what the overlay actually rendered rather than from a stored value that
     is not there. --}}
<div class="flex items-center gap-2" wire:key="size-row-{{ (int) $assetId }}"
     x-data="layerSizeRow({
        assetId: {{ (int) $assetId }},
        height: {{ (float) ($height ?? 40) }},
        width: {{ $width === null ? 'null' : (float) $width }},
        locked: {{ $locked ? 'true' : 'false' }},
     })">

    <span style="width: var(--settings-panel-label-w, 3.0625rem)"
          class="shrink-0 text-3xs font-semibold uppercase tracking-wide text-panel-label">{{ $label ?? __('Size') }}</span>

    {{-- DaisyUI `join` glues the pair into one control, which is what the design draws. --}}
    <div class="join min-w-0 flex-1">
        @foreach ([['w', 'W', __('Width')], ['h', 'H', __('Height')]] as [$side, $glyph, $name])
            <label class="input input-xs join-item flex min-w-0 flex-1 items-center gap-1.5 px-2"
                   style="height: var(--settings-panel-row-h, 2rem)">
                {{-- data-scrub: dragging W while the aspect is held drives H, because the drag
                     dispatches the same `input` event typing does and edit() is already on it. --}}
                <span data-scrub aria-hidden="true"
                      class="shrink-0 cursor-ew-resize select-none text-3xs font-semibold text-panel-label">{{ $glyph }}</span>
                {{-- ONE writer. `x-model` plus an input handler that also assigns to the same
                     property is two of them, and they disagree the moment the handler derives a
                     value rather than echoing one: the lock would set h to 10, x-model would put
                     the field back, and the component's own state stopped matching the field the
                     teacher was reading. `:value` binds one way and `edit()` owns the write. --}}
                <input type="number" min="1" max="200" step="0.01"
                       aria-label="{{ $name }}"
                       :value="{{ $side }}"
                       :disabled="!ready"
                       x-on:input="edit('{{ $side }}', $event.target.value)"
                       x-on:change="commit($wire)"
                       class="w-full min-w-0 border-0 bg-transparent p-0 text-xs outline-none
                              [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                <x-ui.keyframe-diamond class="border-l border-panel-hairline pl-1" />
            </label>
        @endforeach
    </div>

    {{-- Held is the app's normal state, so held reads as solid and released as muted, rather than
         the design's blue — amber and blue accents are the public site's, not the teacher app's. --}}
    <button type="button" x-on:click="toggleLock()"
            :aria-pressed="locked ? 'true' : 'false'"
            :class="locked ? 'text-base-content' : 'text-base-content/35'"
            :data-tooltip="locked ? @js(__('Aspect held')) : @js(__('Aspect free'))"
            class="btn btn-ghost btn-xs btn-square shrink-0"
            :aria-label="locked ? @js(__('Aspect held')) : @js(__('Aspect free'))">
        <x-icons.aspect-ratio class="h-4 w-4" />
    </button>
</div>
