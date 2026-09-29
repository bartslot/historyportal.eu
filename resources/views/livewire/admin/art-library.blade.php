{{-- The shared art library, read as a ledger: one dense row per asset, every picture on a paper
     tile so ink and transparency read the way they will on a scene. The grid view is the same
     rows as a contact sheet, because line art is judged by eye. --}}
<div class="mx-auto max-w-7xl space-y-4 p-4 sm:p-6"
     x-data="{
        view: 'table',
        init() {
            try { this.view = localStorage.getItem('lp.art-library.view') === 'grid' ? 'grid' : 'table' } catch (e) {}
        },
        setView(v) {
            this.view = v
            try { localStorage.setItem('lp.art-library.view', v) } catch (e) {}
        },
        toast(message, type) {
            window.dispatchEvent(new CustomEvent('toast', { detail: { message, type } }))
        },
        copy(text) {
            const write = navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()
            write.then(() => this.toast(@js(__('Copied')), 'success'), () => this.toast(@js(__('Copy failed')), 'error'))
        },
        open(id) {
            $wire.preview(id).then(() => this.$refs.preview.showModal())
        },
     }">

    @php
        $assets = $this->assets();
        $reuse = $this->reuse();
        $collections = $this->collections();
    @endphp

    <div class="flex items-end justify-between gap-3">
        <h1 class="font-history text-2xl font-semibold md:text-3xl">{{ __('Art library') }}</h1>

        <div class="join" role="group" aria-label="{{ __('View') }}">
            <button type="button" class="btn btn-sm join-item" :class="view === 'table' && 'btn-active'"
                    x-on:click="setView('table')" aria-label="{{ __('Table') }}" data-tooltip="{{ __('Table') }}">
                <x-icons.table-cells class="size-5" />
            </button>
            <button type="button" class="btn btn-sm join-item" :class="view === 'grid' && 'btn-active'"
                    x-on:click="setView('grid')" aria-label="{{ __('Grid') }}" data-tooltip="{{ __('Grid') }}">
                <x-icons.squares-2x2 class="size-5" />
            </button>
        </div>
    </div>

    @if ($collections)
        <div role="tablist" class="tabs tabs-border overflow-x-auto flex-nowrap">
            @foreach ($collections as $name => $count)
                <button type="button" role="tab" wire:key="tab-{{ $name }}"
                        wire:click="selectCollection(@js($name))"
                        aria-selected="{{ $collection === $name ? 'true' : 'false' }}"
                        class="tab shrink-0 gap-2 {{ $collection === $name ? 'tab-active' : '' }}">
                    {{ $this->label($name) }}
                    <span class="badge badge-sm {{ $collection === $name ? 'badge-primary' : 'badge-ghost' }} tabular-nums">{{ $count }}</span>
                </button>
            @endforeach
        </div>

        <div class="flex flex-wrap items-center gap-2">
            <select wire:model.live="category" class="select select-sm w-full sm:w-44" aria-label="{{ __('Category') }}">
                <option value="">{{ __('All categories') }}</option>
                @foreach ($this->categories() as $option)
                    <option value="{{ $option }}">{{ $this->label($option) }}</option>
                @endforeach
            </select>

            <select wire:model.live="subcategory" class="select select-sm w-full sm:w-44" aria-label="{{ __('Subcategory') }}"
                    @disabled($this->subcategories() === [])>
                <option value="">{{ __('All subcategories') }}</option>
                @foreach ($this->subcategories() as $option)
                    <option value="{{ $option }}">{{ $this->label($option) }}</option>
                @endforeach
            </select>

            <label class="input input-sm w-full sm:w-64">
                <x-icons.magnifying-glass class="size-4 opacity-50" />
                <input type="search" wire:model.live.debounce.300ms="search" placeholder="{{ __('Search') }}" aria-label="{{ __('Search') }}" />
            </label>

            @if ($assets->total() > 0)
                <span class="ml-auto text-xs tabular-nums opacity-60">
                    {{ __(':first-:last of :total', ['first' => $assets->firstItem(), 'last' => $assets->lastItem(), 'total' => $assets->total()]) }}
                </span>
            @endif
        </div>
    @endif

    @if ($assets->isEmpty())
        <div class="flex flex-col items-center gap-2 rounded-box border border-dashed border-base-300 py-16 text-center opacity-70">
            <x-icons.photo class="size-8 opacity-60" />
            <p class="text-sm">{{ $collections && (trim($search) !== '' || $category !== '') ? __('Nothing matches.') : __('No art in this set yet.') }}</p>
        </div>
    @else
        {{-- Table view --}}
        <div x-show="view === 'table'" class="overflow-x-auto rounded-box border border-base-300">
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th class="w-20"><span class="sr-only">{{ __('Preview') }}</span></th>
                        <th>{{ __('Asset') }}</th>
                        <th class="hidden sm:table-cell">{{ __('Category') }}</th>
                        <th class="hidden text-right lg:table-cell">{{ __('Size') }}</th>
                        <th class="hidden md:table-cell">{{ __('Kind') }}</th>
                        <th class="text-right">{{ __('Lessons') }}</th>
                        <th class="hidden text-right sm:table-cell">{{ __('Scenes') }}</th>
                        <th class="hidden xl:table-cell">{{ __('Credit') }}</th>
                        <th class="hidden w-20 sm:table-cell"><span class="sr-only">{{ __('Actions') }}</span></th>
                    </tr>
                </thead>
                <tbody>
                    @foreach ($assets as $asset)
                        @php $used = $reuse[$asset->id] ?? ['lessons' => 0, 'scenes' => 0]; @endphp
                        <tr wire:key="row-{{ $asset->id }}" class="hover:bg-base-200">
                            <td>
                                <button type="button" x-on:click="open({{ $asset->id }})" aria-label="{{ __('Preview') }}"
                                        class="lp-paper flex size-16 items-center justify-center rounded-md p-1 ring-1 ring-base-300">
                                    <img src="{{ $asset->url() }}" alt="" loading="lazy" class="max-h-full max-w-full object-contain" />
                                </button>
                            </td>
                            <td class="max-w-[40vw] sm:max-w-64">
                                <div class="truncate font-medium">{{ $asset->title }}</div>
                                <div class="truncate font-mono text-xs opacity-50">{{ basename($asset->source_ref) }}</div>
                            </td>
                            <td class="hidden sm:table-cell">
                                <div class="flex flex-wrap gap-1">
                                    @if ($asset->category)
                                        <span class="badge badge-sm badge-soft">{{ $this->label($asset->category) }}</span>
                                    @endif
                                    @if ($asset->subcategory)
                                        <span class="badge badge-sm badge-ghost">{{ $this->label($asset->subcategory) }}</span>
                                    @endif
                                </div>
                            </td>
                            <td class="hidden text-right font-mono text-xs tabular-nums opacity-70 lg:table-cell">
                                @if ($asset->width && $asset->height){{ $asset->width }}&times;{{ $asset->height }}@endif
                            </td>
                            <td class="hidden md:table-cell">
                                <span class="badge badge-sm badge-outline">{{ $asset->isRaster() ? __('Raster') : __('Vector') }}</span>
                            </td>
                            <td class="text-right tabular-nums {{ $used['lessons'] ? 'font-semibold' : 'opacity-40' }}">{{ $used['lessons'] }}</td>
                            <td class="hidden text-right tabular-nums sm:table-cell {{ $used['scenes'] ? '' : 'opacity-40' }}">{{ $used['scenes'] }}</td>
                            <td class="hidden max-w-56 truncate text-xs opacity-70 xl:table-cell">{{ $this->creditFor($asset) }}</td>
                            {{-- On a phone the thumbnail opens the preview, which carries Copy path too. --}}
                            <td class="hidden sm:table-cell">
                                <div class="flex justify-end gap-0.5">
                                    <button type="button" class="btn btn-ghost btn-square btn-xs" x-on:click="open({{ $asset->id }})"
                                            aria-label="{{ __('Preview') }}" data-tooltip="{{ __('Preview') }}">
                                        <x-icons.eye class="size-4" />
                                    </button>
                                    <button type="button" class="btn btn-ghost btn-square btn-xs" x-on:click="copy(@js($asset->source_ref))"
                                            aria-label="{{ __('Copy path') }}" data-tooltip="{{ __('Copy path') }}">
                                        <x-icons.document-duplicate class="size-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
            </table>
        </div>

        {{-- Grid view: a contact sheet --}}
        <div x-show="view === 'grid'" x-cloak class="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
            @foreach ($assets as $asset)
                @php $used = $reuse[$asset->id] ?? ['lessons' => 0, 'scenes' => 0]; @endphp
                <figure wire:key="tile-{{ $asset->id }}" class="group min-w-0">
                    <button type="button" x-on:click="open({{ $asset->id }})" aria-label="{{ $asset->title }}"
                            class="lp-paper flex aspect-square w-full items-center justify-center rounded-box p-3 ring-1 ring-base-300 transition group-hover:ring-primary">
                        <img src="{{ $asset->url() }}" alt="" loading="lazy" class="max-h-full max-w-full object-contain" />
                    </button>
                    <figcaption class="mt-1.5 flex items-start justify-between gap-2 px-0.5">
                        <div class="min-w-0">
                            <div class="truncate text-sm font-medium">{{ $asset->title }}</div>
                            <div class="truncate font-mono text-2xs opacity-50">{{ basename($asset->source_ref) }}</div>
                        </div>
                        <span class="badge badge-sm shrink-0 tabular-nums {{ $used['lessons'] ? 'badge-primary' : 'badge-ghost opacity-60' }}"
                              data-tooltip="{{ __('Lessons') }}">{{ $used['lessons'] }}</span>
                    </figcaption>
                </figure>
            @endforeach
        </div>

        @if ($assets->lastPage() > 1)
            @php
                $current = $assets->currentPage();
                $last = $assets->lastPage();
            @endphp
            <div class="flex justify-center">
                <div class="join">
                    <button type="button" class="btn btn-sm join-item" wire:click="previousPage" @disabled($assets->onFirstPage())
                            aria-label="{{ __('Previous page') }}">
                        <x-icons.chevron-left class="size-4" />
                    </button>
                    @foreach (range(max(1, $current - 2), min($last, $current + 2)) as $page)
                        <button type="button" wire:key="page-{{ $page }}" wire:click="gotoPage({{ $page }})"
                                class="btn btn-sm join-item tabular-nums {{ $page === $current ? 'btn-active' : '' }}">{{ $page }}</button>
                    @endforeach
                    <button type="button" class="btn btn-sm join-item" wire:click="nextPage" @disabled(! $assets->hasMorePages())
                            aria-label="{{ __('Next page') }}">
                        <x-icons.chevron-right class="size-4" />
                    </button>
                </div>
            </div>
        @endif
    @endif

    {{-- Preview. Native <dialog>: Esc and the backdrop close it, the X is the third way.
         wire:ignore.self keeps a re-render from stripping the open attribute showModal() set. --}}
    <dialog x-ref="preview" class="modal" wire:ignore.self>
        <div class="modal-box max-w-5xl p-0">
            @if ($preview = $this->previewAsset())
                @php $used = $reuse[$preview->id] ?? ['lessons' => 0, 'scenes' => 0]; @endphp
                <div class="grid md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <div class="lp-paper flex items-center justify-center p-6 md:min-h-[60vh]">
                        <img src="{{ $preview->url() }}" alt="{{ $preview->title }}" class="max-h-[60vh] max-w-full object-contain" />
                    </div>

                    <div class="space-y-4 p-5">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                                <h3 class="text-lg font-semibold">{{ $preview->title }}</h3>
                                <p class="break-all font-mono text-xs opacity-60">{{ $preview->source_ref }}</p>
                            </div>
                            <form method="dialog">
                                <button class="btn btn-ghost btn-square btn-sm" aria-label="{{ __('Close') }}">
                                    <x-icons.x-mark class="size-5" />
                                </button>
                            </form>
                        </div>

                        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                            <dt class="opacity-60">{{ __('Category') }}</dt>
                            <dd>{{ $this->categoryPath($preview) }}</dd>
                            <dt class="opacity-60">{{ __('Kind') }}</dt>
                            <dd>{{ $preview->isRaster() ? __('Raster') : __('Vector') }}</dd>
                            @if ($preview->width && $preview->height)
                                <dt class="opacity-60">{{ __('Size') }}</dt>
                                <dd class="font-mono tabular-nums">{{ $preview->width }}&times;{{ $preview->height }}</dd>
                            @endif
                            <dt class="opacity-60">{{ __('License') }}</dt>
                            <dd>{{ $preview->license }}</dd>
                            @if (($credit = $this->creditFor($preview)) !== $preview->license)
                                <dt class="opacity-60">{{ __('Credit') }}</dt>
                                <dd>{{ $credit }}</dd>
                            @endif
                            <dt class="opacity-60">{{ __('Scenes') }}</dt>
                            <dd class="tabular-nums">{{ $used['scenes'] }}</dd>
                        </dl>

                        <div>
                            <h4 class="mb-1.5 text-xs font-semibold uppercase tracking-wide opacity-60">{{ __('Used in') }}</h4>
                            @forelse ($this->previewLessons() as $lesson)
                                <a href="{{ route('teacher.lessons.wizard', $lesson) }}" wire:key="used-{{ $lesson->id }}"
                                   class="link link-hover block truncate py-0.5 text-sm">{{ $lesson->title ?: $lesson->topic }}</a>
                            @empty
                                <p class="text-sm opacity-50">{{ __('Not used yet') }}</p>
                            @endforelse
                        </div>

                        <button type="button" class="btn btn-sm" x-on:click="copy(@js($preview->source_ref))">
                            <x-icons.document-duplicate class="size-4" />
                            {{ __('Copy path') }}
                        </button>
                    </div>
                </div>
            @endif
        </div>
        <form method="dialog" class="modal-backdrop"><button>{{ __('Close') }}</button></form>
    </dialog>
</div>
