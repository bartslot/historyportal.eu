<?php

declare(strict_types=1);

namespace App\Services\Editor;

use App\Models\Lesson;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Pictures a teacher edited in the image editor (Filerobot, resources/js/editor/photo-editor.js).
 *
 * An edit is a NEW file next to the lesson's media; the original is never overwritten, so Reset and Cmd-Z only have
 * to point the layer back. The editor's own design state is kept on the layer too, so reopening the editor starts
 * from the original with every crop, colour and drawing still editable.
 */
final class EditedImages
{
    /** A 4K picture as webp sits well under this; anything bigger is not a picture we made. */
    public const MAX_BYTES = 12_000_000;

    public const MAX_SIDE = 8192;

    /** The editor's design state: crop, filters, drawings. Drawings are small; a bigger state is refused. */
    public const MAX_STATE_BYTES = 200_000;

    private const TYPES = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'];

    /** Store a posted `data:image/...;base64,` picture under the lesson; the public-disk path, or null when refused. */
    public static function store(Lesson $lesson, string $dataUrl): ?string
    {
        if (preg_match('#^data:(image/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$#', $dataUrl, $m) !== 1) {
            return null;
        }
        $bytes = base64_decode($m[2], true);
        if ($bytes === false || $bytes === '' || strlen($bytes) > self::MAX_BYTES) {
            return null;
        }
        $info = @getimagesizefromstring($bytes);
        if ($info === false || ($info['mime'] ?? null) !== $m[1] || $info[0] < 1 || $info[1] < 1 || max($info[0], $info[1]) > self::MAX_SIDE) {
            return null;
        }
        $path = sprintf('lessons/%d/edits/%s.%s', $lesson->id, Str::uuid(), self::TYPES[$m[1]]);
        Storage::disk('public')->put($path, $bytes);

        return $path;
    }

    /**
     * The design state as it is kept on the layer: without the picture itself (the editor sends the source back in
     * it), and only when it is small enough to sit in a scene row.
     *
     * @param  array<string,mixed>  $state
     * @return array<string,mixed>|null
     */
    public static function state(array $state): ?array
    {
        unset($state['imgSrc']);
        $json = json_encode($state);

        return $json !== false && strlen($json) <= self::MAX_STATE_BYTES && $state !== [] ? $state : null;
    }

    /** The editor's own words around Filerobot (photo-editor.js); Filerobot's are in photo-editor-labels.json. */
    private const OWN_LABELS = ['Edit image', 'Back to the original', 'Saving…', 'This picture could not be saved. Try again.', 'This picture cannot be opened in the editor.',
        // the filters a teacher is offered (photo-editor.js FILTERS)
        'None', 'Black and white', 'Old photo', 'Soft grey', 'Faded', 'Warm', 'Golden', 'Cool', 'Bright', 'Negative'];

    /**
     * Every English label the editor shows, translated into the page's language: English => shown.
     *
     * @return array<string,string>
     */
    public static function labels(): array
    {
        $filerobot = json_decode((string) file_get_contents(resource_path('js/editor/photo-editor-labels.json')), true) ?: [];

        return collect(array_values($filerobot))->merge(self::OWN_LABELS)->unique()->mapWithKeys(fn (string $en) => [$en => __($en)])->all();
    }

    /** A target the editor names: ['art', assetId] or ['s25', 'layer-3' | 'band-0' | 'sky']; null when unknown. */
    public static function target(string $target): ?array
    {
        if (preg_match('/^art_(\d+)$/', $target, $m) === 1) {
            return ['art', (int) $m[1]];
        }
        if (preg_match('/^s25_(layer-\d+|band-\d+|sky)$/', $target, $m) === 1) {
            return ['s25', $m[1]];
        }

        return null;
    }
}
