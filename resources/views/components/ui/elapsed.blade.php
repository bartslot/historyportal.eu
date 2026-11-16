@props(['when' => 'true'])

{{-- How long a generation has been running, m:ss, beside its spinner (resources/js/ui/elapsed.js).
     `when` is an Alpine expression; it may read the surrounding component's state. --}}
<span x-data="elapsed()" x-effect="sync({{ $when }})" x-show="running" x-cloak x-text="label"
      {{ $attributes->class(['tabular-nums']) }}></span>
