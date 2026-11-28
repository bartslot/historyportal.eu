<?php

declare(strict_types=1);

namespace App\Services\Support;

use App\Livewire\Wizard\Concerns\EditsSceneArtwork;
use App\Support\MediaUrl;

/**
 * A backing panel: the coloured box behind a scene's text (config.texts[] with kind 'rect').
 *
 * Bart, 2026-11-28: "I can't make the panel full screen, or half or side ways just like the scene
 * view can. I would like to add a background (mostly a specific color or a zoomed in piece of an
 * asset ...) and that this is watercolour texture on it. To select some presets is really nice."
 *
 *     side    'full' | 'left' | 'right' | 'top' | 'bottom'   where it sits (default left)
 *     size    20..80   its share of the stage in %, for a half (default 50)
 *     color   #rrggbb  its colour, under a picture too
 *     opacity 0.1..1   how much of the scene shows through
 *     blur    0..20    px of frosted glass behind it (absent = 10, how every older panel looked)
 *     image   a picture of this scene (sceneImages), drawn as a zoomed crop
 *     focus   ['x', 'y', 'zoom'?] the crop of that picture, as a split panel's (SceneSplit::focus)
 *     wash    null | a paper edge (EditsSceneArtwork::PAPER_MASKS): a watercolour edge and paper tooth
 *
 * resources/js/scene/backing-panel.js reads the same fields for the editor and the player.
 */
final class BackingPanel
{
    public const SIDES = ['full', 'left', 'right', 'top', 'bottom'];

    public const SIZE = [20.0, 80.0];

    public const BLUR = [0.0, 20.0];

    public const OPACITY = [0.1, 1.0];

    /** Fields a teacher can set from the inspector. */
    public const FIELDS = ['side', 'size', 'color', 'opacity', 'blur', 'image', 'focus', 'wash'];

    /** How many of the scene's pictures the inspector offers. */
    private const MAX_IMAGES = 12;

    /**
     * A panel as it is stored: every field checked, the unset ones left out so an older panel
     * reads (and renders) exactly as it did.
     *
     * @param  array<string, mixed>  $t
     * @return array<string, mixed>
     */
    public static function clean(array $t, string $id): array
    {
        $color = (string) ($t['color'] ?? '#0f172a');
        $side = in_array($t['side'] ?? null, self::SIDES, true) ? $t['side'] : 'left';
        $out = [
            'id' => $id,
            'kind' => 'rect',
            'side' => $side,
            'color' => preg_match('/^#[0-9a-fA-F]{6}$/', $color) ? strtolower($color) : '#0f172a',
            'opacity' => self::clamp($t['opacity'] ?? 0.5, self::OPACITY, 0.5),
        ];
        if (is_numeric($t['size'] ?? null) && (float) $t['size'] !== 50.0) {
            $out['size'] = self::clamp($t['size'], self::SIZE, 50.0);
        }
        if (is_numeric($t['blur'] ?? null)) {
            $out['blur'] = self::clamp($t['blur'], self::BLUR, 10.0);
        }
        $image = self::imageUrl($t['image'] ?? null);
        if ($image !== null) {
            $out['image'] = $image;
            $focus = SceneSplit::focus($t['focus'] ?? null);
            if ($focus !== null) {
                $out['focus'] = $focus;
            }
        }
        if (in_array($t['wash'] ?? null, EditsSceneArtwork::PAPER_MASKS, true)) {
            $out['wash'] = $t['wash'];
        }
        // Stacking order set by drag-reorder in the object list (higher = in front).
        $out['z'] = (isset($t['z']) && is_numeric($t['z'])) ? (int) $t['z'] : null;
        if (! empty($t['locked'])) {
            $out['locked'] = 1;
        }

        return $out;
    }

    /**
     * A picture URL a panel may draw: one of ours (root-relative) or an http(s) one, and nothing a
     * stylesheet could read as more than a URL. The inspector only offers sceneImages().
     */
    public static function imageUrl(mixed $url): ?string
    {
        if (! is_string($url) || $url === '' || strlen($url) > 2048) {
            return null;
        }
        $ours = str_starts_with($url, '/') && ! str_starts_with($url, '//');
        if (! $ours && preg_match('#^https?://#i', $url) !== 1) {
            return null;
        }

        return preg_match('/[\s"\'()<>\\\\]/', $url) === 1 ? null : $url;
    }

    /**
     * Every picture in a scene, the scene's own first: its backdrop, each panel's, and every layer
     * that points at a picture (figures, the 2.5D stage's layers). The panel crops one of these.
     *
     * @param  array<string, mixed>|null  $config
     * @param  array<int, mixed>|null  $shots
     * @return list<string>
     */
    public static function sceneImages(?string $imagePath, ?array $config, ?array $shots): array
    {
        $found = [];
        $add = function (mixed $v) use (&$found): void {
            if (! is_string($v) || ! preg_match('/\.(webp|png|jpe?g|gif|avif)(\?.*)?$/i', $v)) {
                return;
            }
            $url = self::imageUrl(MediaUrl::of($v));
            if ($url !== null && ! in_array($url, $found, true)) {
                $found[] = $url;
            }
        };
        $add($imagePath);
        $walk = function (mixed $node, int $depth) use (&$walk, $add): void {
            if (! is_array($node) || $depth > 6) {
                return;
            }
            foreach ($node as $key => $value) {
                if (is_array($value)) {
                    $walk($value, $depth + 1);
                } elseif (in_array($key, ['url', 'image_url', 'image_path', 'src'], true)) {
                    $add($value);
                }
            }
        };
        $walk($shots ?? [], 0);
        // Not the panels' own pictures: a panel cropping another panel is a loop of nothing.
        $config = $config ?? [];
        unset($config['texts']);
        $walk($config, 0);

        return array_slice($found, 0, self::MAX_IMAGES);
    }

    /** @param array{0: float, 1: float} $range */
    private static function clamp(mixed $v, array $range, float $fallback): float
    {
        return is_numeric($v) ? round(max($range[0], min($range[1], (float) $v)), 3) : $fallback;
    }
}
