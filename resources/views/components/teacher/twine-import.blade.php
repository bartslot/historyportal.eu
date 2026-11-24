@php
    // The worlds a 3D scene can stand in, as the editor's World chooser lists them: the teacher's own first, then by continent.
    $own = \App\Models\StageWorld::where('user_id', auth()->id())->latest()->get()
        ->map(fn ($w) => ['key' => $w->key(), 'label' => $w->name]);
    $groups = collect(config('worlds', []))
        ->map(fn ($w, $key) => ['key' => $key, 'label' => __($w['label']), 'continent' => __($w['continent'] ?? 'Other')])
        ->sortBy('label')->groupBy('continent')->sortKeys();
    if ($own->isNotEmpty()) {
        $groups = collect([__('My worlds') => $own])->merge($groups);
    }
    // the redirect's errors (ImportTwineRequest): read from the session, the Livewire page has its own bag
    $bag = session('errors')?->getBag('default');
    $problem = $bag?->first('story') ?: $bag?->first('world') ?: $bag?->first('age');
    $ages = \App\Livewire\Teacher\LessonChat::GRADE_CHIP_AGES;
    $failed = (bool) $problem;
@endphp

{{-- Twine (a story with links) as a lesson: one empty 3D scene per passage, every link a choice that jumps to its scene. --}}
<details class="group mt-4 rounded-2xl border border-base-content/10 bg-base-200/70" @if ($failed) open @endif data-twine-import>
    <summary class="flex h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium text-base-content [&::-webkit-details-marker]:hidden">
        <x-icons.chevron-right class="size-4 shrink-0 transition-transform group-open:rotate-90" />
        {{ __('Import from Twine') }}
    </summary>
    <form method="POST" action="{{ route('teacher.lessons.import-twine') }}" enctype="multipart/form-data"
          class="grid gap-3 px-4 pb-4 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
          x-data="{ busy: false }" x-on:submit="busy = true">
        @csrf
        <label class="form-control">
            <span class="mb-1 text-xs text-base-content/70">{{ __('Twine story (.html)') }}</span>
            <input type="file" name="story" accept=".html,.htm,text/html" required class="file-input file-input-sm file-input-bordered w-full" />
        </label>
        <label class="form-control">
            <span class="mb-1 text-xs text-base-content/70">{{ __('World for the 3D scenes') }}</span>
            <select name="world" required class="select select-sm select-bordered w-full">
                @foreach ($groups as $continent => $worlds)
                    <optgroup label="{{ $continent }}">
                        @foreach ($worlds as $w)
                            <option value="{{ $w['key'] }}" @selected(old('world') === $w['key'])>{{ $w['label'] }}</option>
                        @endforeach
                    </optgroup>
                @endforeach
            </select>
        </label>
        {{-- The class's age: the story's words and the lesson's prompts are written for it, never a default. --}}
        <label class="form-control">
            <span class="mb-1 text-xs text-base-content/70">{{ __('Age of your class') }}</span>
            <select name="age" required class="select select-sm select-bordered w-full">
                <option value="" disabled @selected(old('age') === null)>{{ __('Pick') }}</option>
                @foreach ($ages as $age)
                    <option value="{{ $age }}" @selected((int) old('age') === $age)>{{ __('Ages :ages', ['ages' => $age.'–'.min($age + 2, 18)]) }}</option>
                @endforeach
            </select>
        </label>
        <button type="submit" class="btn btn-primary btn-sm" x-bind:disabled="busy">
            <span x-show="!busy">{{ __('Import') }}</span>
            <span x-show="busy" x-cloak class="loading loading-dots loading-sm"></span>
        </button>
        @if ($failed)
            <p class="text-sm text-error sm:col-span-4" role="alert">{{ $problem }}</p>
        @endif
    </form>
</details>
