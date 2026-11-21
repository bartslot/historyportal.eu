@props([
    /** 'painted' or 'straight' — what the picture shows now. */
    'value',
    /** Radio-group name, unique on the page. */
    'name',
    /** Alpine statement run on change; `$event.target.value` is 'painted' or 'straight'. */
    'onChange',
])

{{-- The Mask tab: the picture painted on paper (a soft, irregular edge with the paper around it) or
     full-bleed. One control for the scene's picture and for a picture layer (resources/js/scene/paper-edge.js). --}}
<div x-data="{ edge: @js($value) }" data-paper-edge-control class="space-y-1 pt-3">
    <span class="block text-2xs font-semibold uppercase tracking-wider text-panel-hint">{{ __('Edge') }}</span>
    <x-ui.segmented panel :name="$name" model="edge"
                    :options="[['painted', __('Painted on paper')], ['straight', __('Straight')]]"
                    :on-change="$onChange" />
    <p class="text-prose leading-tight text-panel-hint" x-show="edge === 'painted'" x-cloak>
        {{ __('A soft painted edge, with the paper around it.') }}
    </p>
    <p class="text-prose leading-tight text-panel-hint" x-show="edge === 'straight'" x-cloak>
        {{ __('The picture fills its box to the edges.') }}
    </p>
</div>
