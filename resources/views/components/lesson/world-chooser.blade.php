@props(['none' => 'remove', 'removable' => false])

@php
    // A world for a 3D scene in three steps (Bart 11-14): the continent, then the region, then the world itself.
    // The teacher's own worlds are one more "continent" at the top. Ready-made ones: config/worlds.php continent + region.
    $own = auth()->check()
        ? \App\Models\StageWorld::where('user_id', auth()->id())->latest()->get()
            ->map(fn ($w) => ['key' => $w->key(), 'label' => $w->name, 'bundle' => $w->bundle, 'thumb' => $w->preset()['thumb'], 'mine' => true])
        : collect();
    $ready = collect(config('worlds', []))
        ->map(fn ($w, $key) => ['key' => $key, 'label' => __($w['label']), 'bundle' => $w['bundle'], 'thumb' => asset($w['thumb']), 'mine' => false,
            'continent' => __($w['continent'] ?? 'Other'), 'region' => __($w['region'] ?? 'Other')])
        ->sortBy('label');
    $tree = $ready->groupBy('continent')->sortKeys()->map(fn ($c) => $c->groupBy('region')->sortKeys()->map->values());
    if ($own->isNotEmpty()) {
        $tree = collect([__('My worlds') => collect([__('My worlds') => $own->values()])])->merge($tree);
    }
@endphp

{{-- The key changes with the list, so a saved or removed world re-renders the chooser (x-data is read once).
     none: 'remove' takes the world off the scene (the World panel); 'build' leaves the scene empty to build by hand
     (a new 3D scene). Every world opens on its own region when the scene already has it. --}}
<div wire:key="world-chooser-{{ md5(json_encode($tree)) }}" x-data="worldChooser(@js($tree), @js($none))" x-on:stage25d-synced.window="sync()" data-world-chooser {{ $attributes }}>
    <div class="flex min-h-8 items-center gap-1 text-xs font-semibold uppercase tracking-wide text-panel-label">
        <button type="button" class="hover:text-base-content" x-on:click="continent = null; region = null" :class="continent ? '' : 'text-base-content'" data-world-crumb="all">{{ __('World') }}</button>
        <template x-if="continent">
            <span class="flex items-center gap-1"><x-icons.chevron-right class="size-3" />
                <button type="button" class="hover:text-base-content" x-on:click="region = null" :class="region ? '' : 'text-base-content'" x-text="continent" data-world-crumb="continent"></button></span>
        </template>
        <template x-if="region && region !== continent">
            <span class="flex items-center gap-1"><x-icons.chevron-right class="size-3" /><span class="text-base-content" x-text="region"></span></span>
        </template>
    </div>

    {{-- Step 1 and 2: a list. A continent with one region opens straight on its worlds. --}}
    <ul class="mt-1 divide-y divide-panel-hairline" x-show="!region">
        <template x-for="name in (continent ? Object.keys(tree[continent]) : Object.keys(tree))" :key="name">
            <li>
                <button type="button" class="flex h-8 w-full items-center gap-2 text-left text-sm text-base-content hover:text-panel-value"
                        x-on:click="open(name)" :data-world-node="name">
                    <span class="min-w-0 flex-1 truncate" x-text="name"></span>
                    <span class="text-xs text-panel-hint" x-text="count(name)"></span>
                    <x-icons.chevron-right class="size-4 text-panel-hint" />
                </button>
            </li>
        </template>
        <li>
            <button type="button" class="flex h-8 w-full items-center text-left text-sm text-panel-value hover:text-base-content"
                    x-on:click="pickNone()" data-world-pick="">{{ $none === 'build' ? __('None, build it yourself') : __('None') }}</button>
        </li>
    </ul>

    {{-- Step 3: the worlds of one region. --}}
    <div class="mt-2 grid grid-cols-2 gap-2" x-show="region">
        <template x-for="w in worlds()" :key="w.key">
            <div class="relative">
                <button type="button" class="relative block aspect-video w-full overflow-hidden rounded-md border bg-base-200 disabled:cursor-not-allowed disabled:opacity-40"
                        :class="current?.key === w.key ? 'border-base-content' : 'border-panel-hairline'"
                        :disabled="blocked(w)" :title="blocked(w) ? @js(__('Another period: only on a scene without layers')) : ''"
                        :data-world-pick="w.key" :aria-label="w.label" x-on:click="pick(w.key)">
                    <img x-show="w.thumb" :src="w.thumb" alt="" class="size-full object-cover" loading="lazy" />
                    <span class="absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] truncate rounded-xs bg-base-100/70 px-1 text-xs font-semibold leading-4 text-base-content" x-text="w.label"></span>
                </button>
                @if ($removable)
                    <button type="button" x-show="w.mine" class="absolute right-0 top-0 grid size-8 place-items-center rounded-md bg-base-100/70 text-panel-value hover:text-base-content"
                            :data-world-remove="w.key" aria-label="{{ __('Remove world') }}" data-tooltip="{{ __('Remove world') }}"
                            x-on:click="$wire.removeStage25dWorld(w.key)">
                        <x-icons.x-mark class="h-4 w-4" />
                    </button>
                @endif
            </div>
        </template>
    </div>
</div>
