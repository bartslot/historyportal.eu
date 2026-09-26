<?php

declare(strict_types=1);

namespace App\Livewire\Admin;

use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Contracts\View\View;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Locked;
use Livewire\Attributes\Url;
use Livewire\Component;
use Livewire\WithPagination;

/**
 * The shared art library as a table: every asset that ships with the app (bundled, no owner),
 * with how often lessons reuse it and where its picture came from. Read-only on purpose; the
 * library itself is edited by dropping files in resources/icons and running icons:import.
 */
class ArtLibrary extends Component
{
    use WithPagination;

    private const PER_PAGE = 48;

    /** Tab order: the house style first, then the older sets. Anything unlisted follows A-Z. */
    private const ORDER = ['history-line', 'line-art', 'arrows', 'shapes'];

    /** Locked: only the tab method changes it, and it is checked on every use. */
    #[Locked]
    #[Url]
    public string $collection = '';

    #[Url]
    public string $category = '';

    #[Url(as: 'sub')]
    public string $subcategory = '';

    #[Url(as: 'q')]
    public string $search = '';

    public ?int $previewId = null;

    public function mount(): void
    {
        $this->collection = $this->knownCollection($this->collection);
    }

    public function selectCollection(string $collection): void
    {
        $this->collection = $this->knownCollection($collection);
        $this->category = '';
        $this->subcategory = '';
        $this->resetPage();
    }

    public function updatedCategory(): void
    {
        $this->subcategory = '';
        $this->resetPage();
    }

    public function updatedSubcategory(): void
    {
        $this->resetPage();
    }

    public function updatedSearch(): void
    {
        $this->resetPage();
    }

    public function preview(int $assetId): void
    {
        $this->previewId = $this->library()->whereKey($assetId)->exists() ? $assetId : null;
    }

    /**
     * The collection name, or the first bundled one when it is not a real collection. The name
     * ends up in a file path (credits.json), so nothing else may ever get through.
     */
    private function knownCollection(string $collection): string
    {
        return array_key_exists($collection, $this->collections())
            ? $collection
            : (string) array_key_first($this->collections());
    }

    /** Folder name as a reader sees it: "history-line" -> "History line". */
    public function label(?string $name): string
    {
        return ucfirst(str_replace('-', ' ', (string) $name));
    }

    public function categoryPath(SvgAsset $asset): string
    {
        return collect([$asset->category, $asset->subcategory])->filter()->map($this->label(...))->implode(' / ');
    }

    /** @return Builder<SvgAsset> */
    private function library(): Builder
    {
        return SvgAsset::query()->bundled()->where('source', 'bundled');
    }

    /** @return array<string, int> collection => asset count, in tab order */
    #[Computed]
    public function collections(): array
    {
        return $this->library()
            ->whereNotNull('collection')
            ->selectRaw('collection, count(*) as n')
            ->groupBy('collection')
            ->pluck('n', 'collection')
            ->map(fn ($n): int => (int) $n)
            ->sortBy(fn ($n, string $name): string => $this->rank($name), SORT_STRING)
            ->all();
    }

    private function rank(string $collection): string
    {
        $i = array_search($collection, self::ORDER, true);

        return sprintf('%02d-%s', $i === false ? 99 : $i, $collection);
    }

    /** @return list<string> */
    #[Computed]
    public function categories(): array
    {
        return $this->library()->where('collection', $this->collection)
            ->whereNotNull('category')->distinct()->orderBy('category')->pluck('category')->all();
    }

    /** @return list<string> */
    #[Computed]
    public function subcategories(): array
    {
        if ($this->category === '') {
            return [];
        }

        return $this->library()->where('collection', $this->collection)->where('category', $this->category)
            ->whereNotNull('subcategory')->distinct()->orderBy('subcategory')->pluck('subcategory')->all();
    }

    #[Computed]
    public function assets(): LengthAwarePaginator
    {
        $term = '%'.mb_strtolower(trim($this->search)).'%';

        return $this->library()
            ->where('collection', $this->collection)
            ->when($this->category !== '', fn (Builder $q) => $q->where('category', $this->category))
            ->when($this->subcategory !== '', fn (Builder $q) => $q->where('subcategory', $this->subcategory))
            ->when(trim($this->search) !== '', fn (Builder $q) => $q->where(fn (Builder $w) => $w
                ->whereRaw('LOWER(title) LIKE ?', [$term])
                ->orWhereRaw('LOWER(source_ref) LIKE ?', [$term])))
            ->orderBy('category')->orderBy('subcategory')->orderBy('title')
            ->paginate(self::PER_PAGE);
    }

    /**
     * How many scenes and lessons place each visible asset as a layer. ONE scan over the scenes
     * that have shots, for every id on the page at once.
     *
     * ponytail: reads every scene with shots in PHP (portable across Postgres here and MySQL on
     * SiteGround). Move to a jsonb path query or a scene_layers table when scenes reach ~100k.
     *
     * @return array<int, array{lessons: int, scenes: int, lesson_ids: list<int>}>
     */
    #[Computed]
    public function reuse(): array
    {
        $wanted = $this->assets()->getCollection()->pluck('id')->push($this->previewId)->filter()->flip();

        $scenes = [];
        Scene::query()
            ->whereNotNull('shots')
            ->whereIn('lesson_id', Lesson::query()->select('id'))
            ->select(['id', 'lesson_id', 'shots'])
            ->lazyById(500)
            ->each(function (Scene $scene) use ($wanted, &$scenes): void {
                foreach ($this->assetIdsIn($scene->shots ?? []) as $assetId) {
                    if ($wanted->has($assetId)) {
                        $scenes[$assetId][$scene->id] = (int) $scene->lesson_id;
                    }
                }
            });

        return collect($scenes)->map(fn (array $byScene): array => [
            'lessons' => count(array_unique($byScene)),
            'scenes' => count($byScene),
            'lesson_ids' => array_values(array_unique($byScene)),
        ])->all();
    }

    /** @return list<int> */
    private function assetIdsIn(array $shots): array
    {
        return collect($shots)
            ->flatMap(fn ($shot) => is_array($shot) ? ($shot['layers'] ?? []) : [])
            ->map(fn ($layer) => is_array($layer) ? (int) ($layer['asset_id'] ?? 0) : 0)
            ->filter()->unique()->values()->all();
    }

    /**
     * Credits the art:make pack recorded per backdrop (resources/icons/<collection>/credits.json,
     * slug => [{source, credit, license}]). Missing or broken file = no credits, the licence shows.
     *
     * @return array<string, string>
     */
    #[Computed]
    public function credits(): array
    {
        if ($this->knownCollection($this->collection) !== $this->collection) {
            return [];
        }

        $file = resource_path("icons/{$this->collection}/credits.json");
        $json = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;

        if (! is_array($json)) {
            return [];
        }

        return collect($json)
            ->filter(fn ($entries) => is_array($entries))
            ->map(fn (array $entries): string => collect($entries)
                ->filter(fn ($e) => is_array($e))
                ->map(fn (array $e): string => collect([$e['credit'] ?? null, $e['license'] ?? null])->filter()->implode(', '))
                ->filter()->implode('; '))
            ->filter()
            ->all();
    }

    public function creditFor(SvgAsset $asset): string
    {
        $slug = pathinfo($asset->source_ref, PATHINFO_FILENAME);

        return $this->credits()[$slug]
            ?? collect([$asset->attribution, $asset->license])->filter()->implode(', ');
    }

    #[Computed]
    public function previewAsset(): ?SvgAsset
    {
        return $this->previewId ? $this->library()->find($this->previewId) : null;
    }

    /** @return Collection<int, Lesson> */
    #[Computed]
    public function previewLessons(): Collection
    {
        $ids = $this->previewId ? ($this->reuse()[$this->previewId]['lesson_ids'] ?? []) : [];

        return $ids ? Lesson::query()->whereKey($ids)->orderBy('id')->get() : collect();
    }

    public function render(): View
    {
        return view('livewire.admin.art-library')
            ->layout('components.layouts.app', ['title' => __('Art library')]);
    }
}
