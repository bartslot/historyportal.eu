<?php

declare(strict_types=1);

namespace App\Services\Lessons;

use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Services\SceneLayers;
use Illuminate\Support\Facades\Storage;

/**
 * The art-library side of LessonComposer: a spec's `backdrop`, `asset:` gallery images and figure
 * `layers`, resolved against the bundled SvgAsset library and copied into the lesson.
 */
class LibraryLayers
{
    public function __construct(private readonly LibraryCdn $cdn) {}

    /**
     * Resolve every library ref in the spec without writing anything. Throws what the build
     * itself would throw, so an invalid spec never gets as far as deleting the old lesson.
     *
     * @param  array<string,mixed>  $spec
     */
    public function preflight(array $spec): void
    {
        foreach (array_values((array) ($spec['scenes'] ?? [])) as $i => $s) {
            $order = $i + 1;
            if (! empty($s['backdrop'])) {
                $this->libraryAsset((string) $s['backdrop'], $this->sceneLabel($s, $order));
            }
            $this->buildLayers($s, $order);
            if (($s['type'] ?? 'story') === 'gallery') {
                foreach ((array) ($s['images'] ?? []) as $entry) {
                    if (is_string($entry) && str_starts_with($entry, 'asset:')) {
                        $this->libraryAsset(substr($entry, 6), "Spec scene #{$order} gallery");
                    }
                }
            }
        }
    }

    /**
     * Layer keys a spec may set, beyond `asset`. The editor's per-layer settings
     * (EditsSceneArtwork::updateArtworkLayer) plus the map pin and the ambient motion keys.
     */
    public const LAYER_KEYS = [
        'kind', 'depth', 'scale', 'height', 'x', 'y', 'opacity', 'blend', 'white_key', 'rotation',
        'blur', 'wobble', 'sway', 'grayscale', 'tint', 'tint_opacity', 'z',
        'anim', 'anim_delay', 'anim_duration', 'anim_ease',
        'anim_out', 'anim_out_delay', 'anim_out_ease', 'anim_out_duration',
        'ambient', 'ambient_speed', 'ambient_amount',
        'ink_preset', 'ink_fill', 'draw_time',
        'anchor', 'lng', 'lat',
    ];

    /**
     * A bundled library asset, by its source_ref without the extension
     * ('history-line/figures/dante/dante-giovane'). A miss throws: a typo in a spec must fail the
     * compose, never quietly drop a figure from the scene.
     */
    private function libraryAsset(string $ref, string $where): SvgAsset
    {
        $ref = trim($ref, '/ ');
        $asset = SvgAsset::query()
            ->bundled()
            ->where('source', 'bundled')
            ->where(fn ($q) => $q->where('source_ref', $ref)
                ->orWhere('source_ref', 'like', str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $ref).'.%'))
            ->get()
            // LIKE 'a/b.%' also matches 'a/b.old/x.png' — only a bare extension counts.
            ->first(fn (SvgAsset $a) => $a->source_ref === $ref || ! str_contains(substr($a->source_ref, strlen($ref) + 1), '/'));

        if (! $asset || (! $asset->cdn_url && ! Storage::disk('public')->exists($asset->svg_path))) {
            throw new \InvalidArgumentException("{$where}: no library asset '{$ref}'. Is it in resources/icons, and has `php artisan icons:import` run?");
        }

        return $asset;
    }

    /** "scene #3 'campaldino-1289'" — how an error names the scene a spec got wrong. */
    private function sceneLabel(array $s, int $order): string
    {
        $name = $s['id'] ?? $s['chapter'] ?? $s['location'] ?? null;

        return "Spec scene #{$order}".($name ? " '{$name}'" : '');
    }

    /**
     * The depth of the cover layer under composed figures. Depth 1, the same as a standing figure:
     * people stand ON the backdrop's floor, so they must move with it. At the editor's default
     * (SceneLayers::COVER_DEPTH) the floor slid under their feet and every figure looked afloat.
     * Clouds and birds keep their own lower depth and still parallax.
     */
    private const COVER_DEPTH = 1.0;

    /**
     * What a line-art backdrop sets in the scene config. Ink on white paper: the player's backdrop
     * shade would grey it, and the plate is drawn as one framed room, so it shows WHOLE (the
     * editor's "Whole image" fit), letterboxed on the same white paper.
     */
    public const LINE_ART_CONFIG = ['backdrop_shade' => false, 'background_fit' => 'contain'];

    /** The paper the line-art plates are drawn on: the letterbox around a whole plate. */
    private const LINE_ART_PAPER = '#ffffff';

    /** The history-line library: ink drawings on white paper. */
    public static function isLineArt(string $ref): bool
    {
        return str_starts_with($ref, 'history-line/');
    }

    /**
     * Background from the art library: its Cloudinary URL, uploaded on first use. Without Cloudinary
     * the file is COPIED into the scene's own folder, the same place a sourced background lands, so
     * removing an asset from the library never blanks a lesson.
     */
    public function attachLibraryBackdrop(Scene $scene, string $ref, int $order): void
    {
        $asset = $this->libraryAsset($ref, $this->sceneLabel(['location' => $scene->location, 'chapter' => $scene->chapter_name], $order));
        $path = $this->cdn->ensure($asset);
        if ($path === null) {
            $ext = pathinfo($asset->svg_path, PATHINFO_EXTENSION) ?: 'png';
            $path = "lessons/{$scene->lesson_id}/scenes/{$scene->id}/bg.{$ext}";
            Storage::disk('public')->copy($asset->svg_path, $path);
        }

        $scene->update([
            'image_path' => $path,
            // A composed line-art stage keeps its camera still: a Ken Burns push crops the room and
            // drags the floor away from the figures. The life comes from the layers' ambient motion.
            ...(self::isLineArt($ref) ? ['kb_animated' => false, 'background_color' => self::LINE_ART_PAPER] : []),
            'config' => array_merge((array) ($scene->config ?? []), [
                'image_credit' => $asset->credit(),
                'background_focus' => 'center',
                // The ref itself, so lessons:export can write `backdrop` back instead of a copy
                // under this scene's folder that no other machine has.
                'backdrop' => trim($ref, '/ '),
            ], self::isLineArt($ref) ? self::LINE_ART_CONFIG : []),
        ]);
    }

    /**
     * A gallery image from the art library: its Cloudinary URL, or without Cloudinary a copy in the
     * lesson. Root-relative for the copy, the same shape the editor stores for a picked painting
     * (Storage::url() would bake in APP_URL).
     *
     * `asset` keeps the ref, so lessons:export writes `asset:<ref>` back instead of this copy.
     *
     * @return array{url:string,credit:?string,asset:string}
     */
    public function copyLibraryImage(Lesson $lesson, string $ref, int $order): array
    {
        $asset = $this->libraryAsset($ref, "Spec scene #{$order} gallery");
        $url = $this->cdn->ensure($asset);
        if ($url === null) {
            $path = "lessons/{$lesson->id}/gallery/".basename($asset->svg_path);
            Storage::disk('public')->put($path, Storage::disk('public')->get($asset->svg_path));
            $url = '/storage/'.$path;
        }

        return ['url' => $url, 'credit' => $asset->credit(), 'asset' => trim($ref, '/ ')];
    }

    /**
     * Build shots[0] from a spec's `layers` with SceneLayers, the code the editor's attachArtwork()
     * writes through: the scene image as a cover layer first (or a layer-only shot when there is
     * none, e.g. a map), then one figure per entry, the editor's defaults under what the spec sets.
     *
     * The same asset may appear twice (two cypresses). Both layers carry the real asset_id, since
     * the editor drops a layer whose id has no SvgAsset row; the editor then selects them as one.
     *
     * @param  array<string,mixed>  $s
     */
    public function applyLayers(Scene $scene, array $s, int $order): void
    {
        $layers = $this->buildLayers($s, $order, upload: true);
        if ($layers === []) {
            return;
        }

        $scene->refresh();
        $scene->update(['shots' => [SceneLayers::shot($scene->image_path, $layers, self::COVER_DEPTH)]]);
    }

    /**
     * A spec's `layers`, validated and resolved against the library (throws on any bad entry).
     *
     * @param  array<string,mixed>  $s
     * @return list<array<string,mixed>>
     */
    private function buildLayers(array $s, int $order, bool $upload = false): array
    {
        $entries = (array) ($s['layers'] ?? []);
        $where = $this->sceneLabel($s, $order);
        $layers = [];
        foreach ($entries as $i => $entry) {
            $unknown = array_diff(array_keys((array) $entry), ['asset', 'speaks', ...self::LAYER_KEYS]);
            if ($unknown !== []) {
                throw new \InvalidArgumentException("{$where}, layer {$i}: unknown key(s) ".implode(', ', $unknown).'.');
            }
            $asset = $this->libraryAsset((string) ($entry['asset'] ?? ''), $where);
            if ($upload) {
                $this->cdn->ensure($asset);   // preflight only resolves; the real build uploads
            }
            $layers[] = SceneLayers::figure($asset, array_diff_key((array) $entry, ['asset' => true, 'speaks' => true]));
        }

        return $layers;
    }

    /**
     * Who speaks from which layer: `'speaks' => 'dante'` on a spec layer. Only a human figure can
     * speak, so the layer must be one of the library's figures.
     *
     * @param  array<string,mixed>  $s
     * @return array<string, array{asset_id: int, ref: string}>
     */
    public function speakers(array $s, int $order): array
    {
        $where = $this->sceneLabel($s, $order);
        $speakers = [];
        foreach ((array) ($s['layers'] ?? []) as $i => $entry) {
            $speaker = (string) ($entry['speaks'] ?? '');
            if ($speaker === '') {
                continue;
            }
            $ref = trim((string) ($entry['asset'] ?? ''), '/ ');
            if (! str_contains($ref, '/figures/')) {
                throw new \InvalidArgumentException("{$where}, layer {$i}: only a figure can speak, '{$ref}' is not one.");
            }
            $speakers[$speaker] = ['asset_id' => $this->libraryAsset($ref, $where)->id, 'ref' => $ref];
        }

        return $speakers;
    }

    /**
     * The inverse of applyLayers(): a scene's shots as the spec `layers` that rebuild them, or null
     * when they hold anything a spec cannot say (a second shot, a key beyond LAYER_KEYS, an asset
     * outside the bundled library) and must travel verbatim instead.
     *
     * @param  array<int,mixed>  $shots
     * @return list<array<string,mixed>>|null
     */
    public function specLayers(array $shots, ?string $imagePath): ?array
    {
        $shot = count($shots) === 1 ? (array) $shots[0] : [];
        $layers = (array) ($shot['layers'] ?? []);
        $frame = $imagePath ? ['order' => 0, 'image_path' => $imagePath] : ['order' => 0];
        if ($layers === [] || array_diff_key($shot, ['layers' => true]) != $frame) {
            return null;
        }
        if ($imagePath) {
            if ($layers[0] != SceneLayers::cover($imagePath, self::COVER_DEPTH)) {
                return null;
            }
            array_shift($layers);
        }

        $assets = SvgAsset::query()->bundled()->where('source', 'bundled')
            ->whereIn('id', array_filter(array_column($layers, 'asset_id')))->get()->keyBy('id');

        $entries = [];
        foreach ($layers as $layer) {
            $asset = $assets->get($layer['asset_id'] ?? null);
            $unknown = array_diff_key($layer, array_flip(['asset_id', 'path', ...self::LAYER_KEYS]));
            if (! $asset || ! in_array($layer['path'] ?? null, [$asset->svg_path, $asset->cdn_url], true) || $unknown !== []) {
                return null;
            }
            $settings = array_filter(
                array_intersect_key($layer, array_flip(self::LAYER_KEYS)),
                fn ($value, $key) => ! array_key_exists($key, SceneLayers::FIGURE_DEFAULTS) || SceneLayers::FIGURE_DEFAULTS[$key] != $value,
                ARRAY_FILTER_USE_BOTH,
            );
            $entries[] = ['asset' => preg_replace('/\.[^.\/]+$/', '', $asset->source_ref)] + $settings;
        }

        return $entries;
    }
}
