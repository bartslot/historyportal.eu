<?php

declare(strict_types=1);

namespace App\Services\Lessons;

use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use Illuminate\Support\Facades\Storage;

/**
 * The art-library side of LessonComposer: a spec's `backdrop`, `asset:` gallery images and figure
 * `layers`, resolved against the bundled SvgAsset library and copied into the lesson.
 */
class LibraryLayers
{
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
    private const LAYER_KEYS = [
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

        if (! $asset || ! Storage::disk('public')->exists($asset->svg_path)) {
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

    /** The history-line library is ink on white paper: the player's backdrop shade would grey it. */
    private function isLineArt(string $ref): bool
    {
        return str_starts_with($ref, 'history-line/');
    }

    /**
     * Background from the art library. The file is COPIED into the scene's own folder, the same
     * place a sourced background lands, so removing an asset from the library never blanks a lesson.
     */
    public function attachLibraryBackdrop(Scene $scene, string $ref, int $order): void
    {
        $asset = $this->libraryAsset($ref, $this->sceneLabel(['location' => $scene->location, 'chapter' => $scene->chapter_name], $order));
        $ext = pathinfo($asset->svg_path, PATHINFO_EXTENSION) ?: 'png';
        $path = "lessons/{$scene->lesson_id}/scenes/{$scene->id}/bg.{$ext}";
        Storage::disk('public')->copy($asset->svg_path, $path);

        $scene->update([
            'image_path' => $path,
            'config' => array_merge((array) ($scene->config ?? []), [
                'image_credit' => $asset->credit(),
                'background_focus' => 'center',
            ], $this->isLineArt($ref) ? ['backdrop_shade' => false] : []),
        ]);
    }

    /**
     * A gallery image from the art library, copied into the lesson. Root-relative URL, the same
     * shape the editor stores for a picked painting (Storage::url() would bake in APP_URL).
     *
     * @return array{url:string,credit:?string}
     */
    public function copyLibraryImage(Lesson $lesson, string $ref, int $order): array
    {
        $asset = $this->libraryAsset($ref, "Spec scene #{$order} gallery");
        $path = "lessons/{$lesson->id}/gallery/".basename($asset->svg_path);
        Storage::disk('public')->put($path, Storage::disk('public')->get($asset->svg_path));

        return ['url' => '/storage/'.$path, 'credit' => $asset->credit()];
    }

    /**
     * Build shots[0] from a spec's `layers`, exactly as the editor's attachArtwork() does: the scene
     * image as a cover layer first (or a layer-only shot when there is none, e.g. a map), then one
     * layer per entry with the editor's attach defaults under whatever the spec sets.
     *
     * The same asset may appear twice (two cypresses). Both layers carry the real asset_id, since
     * the editor drops a layer whose id has no SvgAsset row; the editor then selects them as one.
     *
     * @param  array<string,mixed>  $s
     */
    public function applyLayers(Scene $scene, array $s, int $order): void
    {
        $layers = $this->buildLayers($s, $order);
        if ($layers === []) {
            return;
        }

        $scene->refresh();
        $shot = $scene->image_path
            ? ['order' => 0, 'image_path' => $scene->image_path, 'layers' => [
                ['path' => $scene->image_path, 'kind' => 'cover', 'depth' => 0.4], ...$layers,
            ]]
            : ['order' => 0, 'layers' => $layers];

        $scene->update(['shots' => [$shot]]);
    }

    /**
     * A spec's `layers`, validated and resolved against the library (throws on any bad entry).
     *
     * @param  array<string,mixed>  $s
     * @return list<array<string,mixed>>
     */
    private function buildLayers(array $s, int $order): array
    {
        $entries = (array) ($s['layers'] ?? []);
        $where = $this->sceneLabel($s, $order);
        $layers = [];
        foreach ($entries as $i => $entry) {
            $unknown = array_diff(array_keys((array) $entry), ['asset', ...self::LAYER_KEYS]);
            if ($unknown !== []) {
                throw new \InvalidArgumentException("{$where}, layer {$i}: unknown key(s) ".implode(', ', $unknown).'.');
            }
            $asset = $this->libraryAsset((string) ($entry['asset'] ?? ''), $where);
            $layers[] = array_merge(
                // attachArtwork()'s defaults: x/y is the CENTRE of the figure, in % of the stage.
                ['kind' => 'figure', 'depth' => 1.3, 'scale' => 1.0, 'height' => 40, 'sway' => false, 'x' => 50.0, 'y' => 58.0],
                array_diff_key((array) $entry, ['asset' => true]),
                ['asset_id' => $asset->id, 'path' => $asset->svg_path],
            );
        }

        return $layers;
    }
}
