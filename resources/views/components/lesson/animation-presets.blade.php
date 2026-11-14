@props(['layerId'])

{{-- A figure with bones: the animation presets (resources/animations, resources/js/anim/presets-picker.js). A preset
     clicked plays on the figure, over and over, until it is clicked again or another one is; Add lays it into the
     figure's keys at the playhead, where every key stays the teacher's to change, and one undo takes it back. --}}
@php
    $presets = collect(\App\Services\Stage25d\AnimationPresets::catalogue())
        ->map(fn ($p) => ['id' => $p['id'], 'label' => __($p['label']), 'group' => __($p['group'])])->values()->all();
@endphp
<x-ui.settings-section :title="__('Animation')" :open="false" class="-mx-4 mt-3 w-auto!" x-show="info?.puppet" data-stage25d-animation-section>
    <div x-data="animationPresets(@js($layerId), @js($presets))" x-effect="open || stop()" class="space-y-3"
         data-loop-hint="{{ __('Repeats to the end of the scene') }}" data-once-hint="{{ __('Plays once, :s s') }}">
        <template x-for="g in groups" :key="g.name">
            <div class="space-y-1">
                <div class="text-xs text-panel-hint" x-text="g.name"></div>
                <div class="grid grid-cols-2 gap-1" role="listbox" :aria-label="g.name">
                    <template x-for="p in g.items" :key="p.id">
                        <button type="button" role="option" :aria-selected="chosen === p.id" :data-animation-preset="p.id"
                                x-on:click="toggle(p.id)"
                                class="flex h-8 min-w-0 items-center gap-1.5 rounded px-2 text-left text-xs ring-1 transition-colors"
                                :class="chosen === p.id ? 'bg-primary/10 text-base-content ring-primary' : 'bg-base-200 text-base-content/80 ring-transparent hover:ring-base-content/30'">
                            <span class="h-1.5 w-1.5 shrink-0 rounded-full" :class="previewing && chosen === p.id ? 'bg-primary animate-pulse' : 'bg-transparent'" aria-hidden="true"></span>
                            <span class="truncate" x-text="p.label"></span>
                        </button>
                    </template>
                </div>
            </div>
        </template>

        <div class="space-y-2 border-t border-panel-hairline pt-3" x-show="chosen" x-cloak>
            <x-ui.panel-row :label="__('Speed')">
                <div class="join w-full" role="radiogroup" aria-label="{{ __('Speed') }}">
                    @foreach ([[0.75, __('Slow')], [1, __('Normal')], [1.5, __('Fast')]] as [$value, $label])
                        <button type="button" role="radio" class="btn btn-sm join-item flex-1 px-0 text-xs font-normal" data-animation-speed="{{ $value }}"
                                :aria-checked="speed === {{ $value }}" :class="speed === {{ $value }} ? 'btn-active' : 'btn-ghost'"
                                x-on:click="speed = {{ $value }}">{{ $label }}</button>
                    @endforeach
                </div>
            </x-ui.panel-row>
            <button type="button" class="btn btn-sm btn-primary w-full" data-animation-add x-on:click="add()">
                <x-icons.plus class="h-4 w-4" />
                {{ __('Add at playhead') }}
            </button>
            <p class="text-xs text-panel-hint" x-text="hint"></p>
        </div>
    </div>
</x-ui.settings-section>
