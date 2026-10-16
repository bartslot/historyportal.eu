@props(['balloon', 'speakers' => []])

@php
    $id = (string) $balloon['id'];
    $kind = ($balloon['kind'] ?? 'speech') === 'thought' ? 'thought' : 'speech';
    $speaker = $balloon['figure']['asset_id'] ?? null;
    $hasTail = ! empty($balloon['tail']['tip']);
    $rootPinned = is_numeric($balloon['tail']['root'] ?? null);
    // The timeline's name for this balloon: bal_3 → bal:3 (resources/js/anim/properties.js `bal`).
    $target = 'bal:'.substr($id, 4);
    $scale = (float) ($balloon['scale'] ?? 1.0);
    $opacity = (float) ($balloon['opacity'] ?? 1.0);
    $jsId = \Illuminate\Support\Js::from($id);
    $live = fn (string $field) => "window.__balloons?.patch({$jsId}, { {$field}: parseFloat(\$event.target.value) })";
    $save = fn (string $field) => "updateBalloon({$jsId}, '{$field}', \$event.target.value)";
@endphp

{{-- A speech or thought balloon (EditsSceneBalloons). Its words are typed on the stage too; the
     tail is pulled from the balloon's edge there. Silent text: the narrator is the only voice. --}}
<div class="space-y-3 text-sm" wire:key="balloon-inspector-{{ $id }}">
    <x-ui.panel-breadcrumb :label="__('Scene')"
                           wire:click="clearActiveBalloon"
                           x-on:click="window.__balloons?.select(null); window.__clearLayerGuard?.()" />

    <h3 class="font-semibold text-base-content">{{ $kind === 'thought' ? __('Thought balloon') : __('Speech balloon') }}</h3>

    <x-ui.segmented panel name="balloon-kind-{{ $id }}" class="w-full" tab-class="flex-1"
                    :value="$kind"
                    :options="[['speech', __('Speech')], ['thought', __('Thought')]]"
                    on-change="$wire.updateBalloon({{ \Illuminate\Support\Js::from($id) }}, 'kind', $event.target.value)" />

    <label class="form-control">
        <span class="text-3xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Text') }}</span>
        <textarea rows="3" maxlength="{{ \App\Services\Support\SpeechBalloons::MAX_TEXT }}"
                  class="textarea textarea-bordered textarea-sm mt-1 w-full"
                  wire:change="updateBalloon(@js($id), 'text', $event.target.value)">{{ $balloon['text'] ?? '' }}</textarea>
    </label>

    <x-ui.slider-row :label="__('Scale')" :min="\App\Services\Support\SpeechBalloons::MIN_SCALE" :max="\App\Services\Support\SpeechBalloons::MAX_SCALE" :step="0.05"
                     :value="$scale" :display="(string) round($scale * 100)" unit="%" :default="1.0"
                     keyframe :keyframe-target="$target" keyframe-property="scale"
                     :on-input="$live('scale')" :on-change="$save('scale')" />

    <x-ui.slider-row :label="__('Opacity')" :min="0" :max="1" :step="0.05"
                     :value="$opacity" :display="(string) round($opacity * 100)" unit="%" :default="1.0"
                     keyframe :keyframe-target="$target" keyframe-property="opacity"
                     :on-input="$live('opacity')" :on-change="$save('opacity')" />

    <label class="form-control">
        <span class="text-3xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Appear') }}</span>
        <select class="select select-sm select-bordered mt-1 w-full"
                wire:change="updateBalloon(@js($id), 'anim', $event.target.value)">
            @foreach (\App\Support\LayerEntrances::labels() as $value => $label)
                <option value="{{ $value }}" @selected(($balloon['anim'] ?? 'pop') === $value)>{{ $label }}</option>
            @endforeach
        </select>
    </label>

    @if ($speakers !== [])
        <label class="form-control">
            <span class="text-3xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Speaker') }}</span>
            <select class="select select-sm select-bordered mt-1 w-full"
                    wire:change="updateBalloon(@js($id), 'speaker', $event.target.value)">
                <option value="" @selected($speaker === null)>{{ __('None') }}</option>
                @foreach ($speakers as $figure)
                    <option value="{{ $figure['asset_id'] }}" @selected((int) $speaker === (int) $figure['asset_id'])>{{ $figure['title'] ?? __('Icon') }}</option>
                @endforeach
            </select>
        </label>
    @endif

    <div class="flex items-center justify-between gap-2">
        @if ($hasTail || $rootPinned)
            <div class="flex items-center gap-1">
                @if ($hasTail)
                    <button type="button" class="btn btn-ghost btn-sm"
                            wire:click="updateBalloon(@js($id), 'tail', null)">{{ __('Remove tail') }}</button>
                @endif
                {{-- The tail's root back to snapping to the edge nearest the tip (as a double click
                     on its handle does). --}}
                @if ($rootPinned)
                    <button type="button" class="btn btn-ghost btn-sm"
                            x-on:click="$wire.changeBalloon(@js($id), { tail: { root: null } })">{{ __('Tail root') }}: {{ __('Auto') }}</button>
                @endif
            </div>
        @else
            <span></span>
        @endif
        <button type="button" class="btn btn-ghost btn-sm text-error"
                wire:click="deleteBalloon(@js($id))"
                data-tooltip="{{ __('Delete') }} (⌫)" aria-label="{{ __('Delete') }}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
        </button>
    </div>
</div>
