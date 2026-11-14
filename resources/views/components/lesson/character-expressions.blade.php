@props(['layerId'])

{{-- A figure from the Character tab has a face per expression (Puppet.faces): one click keys it at the playhead,
     an ordinary key in the figure's face row (resources/js/character/face-keys.js). --}}
@php
    $faces = collect(['calm' => 'Calm', 'curious' => 'Curious', 'sad' => 'Sad', 'angry' => 'Angry', 'amazed' => 'Amazed'])->map(fn ($l) => __($l));
@endphp
<x-ui.settings-section :title="__('Expression')" :open="true" class="-mx-4 mt-3 w-auto!" x-show="info?.faces?.length" data-stage25d-expression-section>
    <div x-data="characterExpressions(@js($layerId))" class="grid grid-cols-3 gap-1" role="group" aria-label="{{ __('Expression') }}">
        @foreach ($faces as $id => $label)
            <button type="button" class="btn btn-sm" data-stage25d-face="{{ $id }}"
                    x-show="(info?.faces ?? []).includes(@js($id))"
                    :class="info?.face === @js($id) ? 'btn-neutral' : 'btn-ghost'"
                    x-on:click="key(@js($id)); info = { ...info, face: @js($id) }">{{ $label }}</button>
        @endforeach
    </div>
</x-ui.settings-section>
