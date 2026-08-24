@props(['layer'])

@php
    $aid = $layer['asset_id'];

    /**
     * The thumbnail's backing plate follows the ARTWORK, not the panel.
     *
     * The library is line art — dark strokes on nothing — so on the panel's own dark surface a
     * tipi is a black shape on a black plate and the preview shows nothing at all. A light plate
     * suits everything except artwork that has been tinted light, which is the one case that then
     * disappears, so that case gets the dark plate back. An opaque photograph covers either.
     */
    $tint = $layer['tint'] ?? null;
    $isLightArtwork = false;

    if (is_string($tint) && preg_match('/^#([0-9a-fA-F]{6})$/', $tint, $m)) {
        [$r, $g, $b] = array_map(fn (string $h): float => hexdec($h) / 255, str_split($m[1], 2));
        // Rec. 709 luma — close enough to perceived lightness for a yes/no plate decision.
        $isLightArtwork = (0.2126 * $r + 0.7152 * $g + 0.0722 * $b) > 0.55;
    }
@endphp

{{-- The inspector's title bar — Figma's `title-section`: what is selected, and the way to remove
     it. The way BACK is the breadcrumb in the tab header below, as the file draws it.

     It sits ABOVE the Format/Animate tabs, not inside either of them, because it names the thing
     both tabs are about. Keeping it in the Format panel meant it vanished on the Animate tab and
     the panel lost its subject. --}}
<div {{ $attributes->class(['flex items-center gap-3 px-4 pb-4 pt-5']) }}>
    {{-- No back arrow here. The way back is the breadcrumb in the tab header below, where the
         Figma puts it; two back affordances a centimetre apart, drawn differently, is one too
         many. --}}
    {{-- Both dimensions set, never `auto`: the thumbnail is arbitrary artwork, and an unsized one
         renders at its intrinsic size for a frame and shoves the whole panel down. --}}
    <img src="{{ $layer['url'] }}" alt="" width="68" height="42"
         @class([
             'h-[42px] w-[68px] shrink-0 rounded-lg object-contain p-1',
             'bg-base-100' => $isLightArtwork,
             'bg-white' => ! $isLightArtwork,
         ]) />

    <h2 class="min-w-0 flex-1 truncate text-lg font-bold text-base-content">
        {{ $layer['title'] ?? __('Layer') }}
    </h2>

    <button type="button" wire:click="detachArtwork({{ $aid }})"
            data-tooltip="{{ __('Remove layer') }}"
            class="btn btn-ghost btn-sm btn-circle shrink-0 text-base-content/40 hover:text-error"
            aria-label="{{ __('Remove layer') }}">
        <x-icons.trash class="h-4 w-4" />
    </button>
</div>
