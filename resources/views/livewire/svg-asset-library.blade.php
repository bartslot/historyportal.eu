{{-- imageGrid (resources/js/ui/image-grid.js): one size slider for both grids of artwork here.
     The tiles are cards with a title and a button, so the grid has a floor (data-cards). --}}
<div class="space-y-6" x-data="imageGrid({ id: 'svg-library', kind: 'icon', initial: 128 })">

    {{-- Search Wikimedia Commons --}}
    <div class="card bg-base-200 border border-base-300">
        <div class="card-body gap-4">
            <form wire:submit="search" class="join w-full">
                <input type="search" wire:model="query" placeholder="Roman soldier, tall ship, castle…"
                       class="input input-bordered join-item w-full" aria-label="Search public-domain SVGs">
                <button class="btn btn-primary join-item" type="submit">
                    <span wire:loading wire:target="search" class="loading loading-spinner loading-sm"></span>
                    Search
                </button>
            </form>

            @if ($notice)
                <div class="alert alert-info py-2 text-sm">{{ $notice }}</div>
            @endif

            @error('query') <p class="text-error text-sm">{{ $message }}</p> @enderror

            @if ($searched && count($results) === 0)
                <p class="text-sm opacity-60 italic">No freely-licensed SVGs found for that search. Try a simpler term,
                    or paste a freesvg.org link below.</p>
            @endif

            @if (count($results))
                <div class="lp-thumb-grid gap-3" data-cards :style="gridStyle">
                    @foreach ($results as $i => $r)
                        <div class="group relative rounded-lg border border-base-300 bg-base-100 p-2">
                            <div class="flex aspect-square items-center justify-center overflow-hidden rounded bg-base-200">
                                @if (! empty($r['thumb_url']))
                                    <img src="{{ $r['thumb_url'] }}" alt="{{ $r['title'] }}" class="max-h-full max-w-full">
                                @else
                                    <span class="text-xs opacity-30">SVG</span>
                                @endif
                            </div>
                            <p class="mt-2 truncate text-xs font-medium" title="{{ $r['title'] }}">{{ $r['title'] }}</p>
                            <span class="badge badge-ghost badge-xs mt-1">{{ $r['license'] }}</span>
                            <button wire:click="import({{ $i }})" wire:loading.attr="disabled"
                                    class="btn btn-xs btn-primary mt-2 w-full">
                                <span wire:loading.remove wire:target="import({{ $i }})">Add to library</span>
                                <span wire:loading wire:target="import({{ $i }})" class="loading loading-spinner loading-xs"></span>
                            </button>
                        </div>
                    @endforeach
                </div>
            @endif

            {{-- Paste-a-link fallback (freesvg.org, Wikimedia) --}}
            <div class="divider text-xs opacity-50">or paste a link</div>
            <form wire:submit="importUrl" class="join w-full">
                <input type="url" wire:model="urlInput" placeholder="https://freesvg.org/…"
                       class="input input-bordered input-sm join-item w-full" aria-label="Import SVG from URL">
                <button class="btn btn-sm join-item" type="submit">Import</button>
            </form>
            @error('urlInput') <p class="text-error text-sm">{{ $message }}</p> @enderror
        </div>
    </div>

    {{-- Personal library --}}
    <div>
        <div class="mb-3 flex items-center gap-2">
            <h3 class="mr-auto text-sm font-semibold uppercase tracking-wide opacity-60">Your imported artwork</h3>
            <x-ui.thumb-size />
        </div>
        @if ($this->library->isEmpty())
            <p class="text-sm opacity-50 italic">Nothing yet. Search above to build your ink-art library.</p>
        @else
            <div class="lp-thumb-grid gap-3" data-cards :style="gridStyle">
                @foreach ($this->library as $asset)
                    {{-- The remove ✕ is a SIBLING of the add button, not nested inside it: a <button>
                         inside a <button> is invalid HTML (browsers auto-close the outer one) and the
                         ✕ click would bubble into attach(). Both sit inside the relative wrapper. --}}
                    <div class="group relative rounded-lg border border-base-300 bg-base-100 p-2 flex flex-col">
                        <button wire:click="attach({{ $asset->id }})" class="text-left" aria-label="Add {{ $asset->title }} to Scene">
                            <div class="flex aspect-square items-center justify-center overflow-hidden rounded bg-base-200">
                                <img src="{{ $asset->url() }}" alt="{{ $asset->title }}" class="max-h-full max-w-full">
                            </div>
                            <p class="mt-2 truncate text-xs font-medium" title="{{ $asset->title }}">{{ $asset->title }}</p>
                            <p class="truncate text-prose opacity-50" title="{{ $asset->credit() }}">{{ $asset->credit() }}</p>
                        </button>
                        <button wire:click="remove({{ $asset->id }})"
                                wire:confirm="Remove this artwork from your library?"
                                class="btn btn-ghost btn-xs btn-circle absolute right-1 top-1 text-error opacity-0 transition group-hover:opacity-100"
                                aria-label="Remove {{ $asset->title }}">✕</button>
                    </div>
                @endforeach
            </div>
        @endif
    </div>
</div>
