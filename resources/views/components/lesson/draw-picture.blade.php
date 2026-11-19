@props(['scene'])

{{-- Draw: type what this scene needs, ChatGPT on this machine draws it in History Lines and it lands in the scene as a
     layer, and in My cut-outs for every other scene (DrawsWithChatGpt). Local only, like the spark. The drawing runs on
     whichever scene is open by the time it is done; it is placed only in the scene it was asked for. --}}
@if (\App\Services\Local\LocalChatGpt::available())
<form class="mt-3" data-draw-picture x-data="drawPicture({{ $scene->id }})" x-on:submit.prevent="draw()">
    <span class="mb-1 block text-2xs font-semibold uppercase tracking-wider text-panel-hint">{{ __('Draw with ChatGPT') }}</span>
    <div class="flex items-center gap-2">
        <input type="text" class="input input-sm input-bordered min-w-0 flex-1" maxlength="300" x-model="text" :disabled="busy"
               placeholder="{{ __('Marco Polo on a camel') }}" aria-label="{{ __('What to draw') }}"
               x-on:keydown.stop />
        <button type="submit" class="btn btn-sm btn-primary" :disabled="busy || !text.trim()"
                :aria-label="busy ? @js(__('ChatGPT is drawing')) : @js(__('Draw'))">
            <x-icons.sparkles class="h-3.5 w-3.5" ::class="busy && 'animate-pulse'" />
            <span>{{ __('Draw') }}</span>
        </button>
    </div>
    <p class="mt-1 text-2xs text-panel-hint" x-show="busy" x-cloak>{{ __('A few minutes: ink first, then the watercolour. You can keep working.') }}</p>
</form>
@endif
