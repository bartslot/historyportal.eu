{{-- The teacher reads the script before pictures and narration are made (App\Services\Lessons\ScriptReview).
     Each scene's text can be edited in place; the assistant on the right rewrites on request. --}}
@php
    $revising = $this->revisingScript;
    $reviewScenes = $this->scenes->where('kind', '!=', 'map')->filter(fn ($scene) => (string) $scene->script_segment !== '')->values();
@endphp

<div class="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,.8fr)] lg:gap-12">
    <section class="min-w-0" aria-labelledby="script-review-title">
        <div class="flex items-end justify-between gap-4 border-b border-slate-800 pb-4">
            <h2 id="script-review-title" class="text-base font-semibold text-slate-100">{{ __('The script') }}</h2>
            <span class="text-xs text-panel-hint">{{ trans_choice(':count scene|:count scenes', $reviewScenes->count(), ['count' => $reviewScenes->count()]) }}</span>
        </div>

        <ol class="divide-y divide-slate-800/90">
            @foreach ($reviewScenes as $scene)
                <li class="py-4" wire:key="review-scene-{{ $scene->id }}-{{ md5((string) $scene->script_segment) }}">
                    <label for="review-scene-{{ $scene->id }}" class="text-xs font-medium text-panel-hint">
                        {{ __('Scene :number', ['number' => $loop->iteration]) }}
                    </label>
                    <textarea
                        id="review-scene-{{ $scene->id }}"
                        rows="4"
                        wire:change="saveSceneScript({{ $scene->id }}, $event.target.value)"
                        @disabled($revising)
                        class="textarea textarea-bordered mt-2 min-h-24 w-full bg-slate-900 text-sm leading-6 field-sizing-content"
                    >{{ $scene->script_segment }}</textarea>
                </li>
            @endforeach
        </ol>
    </section>

    <aside class="min-w-0 lg:sticky lg:top-6 lg:self-start" aria-labelledby="script-assistant-title">
        <div class="border-b border-slate-800 pb-4">
            <h2 id="script-assistant-title" class="text-base font-semibold text-slate-100">{{ __('Ask the assistant') }}</h2>
            <p class="mt-1 text-sm leading-6 text-panel-hint">{{ __('Say what should change, for example "make scene 2 shorter" or "more about daily life in the city".') }}</p>
        </div>

        @if ($this->reviewMessages !== [])
            <ol class="mt-4 space-y-3 text-sm leading-6" aria-live="polite">
                @foreach ($this->reviewMessages as $message)
                    <li @class([
                        'rounded-box px-3 py-2',
                        'ms-6 bg-primary/10 text-slate-200' => $message['role'] === 'teacher',
                        'me-6 border border-slate-800 text-panel-hint' => $message['role'] !== 'teacher',
                    ])>{{ $message['text'] }}</li>
                @endforeach
            </ol>
        @endif

        @if ($revising)
            <p class="mt-4 flex items-center gap-2 text-sm text-panel-hint" role="status">
                <span class="loading loading-dots loading-xs text-primary"></span>
                {{ __('The assistant is rewriting your script…') }}
            </p>
        @else
            <form wire:submit="requestScriptChanges" class="mt-4">
                <label for="script-change-request" class="sr-only">{{ __('What should change?') }}</label>
                <textarea
                    id="script-change-request"
                    wire:model="changeRequest"
                    rows="3"
                    maxlength="2000"
                    placeholder="{{ __('What should change?') }}"
                    class="textarea textarea-bordered w-full bg-slate-900 text-sm"
                ></textarea>
                @error('changeRequest') <p class="mt-1 text-xs text-error">{{ $message }}</p> @enderror
                <button type="submit" class="btn btn-sm btn-ghost mt-2 border-slate-700" wire:loading.attr="disabled" wire:target="requestScriptChanges">
                    {{ __('Ask for changes') }}
                </button>
            </form>
        @endif

        <div class="mt-8 border-t border-slate-800 pt-5">
            <button
                type="button"
                wire:click="approveScript"
                wire:loading.attr="disabled"
                wire:target="approveScript"
                @disabled($revising)
                class="btn btn-primary w-full"
            >
                <span wire:loading.remove wire:target="approveScript">{{ __('Approve the script') }}</span>
                <span wire:loading wire:target="approveScript" class="loading loading-dots loading-xs"></span>
            </button>
            <p class="mt-2 text-xs leading-5 text-panel-hint">{{ __('Pictures and narration are made from this text.') }}</p>
        </div>
    </aside>
</div>
