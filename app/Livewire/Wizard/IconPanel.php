<?php

declare(strict_types=1);

namespace App\Livewire\Wizard;

use App\Models\Lesson;
use App\Models\SvgAsset;
use App\Services\Assets\SequenceImporter;
use App\Support\LibraryEra;
use Illuminate\Contracts\View\View;
use InvalidArgumentException;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Locked;
use Livewire\Attributes\Session;
use Livewire\Component;
use Livewire\WithFileUploads;
use RuntimeException;

/**
 * The Icons tab of the bottom dock: the icon set that ships with the app, filed under
 * collection ▸ category ▸ subcategory and filtered by two rows of pills.
 *
 * It only ever PICKS an icon. Placing it is the scene configurator's job, reached through the
 * `svg-asset:attach` event it already listens for — so an icon becomes exactly the same layer a
 * teacher's own clipart does, with the same move / resize / reorder / delete plumbing.
 */
class IconPanel extends Component
{
    use WithFileUploads;

    /** "Import sequence": numbered frames from the art pipeline (name_clip_0001.webp or .png). */
    public array $sequenceFiles = [];

    public string $sequenceWhat = '';

    public string $sequenceCategory = 'figures';

    private const MAX_SEQUENCE_FRAMES = 240;

    /**
     * Frames → one animated library asset (SequenceImporter). Admins only: it writes into the
     * library every teacher sees. Any problem (a gap in the numbers, two assets, JEV unreachable)
     * is shown in the dialog and nothing is stored.
     */
    public function importSequence(SequenceImporter $importer): void
    {
        abort_unless(auth()->user()?->isAdmin(), 403);
        $this->validate([
            'sequenceFiles' => 'required|array|max:'.self::MAX_SEQUENCE_FRAMES,
            'sequenceFiles.*' => 'file|mimes:png,webp|max:12288',
            'sequenceWhat' => 'required|string|max:500',
            'sequenceCategory' => 'required|in:'.implode(',', SequenceImporter::CATEGORIES),
        ]);

        try {
            $asset = $importer->import(array_values($this->sequenceFiles), $this->sequenceWhat, $this->sequenceCategory);
        } catch (InvalidArgumentException|RuntimeException $e) {
            $this->addError('sequenceFiles', $e->getMessage());

            return;
        }

        $this->reset('sequenceFiles', 'sequenceWhat');
        $this->collection = 'history-line';
        $this->category = $asset->category;
        $this->subcategory = '';
        unset($this->icons, $this->groups, $this->eras);
        $this->dispatch('sequence-imported');
        $this->dispatch('toast', message: __(':name is in the library, :m m tall.', ['name' => $asset->title, 'm' => $asset->height_m]), type: 'success');
    }

    // The dock is rebuilt whenever the teacher picks another scene, so the filters are kept in
    // the session — otherwise every scene change would throw them back to the first set.

    /** Top row: which set of icons (line-art | arrows | shapes). */
    #[Session(key: 'icons.collection')]
    public string $collection = 'line-art';

    /** Second row: a whole category, or one subcategory inside it. Empty = the whole collection. */
    #[Session(key: 'icons.category')]
    public string $category = '';

    #[Session(key: 'icons.subcategory')]
    public string $subcategory = '';

    /** The lesson being edited: its period is the era the history-line library opens on. */
    #[Locked]
    public ?int $lessonId = null;

    /** History-line era chip: a period key, or '' for every era. Remembered per lesson. */
    public string $era = '';

    /** The collection whose pictures carry an era (svg_assets.era). */
    private const ERA_COLLECTION = 'history-line';

    public function mount(?int $lessonId = null): void
    {
        $this->lessonId = $lessonId;
        $lesson = $lessonId ? Lesson::find($lessonId) : null;
        $this->era = (string) session($this->eraKey(), $lesson ? (LibraryEra::forLesson($lesson) ?? '') : '');
    }

    /** "Alle tijden" is '' — the teacher's pick sticks for this lesson across scene changes. */
    public function selectEra(string $era): void
    {
        $this->era = $era === '' || LibraryEra::isKnown($era) ? $era : '';
        session([$this->eraKey() => $this->era]);
    }

    private function eraKey(): string
    {
        return 'icons.era.'.($this->lessonId ?? 0);
    }

    /**
     * The era chips: every era the library has pictures for, in historical order. Only the
     * history-line collection has eras; other sets show no chip row.
     *
     * @return list<array{era: string, label: string}>
     */
    #[Computed]
    public function eras(): array
    {
        if ($this->collection !== self::ERA_COLLECTION) {
            return [];
        }

        return SvgAsset::query()->bundled()->where('collection', $this->collection)->whereNotNull('era')
            ->distinct()->pluck('era')
            ->sortBy(fn (string $era) => LibraryEra::order($era))
            ->map(fn (string $era) => ['era' => $era, 'label' => LibraryEra::label($era)])
            ->values()->all();
    }

    /** The era the grid filters on: the chip, when the library has pictures for it. */
    public function activeEra(): string
    {
        return in_array($this->era, array_column($this->eras(), 'era'), true) ? $this->era : '';
    }

    /** Icons shown at once. The grid scrolls; the dock is only a few rows tall. */
    private const PAGE = 120;

    /**
     * Reading order of the top row: the subject icons first, then the two sets that annotate
     * them. Alphabetical would open the panel on Arrows, which is not what anyone came for.
     * A collection missing from this list still shows, after the ones that are in it.
     */
    private const ORDER = ['line-art', 'arrows', 'shapes'];

    /**
     * Collections whose second row is ONE row of main categories, in this order and under these
     * names (Bart, 2026-09-29). Their sub-folders (florence, dante …) repeat across categories and
     * read as duplicates. Folder names stay as they are: stored paths and CDN URLs depend on them.
     */
    private const MAIN_CATEGORIES = [
        'history-line' => ['figures' => 'Characters', 'nature' => 'Nature', 'architecture' => 'Architecture', 'props' => 'Misc', 'backdrops' => 'Backdrops'],
    ];

    public function selectCollection(string $collection): void
    {
        if (! in_array($collection, $this->collections(), true)) {
            return;
        }

        $this->collection = $collection;
        $this->category = '';
        $this->subcategory = '';
    }

    /** A pill in the second row: a category (whole group) or one of its subcategories. */
    public function selectGroup(string $category, string $subcategory = ''): void
    {
        $this->category = $category;
        $this->subcategory = $subcategory;
    }

    /**
     * Place an icon on the selected scene, mid-stage. Dragging one onto the canvas takes the
     * same route from the browser, with the drop point attached.
     *
     * Same event the teacher's own SVG library dispatches, so an icon becomes exactly the same
     * kind of layer — nothing here knows how a layer is stored.
     */
    public function place(int $assetId): void
    {
        $this->dispatch('svg-asset:attach', assetId: $assetId);
    }

    /** @return list<string> */
    #[Computed]
    public function collections(): array
    {
        return SvgAsset::query()
            ->bundled()
            ->whereNotNull('collection')
            ->distinct()
            ->pluck('collection')
            ->sortBy($this->collectionRank(...))
            ->values()
            ->all();
    }

    /** Sortable rank: the listed collections in their listed order, then anything else A-Z. */
    private function collectionRank(string $collection): string
    {
        $i = array_search($collection, self::ORDER, true);

        return sprintf('%02d-%s', $i === false ? 99 : $i, $collection);
    }

    /**
     * The second pill row, flattened: each category followed by its own subcategories, so a
     * teacher can take a whole period or narrow to one people in a single row.
     *
     * @return list<array{category: string, subcategory: string, label: string}>
     */
    #[Computed]
    public function groups(): array
    {
        if ($main = self::MAIN_CATEGORIES[$this->collection] ?? null) {
            $present = SvgAsset::query()->bundled()->where('collection', $this->collection)->distinct()->pluck('category')->all();

            return collect($main)
                ->filter(fn (string $label, string $category) => in_array($category, $present, true))
                ->map(fn (string $label, string $category) => ['category' => $category, 'subcategory' => '', 'label' => __($label)])
                ->values()->all();
        }

        $rows = SvgAsset::query()
            ->bundled()
            ->where('collection', $this->collection)
            ->whereNotNull('category')
            ->distinct()
            ->orderBy('category')
            ->orderBy('subcategory')
            ->get(['category', 'subcategory']);

        $pills = [];
        foreach ($rows as $row) {
            $category = (string) $row->category;
            if (! isset($pills[$category])) {
                $pills[$category] = ['category' => $category, 'subcategory' => '', 'label' => $category];
            }
            if ($row->subcategory) {
                $pills[$category.'/'.$row->subcategory] = [
                    'category' => $category,
                    'subcategory' => (string) $row->subcategory,
                    'label' => (string) $row->subcategory,
                ];
            }
        }

        return array_values($pills);
    }

    /** @return \Illuminate\Support\Collection<int, SvgAsset> */
    #[Computed]
    public function icons(): \Illuminate\Support\Collection
    {
        return SvgAsset::query()
            ->bundled()
            ->where('collection', $this->collection)
            ->when($this->category !== '', fn ($q) => $q->where('category', $this->category))
            ->when($this->subcategory !== '', fn ($q) => $q->where('subcategory', $this->subcategory))
            // An era AND the category; a timeless picture (no era) fits every era.
            ->when($this->activeEra() !== '', fn ($q) => $q->where(fn ($q) => $q->where('era', $this->activeEra())->orWhereNull('era')))
            ->orderBy('title')
            ->limit(self::PAGE)
            ->get();
    }

    public function render(): View
    {
        // The remembered (or default) collection may not exist here: show the first one that does,
        // instead of an empty set under a pill for another collection.
        $available = $this->collections();
        if ($available !== [] && ! in_array($this->collection, $available, true)) {
            $this->collection = $available[0];
            $this->category = $this->subcategory = '';
            unset($this->icons, $this->groups, $this->eras);
        }

        return view('livewire.wizard.icon-panel');
    }
}
