@props([
    /** The meaning, as a file name in resources/ui-icons (App\Support\UiIcon). */
    'name',
])

{{-- One interface icon. Size comes from the caller: h-5 w-5 (20 px) in the top bar, h-4 w-4
     (16 px) in panels, rows and menus; with no class it is 16 px. Colour is the text colour of
     whatever holds it. The caller's class replaces the default rather than merging with it, or
     h-4 and h-5 would both land on one icon. --}}
{!! \App\Support\UiIcon::svg($name, array_merge(
    ['aria-hidden' => 'true', 'data-icon' => $name, 'class' => 'h-4 w-4 shrink-0'],
    $attributes->getAttributes(),
)) !!}
