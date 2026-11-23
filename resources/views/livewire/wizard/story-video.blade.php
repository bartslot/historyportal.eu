{{-- Lesson settings > Video (story to video). See App\Livewire\Wizard\StoryVideo. --}}
<div class="space-y-3" data-story-video @if ($busy) wire:poll.5s @endif>
    @unless ($planned)
        <p class="text-prose text-panel-hint">{{ __('Characters, places and a clip for every line, made from the approved script.') }}</p>
        <button type="button" class="btn btn-sm w-full" wire:click="plan">{{ __('Read the script') }}</button>
    @else
        <x-ui.segmented panel name="story-video-step" :value="$kind->value"
                        :options="collect($steps)->map(fn ($s) => [$s['kind']->value, $s['kind']->label().' '.$s['approved'].'/'.$s['count']])->all()"
                        on-change="$wire.set('step', $event.target.value)" />

        @if ($renderPc)
            <p class="text-prose text-panel-hint" data-render-pc>{{ $renderPc }}</p>
        @endif

        @unless ($configured)
            <p class="text-prose text-error">{{ $kind->isVideo() ? __('No clip maker is set up for this step yet.') : __('No picture maker is set up yet (the ChatGPT route).') }}</p>
        @endunless

        @if ($items->isEmpty())
            <p class="text-prose text-panel-hint">
                {{ $kind === \App\Enums\StoryMediaKind::CharacterSheet ? __('The script names no cast with colours.') : __('Nothing to make in this step.') }}
            </p>
        @else
            <div class="grid grid-cols-3 gap-1.5">
                @foreach ($items as $item)
                    <button type="button" wire:key="story-item-{{ $item->id }}" wire:click="$set('openItem', {{ $item->id }})"
                            data-tooltip="{{ $item->label }} · {{ $item->status->label() }}"
                            @class([
                                'relative aspect-video overflow-hidden rounded ring-1 transition',
                                'ring-primary' => $openItem === $item->id,
                                'ring-slate-700 hover:ring-slate-400' => $openItem !== $item->id,
                            ])>
                        @if ($item->url() && $item->kind->isVideo())
                            <video src="{{ $item->url() }}" muted playsinline preload="metadata" class="h-full w-full object-cover"></video>
                        @elseif ($item->url())
                            <img src="{{ $item->url() }}" alt="{{ $item->label }}" class="h-full w-full object-cover" />
                        @else
                            <span class="flex h-full w-full items-center justify-center p-1 text-center text-2xs text-panel-hint">{{ $item->label }}</span>
                        @endif
                        @if ($item->status->isBusy())
                            <span class="loading loading-spinner loading-xs absolute right-1 top-1"></span>
                        @elseif ($item->status === \App\Enums\StoryMediaStatus::Approved)
                            <x-icons.check-circle class="absolute right-1 top-1 h-3.5 w-3.5" />
                        @elseif ($item->status === \App\Enums\StoryMediaStatus::Failed)
                            <span class="badge badge-error badge-xs absolute right-1 top-1">!</span>
                        @endif
                    </button>
                @endforeach
            </div>

            @if ($open)
                <div class="space-y-2 border-t border-panel-hairline pt-3" wire:key="story-open-{{ $open->id }}">
                    @if ($open->url() && $open->kind->isVideo())
                        <video src="{{ $open->url() }}" controls playsinline class="w-full rounded"></video>
                    @elseif ($open->url())
                        <img src="{{ $open->url() }}" alt="{{ $open->label }}" class="w-full rounded" />
                    @endif
                    <div class="flex items-baseline justify-between gap-2">
                        <span class="truncate text-xs">{{ $open->label }}</span>
                        <span class="shrink-0 text-xs text-panel-hint">{{ $open->status->label() }}</span>
                    </div>
                    @if ($open->kind->isVideo())
                        <p class="text-prose text-panel-hint">“{{ ($open->input ?? [])['text'] ?? '' }}”</p>
                    @endif
                    @if ($open->error)
                        <p class="text-prose text-error">{{ $open->error }}</p>
                    @endif
                    @if (! $open->status->isBusy() && $open->status !== \App\Enums\StoryMediaStatus::Planned && $canStart && $configured)
                        <input type="text" wire:model="note" class="input input-sm w-full" maxlength="500"
                               placeholder="{{ __('What should change? (optional)') }}" aria-label="{{ __('What should change?') }}" />
                        <div class="flex gap-2">
                            @if ($open->status === \App\Enums\StoryMediaStatus::Ready)
                                <button type="button" class="btn btn-sm btn-primary flex-1" wire:click="approve({{ $open->id }})">{{ __('Approve') }}</button>
                            @endif
                            <button type="button" class="btn btn-sm flex-1" wire:click="redo({{ $open->id }})">{{ __('Make again') }}</button>
                        </div>
                    @endif
                </div>
            @endif

            <div class="flex items-center gap-2 border-t border-panel-hairline pt-3">
                @if (! $canStart)
                    <p class="text-prose text-panel-hint">{{ __('Approve the step before this one first.') }}</p>
                @elseif ($toMake > 0)
                    <button type="button" class="btn btn-sm btn-primary flex-1" wire:click="start" @disabled(! $configured)>
                        {{ $kind->isVideo()
                            ? __('Make :count clips (:seconds s)', ['count' => $toMake, 'seconds' => $seconds])
                            : __('Make :count pictures', ['count' => $toMake]) }}
                    </button>
                @elseif ($ready > 0)
                    <button type="button" class="btn btn-sm flex-1" wire:click="approveAll">{{ __('Approve all :count', ['count' => $ready]) }}</button>
                @endif
                <button type="button" class="btn btn-sm btn-ghost" wire:click="plan" data-tooltip="{{ __('Read the script again') }}"
                        aria-label="{{ __('Read the script again') }}">
                    <x-icons.arrow-path class="h-3.5 w-3.5" />
                </button>
            </div>
        @endif
    @endunless
</div>
