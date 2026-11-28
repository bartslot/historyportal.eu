<div class="mx-auto max-w-3xl px-4 py-10 sm:px-6" data-offline-lessons>
    <h1 class="text-2xl font-bold text-base-content">{{ __('Offline lessons') }}</h1>
    <p class="mt-1 text-sm text-panel-hint">
        {{ __('Take a lesson to this computer before you lose the connection, edit it here with every tool, and bring it back online after. While it is offline, its scenes stay locked for others on :site.', ['site' => $this->host]) }}
    </p>

    @if ($notice)
        <div class="alert alert-success mt-4 text-sm" role="status">{{ $notice }}</div>
    @endif
    @if ($problem)
        <div class="alert alert-error mt-4 text-sm" role="alert">{{ $problem }}</div>
    @endif

    {{-- On this computer: what changed here, and the way back. --}}
    @if ($this->copies !== [])
        <section class="card mt-6 border border-base-300 bg-base-200">
            <div class="card-body gap-4">
                <h2 class="text-base font-semibold">{{ __('On this computer') }}</h2>
                @foreach ($this->copies as $copy)
                    <div wire:key="copy-{{ $copy['id'] }}" @class(['rounded-box border p-4', 'border-primary' => $focus === $copy['lesson_id'], 'border-base-300' => $focus !== $copy['lesson_id']]) data-offline-copy="{{ $copy['lesson_id'] }}">
                        <div class="flex flex-wrap items-center justify-between gap-3">
                            <div class="min-w-0">
                                <a href="{{ route('teacher.lessons.wizard', $copy['lesson_id']) }}" class="link-hover font-medium">{{ $copy['title'] }}</a>
                                <p class="text-xs text-panel-hint">
                                    @if ($copy['changed'] === 0 && ! $copy['lesson_changed'])
                                        {{ __('No changes here yet.') }}
                                    @else
                                        {{ trans_choice('{1} 1 scene changed here.|[2,*] :count scenes changed here.|[0] Lesson settings changed here.', $copy['changed'], ['count' => $copy['changed']]) }}
                                    @endif
                                    @if ($copy['holds'])
                                        {{ __('Its scenes are locked for others on :site.', ['site' => $this->host]) }}
                                    @endif
                                    @if ($copy['synced_at'])
                                        {{ __('Last synced :when.', ['when' => $copy['synced_at']->diffForHumans()]) }}
                                    @endif
                                </p>
                            </div>
                            <div class="flex gap-2">
                                <button type="button" class="btn btn-sm" wire:click="refresh({{ $copy['id'] }})" wire:loading.attr="disabled">{{ __('Get latest') }}</button>
                                <button type="button" class="btn btn-sm btn-primary" wire:click="bringOnline({{ $copy['id'] }})" wire:loading.attr="disabled"
                                        @disabled(isset($conflicts[$copy['id']]) && ! $this->answered($copy['id']))>
                                    <span wire:loading.remove wire:target="bringOnline({{ $copy['id'] }})">{{ __('Bring back online') }}</span>
                                    <span wire:loading wire:target="bringOnline({{ $copy['id'] }})" class="loading loading-spinner loading-xs"></span>
                                </button>
                            </div>
                        </div>

                        {{-- Changed on both sides: nothing was sent. One card per scene. --}}
                        @if (! empty($conflicts[$copy['id']]))
                            <div class="mt-4 flex flex-col gap-3" data-offline-conflicts>
                                <p class="text-sm">{{ __('Nothing was sent yet. These changed on :site while you were away. Pick what to keep for each, then bring it back online again.', ['site' => $this->host]) }}</p>
                                @foreach ($conflicts[$copy['id']] as $c)
                                    @php
                                        $key = (string) $c['key'];
                                        $picked = $answers[$copy['id']][$key] ?? null;
                                        $options = $key === 'lesson'
                                            ? ['mine' => __('Keep mine'), 'theirs' => __('Keep theirs')]
                                            : ['mine' => __('Keep mine'), 'theirs' => __('Keep theirs'), 'both' => __('Keep both')];
                                        if ($c['reason'] === 'changed-deleted') {
                                            $options = ['mine' => __('Delete it'), 'theirs' => __('Keep theirs')];
                                        }
                                    @endphp
                                    <div class="rounded-box bg-base-100 p-3" wire:key="conflict-{{ $copy['id'] }}-{{ $key }}" data-offline-conflict="{{ $key }}">
                                        <p class="text-sm font-medium">
                                            {{ $key === 'lesson' ? __('Lesson settings and scene order') : ($c['title'] ?: __('Scene :id', ['id' => $key])) }}
                                        </p>
                                        <p class="text-xs text-panel-hint">
                                            @switch($c['reason'])
                                                @case('changed') {{ __('You changed it here, and someone changed it on :site too.', ['site' => $this->host]) }} @break
                                                @case('changed-deleted') {{ __('You deleted it here, and someone changed it on :site.', ['site' => $this->host]) }} @break
                                                @case('gone') {{ __('You changed it here, and someone deleted it on :site.', ['site' => $this->host]) }} @break
                                                @case('busy') {{ __(':name is editing it on :site right now.', ['name' => $c['holder'] ?: __('Someone'), 'site' => $this->host]) }} @break
                                            @endswitch
                                            @if ($c['reason'] !== 'gone')
                                                {{ __('Keep both adds your version right after theirs. A version you replace is saved on the server.') }}
                                            @endif
                                        </p>
                                        <div class="join mt-2">
                                            @foreach ($options as $value => $label)
                                                <button type="button" wire:click="answer({{ $copy['id'] }}, '{{ $key }}', '{{ $value }}')"
                                                        @class(['btn btn-sm join-item', 'btn-primary' => $picked === $value])
                                                        aria-pressed="{{ $picked === $value ? 'true' : 'false' }}">{{ $label }}</button>
                                            @endforeach
                                        </div>
                                    </div>
                                @endforeach
                            </div>
                        @endif
                    </div>
                @endforeach
            </div>
        </section>
    @endif

    {{-- The live site: sign in once, then pick a lesson to take offline. --}}
    <section class="card mt-6 border border-base-300 bg-base-200">
        <div class="card-body gap-4">
            @if (! $this->account)
                <h2 class="text-base font-semibold">{{ __('Sign in to :site', ['site' => $this->host]) }}</h2>
                <form wire:submit="signIn" class="flex flex-col gap-3 sm:max-w-sm">
                    <label class="form-control">
                        <span class="label-text mb-1">{{ __('Email') }}</span>
                        <input type="email" class="input input-bordered" wire:model="email" autocomplete="username" required>
                        @error('email') <span class="mt-1 text-xs text-error">{{ $message }}</span> @enderror
                    </label>
                    <label class="form-control">
                        <span class="label-text mb-1">{{ __('Password') }}</span>
                        <input type="password" class="input input-bordered" wire:model="password" autocomplete="current-password" required>
                    </label>
                    <button type="submit" class="btn btn-primary self-start" wire:loading.attr="disabled">{{ __('Sign in') }}</button>
                </form>
            @else
                <div class="flex flex-wrap items-center justify-between gap-2">
                    <h2 class="text-base font-semibold">{{ __('Your lessons on :site', ['site' => $this->host]) }}</h2>
                    <div class="flex gap-2">
                        <button type="button" class="btn btn-sm" wire:click="loadRemote" wire:loading.attr="disabled">{{ $remoteLessons === [] ? __('Show my lessons') : __('Refresh list') }}</button>
                        <button type="button" class="btn btn-sm btn-ghost" wire:click="signOut">{{ __('Sign out') }}</button>
                    </div>
                </div>
                <p class="text-xs text-panel-hint">{{ __('Signed in as :name.', ['name' => $this->account['name']]) }}</p>
                @if ($remoteLessons !== [])
                    <ul class="flex flex-col divide-y divide-base-300">
                        @foreach ($remoteLessons as $remote)
                            <li class="flex items-center justify-between gap-3 py-2" wire:key="remote-{{ $remote['code'] }}">
                                <div class="min-w-0">
                                    <p class="truncate text-sm">{{ $remote['title'] }}</p>
                                    <p class="text-xs text-panel-hint">{{ trans_choice('{1} 1 scene|[0,*] :count scenes', $remote['scenes'], ['count' => $remote['scenes']]) }}</p>
                                </div>
                                <button type="button" class="btn btn-sm" wire:click="takeOffline('{{ $remote['code'] }}')" wire:loading.attr="disabled">
                                    <span wire:loading.remove wire:target="takeOffline('{{ $remote['code'] }}')">{{ __('Take offline') }}</span>
                                    <span wire:loading wire:target="takeOffline('{{ $remote['code'] }}')" class="loading loading-spinner loading-xs"></span>
                                </button>
                            </li>
                        @endforeach
                    </ul>
                @endif
            @endif
        </div>
    </section>
</div>
