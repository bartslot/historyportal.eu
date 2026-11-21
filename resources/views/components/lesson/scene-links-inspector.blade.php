@props(['scene', 'targets' => []])

{{-- The Choices layer: buttons that fade in over the scene when it ends, each jumping to a scene of the lesson, the way a
     Twine passage links to others (App\Services\Lessons\SceneLinks). Shown once the layer is added (Add > Choices);
     every field saves on change through EditsSceneLinks. Monochrome, 32 px controls, no prose (history-portal-ui). --}}
@php
    $links = array_values((array) (($scene->config ?? [])['links'] ?? []));
    $ending = (($scene->config ?? [])['ending'] ?? false) === true;
    $prompt = \App\Services\Lessons\ChoicePrompt::prompt($scene->config ?? []);
@endphp
@if ($links !== [] || $ending)
<section data-scene-links-inspector class="mt-4 space-y-2 border-t border-base-content/10 pt-3"
         wire:key="scene-links-{{ $scene->id }}-{{ md5((string) json_encode([$links, $ending, $prompt])) }}">
    <div class="flex h-8 items-center justify-between">
        <h4 class="lp-card-label text-panel-label">{{ __('Choices') }}</h4>
        <label class="flex h-8 cursor-pointer items-center gap-2 text-xs text-panel-label">
            <input type="checkbox" class="toggle toggle-xs" @checked($ending)
                   wire:change="setSceneEnding({{ $scene->id }}, $event.target.checked)" />
            {{ __('Ending') }}
        </label>
    </div>

    @if (count($links) >= 2)
        {{-- What the narrator says as the choices fade in, before reading them out (App\Services\Lessons\ChoicePrompt). --}}
        <textarea rows="2" maxlength="{{ \App\Services\Lessons\ChoicePrompt::MAX }}" data-choices-prompt
                  wire:change="saveChoicesPrompt({{ $scene->id }}, $event.target.value)"
                  placeholder="{{ __('What the narrator asks') }}" aria-label="{{ __('What the narrator asks') }}"
                  class="textarea textarea-sm textarea-bordered w-full resize-none leading-snug">{{ $prompt }}</textarea>
    @endif

    @foreach ($links as $i => $link)
        <div data-scene-link-row class="space-y-1">
            <div class="flex items-center gap-1">
                <input type="text" maxlength="{{ \App\Services\Lessons\SceneLinks::LABEL_MAX }}"
                       value="{{ $link['label'] ?? '' }}"
                       wire:change="saveSceneLink({{ $scene->id }}, {{ $i }}, 'label', $event.target.value)"
                       placeholder="{{ __('Button text') }}" aria-label="{{ __('Button text') }}"
                       class="input input-sm input-bordered min-w-0 flex-1" />
                <button type="button" class="btn btn-ghost btn-sm btn-square text-panel-hint"
                        wire:click="removeSceneLink({{ $scene->id }}, {{ $i }})"
                        data-tooltip="{{ __('Remove choice') }}" aria-label="{{ __('Remove choice') }}">
                    <x-ui.icon name="close" class="h-4 w-4" />
                </button>
            </div>
            <select class="select select-sm select-bordered w-full"
                    wire:change="saveSceneLink({{ $scene->id }}, {{ $i }}, 'to', $event.target.value)"
                    aria-label="{{ __('Goes to') }}">
                <option value="" @selected(($link['to'] ?? null) === null)>{{ __('Goes to…') }}</option>
                @foreach ($targets as $target)
                    <option value="{{ $target['id'] }}" @selected(($link['to'] ?? null) === $target['id'])>→ {{ $target['label'] }}</option>
                @endforeach
            </select>
        </div>
    @endforeach

    @if (! $ending && count($links) < \App\Services\Lessons\SceneLinks::MAX_LINKS)
        <button type="button" class="btn btn-ghost btn-sm w-full justify-start text-panel-link"
                wire:click="addSceneLink({{ $scene->id }})">
            <x-icons.plus class="h-4 w-4" /> {{ __('Add choice') }}
        </button>
    @endif
</section>
@endif
