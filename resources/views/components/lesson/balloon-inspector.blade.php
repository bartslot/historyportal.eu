@props(['balloon', 'speakers' => []])

@php
    $id = (string) $balloon['id'];
    $kind = in_array($balloon['kind'] ?? null, \App\Services\Support\SpeechBalloons::KINDS, true) ? $balloon['kind'] : 'speech';
    // The type row: one icon each (Heroicons outline: chat bubble, cloud, megaphone), the name as its
    // tooltip and the heading above, so the three stay on one row in the narrow panel.
    $kindIcons = [
        'speech' => 'M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z',
        'thought' => 'M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z',
        'sound' => 'M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46',
    ];
    $layerName = match ($kind) { 'thought' => __('Thought balloon'), 'sound' => __('Sound word'), default => __('Speech balloon') };
    $speaker = $balloon['figure']['asset_id'] ?? null;
    // The timeline's name for this balloon: bal_3 → bal:3 (resources/js/anim/properties.js `bal`).
    $target = 'bal:'.substr($id, 4);
    $scale = (float) ($balloon['scale'] ?? 1.0);
    $opacity = (float) ($balloon['opacity'] ?? 1.0);
    $jsId = \Illuminate\Support\Js::from($id);
    $live = fn (string $field) => "window.__balloons?.patch({$jsId}, { {$field}: parseFloat(\$event.target.value) })";
    $save = fn (string $field) => "updateBalloon({$jsId}, '{$field}', \$event.target.value)";
@endphp

{{-- A speech or thought balloon, or a sound word (EditsSceneBalloons). Its words are typed on the stage too; the
     tail is pulled from the balloon's edge there. Silent text: the narrator is the only voice. --}}
<div class="space-y-3 text-sm" wire:key="balloon-inspector-{{ $id }}">
    <x-ui.panel-breadcrumb :label="__('Scene')"
                           wire:click="clearActiveBalloon"
                           x-on:click="window.__balloons?.select(null); window.__clearLayerGuard?.()" />

    <h3 class="font-semibold text-base-content">{{ $layerName }}</h3>

    <x-ui.segmented panel name="balloon-kind-{{ $id }}" class="w-full" tab-class="flex-1"
                    :value="$kind"
                    :options="[['speech', __('Speech'), $kindIcons['speech']], ['thought', __('Thought'), $kindIcons['thought']], ['sound', __('Sound word'), $kindIcons['sound']]]"
                    on-change="$wire.updateBalloon({{ \Illuminate\Support\Js::from($id) }}, 'kind', $event.target.value)" />

    <label class="form-control">
        <span class="text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Text') }}</span>
        <textarea rows="3" maxlength="{{ \App\Services\Support\SpeechBalloons::MAX_TEXT }}"
                  class="textarea textarea-bordered textarea-sm mt-1 w-full"
                  x-on:input="window.__balloons?.text({{ $jsId }}, $event.target.value.trim() || @js(\App\Services\Support\SpeechBalloons::PLACEHOLDER))"
                  x-on:input.debounce.500ms="$wire.updateBalloon({{ $jsId }}, 'text', $event.target.value)"
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

    {{-- Appear, its speed and its delay: the control a figure's Animate tab uses too. The delay is
         the balloon's start, the left end of its bar in the timeline. --}}
    <x-lesson.appear-control :name="'appear-speed-'.$id" :anim="$balloon['anim'] ?? 'pop'"
                             :natural="\App\Support\LayerEntrances::naturalMs($balloon['anim'] ?? 'pop', 'balloon')"
                             :duration="$balloon['anim_duration'] ?? null" :delay="(float) ($balloon['start'] ?? 0)"
                             :on-anim="'updateBalloon('.$jsId.', \'anim\', $event.target.value)'"
                             :on-speed="'setBalloonSpeed('.$jsId.', $event.target.value)'"
                             :on-delay="'updateBalloon('.$jsId.', \'start\', $event.target.value)'" />

    @if ($speakers !== [])
        <label class="form-control">
            <span class="text-xs font-semibold uppercase tracking-wide text-panel-label">{{ __('Speaker') }}</span>
            <select class="select select-sm select-bordered mt-1 w-full"
                    wire:change="updateBalloon(@js($id), 'speaker', $event.target.value)">
                <option value="" @selected($speaker === null)>{{ __('None') }}</option>
                @foreach ($speakers as $figure)
                    <option value="{{ $figure['asset_id'] }}" @selected((int) $speaker === (int) $figure['asset_id'])>{{ $figure['title'] ?? __('Icon') }}</option>
                @endforeach
            </select>
        </label>
    @endif

    {{-- One action, named after the layer (Bart, 2026-10-16). "Remove tail" sat here and deleted the
         whole balloon, so it read as the wrong button doing the wrong thing. --}}
    <div class="flex items-center gap-2">
        <button type="button" class="btn btn-ghost btn-sm text-error"
                wire:click="deleteBalloon(@js($id))"
                data-tooltip="(⌫)" aria-label="{{ __('Delete :name', ['name' => $layerName]) }}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="h-4 w-4" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            <span>{{ __('Delete :name', ['name' => $layerName]) }}</span>
        </button>
    </div>
</div>
