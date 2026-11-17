<?php

declare(strict_types=1);

namespace App\Services\Editor;

use App\Models\Lesson;
use App\Models\SvgAsset;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * A teacher's own characters, made in the Character tab (vault topics/character-creator/character-tab-plan.md): the atlas
 * the browser painted from the kit, its shade mask beside it (<atlas>-shade.webp, stage25d layer.ts shadeMaskUrl), the
 * puppet the stage bends and the recipe the tab opens again. Nothing the browser sends is trusted as it is: the pictures
 * are checked by EditedImages, the puppet is rebuilt from known bone names and finite numbers, the recipe from the kit's
 * own ids.
 */
final class Characters
{
    public const SOURCE = 'character';

    public const REMOVED = 'character-removed';

    /** The kits a character may be made from, and where their kit.json lies (public/, kit_bake.py). */
    public const KITS = ['babylonia-old-babylonian' => 'character-kits/babylonia-old-babylonian/v1/kit.json'];

    /** The rig's bones (engine-mvp/tools/kit_bake.py PARENT): nothing else reaches the stage. */
    public const BONES = ['hips', 'chest', 'head', 'upperarm_n', 'forearm_n', 'upperarm_f', 'forearm_f', 'thigh_n', 'thigh_f', 'shin_n', 'shin_f', 'foot_n', 'foot_f'];

    public const EXPRESSIONS = ['calm', 'curious', 'sad', 'angry', 'amazed'];

    private const MAX_PARTS = 40;

    /** The Character tab's words (resources/js/editor/character-tab.js reads them through t()). */
    private const LABELS = [
        'Character', 'Who', 'Body', 'Face', 'Hair', 'Clothes', 'Extra', 'Random', 'Whole figure', 'Expression',
        'Calm', 'Curious', 'Sad', 'Angry', 'Amazed', 'Name', 'People of this time', 'Skin', 'Eyes', 'Mouth', 'Hair colour',
        'Beard', 'Headwear', 'Jewellery', 'None', 'Own eyes', 'Own mouth', 'No hair', 'No beard', 'Nothing on the head',
        'Cloth', 'Shawl', 'Cord', 'Apron', 'Band', 'Trim', 'Girl', 'Woman', 'Man', 'The character kit could not be loaded.', 'New character', 'Head cloth',
    ];

    /** The kit's colours by id, as the tab names them. */
    private const COLOURS = [
        'bleached-linen' => 'Bleached linen', 'raw-linen' => 'Raw linen', 'undyed-wool' => 'Undyed wool', 'sand' => 'Sand',
        'camel-brown' => 'Camel brown', 'dark-wool-brown' => 'Dark wool brown', 'madder-red' => 'Madder red', 'red-ochre' => 'Red ochre',
        'yellow-ochre' => 'Yellow ochre', 'reed-green' => 'Reed green', 'indigo-blue' => 'Indigo blue', 'charcoal-wool' => 'Charcoal wool',
        's1' => 'Very light skin', 's2' => 'Light skin', 's3' => 'Medium skin', 's4' => 'Brown skin', 's5' => 'Dark brown skin',
        'black-brown' => 'Black brown', 'dark-brown' => 'Dark brown', 'brown' => 'Brown', 'grey' => 'Grey', 'white' => 'White',
    ];

    /**
     * Every word the tab shows, in the page's language: its own, the colours, and the kit's pieces and people.
     *
     * @return array<string,string>
     */
    public static function labels(): array
    {
        $words = collect(self::LABELS)->mapWithKeys(fn (string $en) => [$en => __($en)]);
        $colours = collect(self::COLOURS)->map(fn (string $en) => __($en));
        $kit = self::kit('babylonia-old-babylonian') ?? [];
        $names = collect($kit['bodies'] ?? [])->flatMap(fn ($b) => collect($b['pieces'] ?? [])->where('slot', '!=', 'expression')->pluck('label'))
            ->merge(collect($kit['presets'] ?? [])->pluck('label'))
            ->filter(fn ($l) => is_string($l))->unique()->mapWithKeys(fn (string $en) => [$en => __($en)]);

        return [...$words->all(), ...$colours->all(), ...$names->all()];
    }

    private const MAX_PX = 4096;

    /**
     * Save a new character (`$id` null) or a new look for one of the teacher's own: every scene that shows it follows.
     * Null when anything is refused.
     *
     * @param  array<string,mixed>  $puppet
     * @param  array<string,mixed>  $recipe
     */
    public static function save(User $user, ?int $id, string $atlas, string $shade, array $puppet, array $recipe, string $name, string $thumb = ''): ?SvgAsset
    {
        $row = $id === null ? null : SvgAsset::query()->whereKey($id)->where('user_id', $user->id)->where('source', self::SOURCE)->first();
        if ($id !== null && $row === null) {
            return null;
        }
        $kit = self::kit((string) ($recipe['kit'] ?? ''));
        $cleanRecipe = $kit ? self::recipe($kit, $recipe) : null;
        $cleanPuppet = self::puppet($puppet);
        if ($cleanRecipe === null || $cleanPuppet === null) {
            return null;
        }
        $path = EditedImages::storeIn("characters/{$user->id}", $atlas);
        if ($path === null) {
            return null;
        }
        $shadeBytes = self::webpBytes($shade);
        if ($shadeBytes === null) {
            Storage::disk('public')->delete($path);

            return null;
        }
        Storage::disk('public')->put(self::shadePath($path), $shadeBytes);
        $thumbBytes = $thumb !== '' ? self::webpBytes($thumb) : null;
        if ($thumbBytes !== null) {
            Storage::disk('public')->put(self::thumbPath($path), $thumbBytes);
        }
        $title = trim(Str::limit(strip_tags($name), 60, '')) ?: __('Character');
        $fields = [
            'title' => $title,
            'svg_path' => $path,
            'width' => $cleanPuppet['width'],
            'height' => $cleanPuppet['height'],
            'height_m' => $cleanRecipe['height_m'],
            'character' => ['recipe' => $cleanRecipe, 'puppet' => $cleanPuppet],
        ];
        if ($row !== null) {
            $old = $row->svg_path;
            $row->update($fields);
            Storage::disk('public')->delete([$old, self::shadePath($old), self::thumbPath($old)]);

            return $row->refresh();
        }

        return SvgAsset::create([
            ...$fields,
            'user_id' => $user->id,
            'source' => self::SOURCE,
            'source_ref' => pathinfo($path, PATHINFO_FILENAME),
            'source_url' => '',
            'license' => __('Own character'),
        ]);
    }

    /** One saved person per kit body (atlas, shade, thumb, puppet + recipe): what a made-for-you character starts as. */
    public const STARTERS = 'character-kits/babylonia-old-babylonian/v1/starters';

    public const BODIES = ['man', 'woman', 'girl'];

    /**
     * A plain person of a kit body for a name the teacher has no character for yet (an import's cast): the body's
     * starter look under that name, marked `auto` so the teacher knows to dress it. Saving it in the Character tab
     * keeps the id and drops the mark. Goes through save(), so it is checked like any character.
     */
    public static function starter(User $user, string $name, string $body, ?float $heightM = null): ?SvgAsset
    {
        $dir = public_path(self::STARTERS);
        $spec = in_array($body, self::BODIES, true) ? json_decode((string) @file_get_contents("{$dir}/{$body}.json"), true) : null;
        if (! is_array($spec) || ! is_array($spec['recipe'] ?? null) || ! is_array($spec['puppet'] ?? null)) {
            return null;
        }
        $url = fn (string $file) => is_file("{$dir}/{$file}") ? 'data:image/webp;base64,'.base64_encode((string) file_get_contents("{$dir}/{$file}")) : '';
        $recipe = ['role' => $name] + ($heightM !== null ? ['height_m' => $heightM] : []) + $spec['recipe'];
        $asset = self::save($user, null, $url("{$body}.webp"), $url("{$body}-shade.webp"), $spec['puppet'], $recipe, $name, $url("{$body}-thumb.webp"));
        $asset?->update(['character' => ['auto' => true] + $asset->character]);

        return $asset;
    }

    /** The shade mask's file beside an atlas (stage25d layer.ts shadeMaskUrl). */
    public static function shadePath(string $atlas): string
    {
        return preg_replace('/\.webp$/', '', $atlas).'-shade.webp';
    }

    /** The small picture of the whole person beside an atlas: the shelf's tile and the inspector's preview. */
    public static function thumbPath(string $atlas): string
    {
        return preg_replace('/\.webp$/', '', $atlas).'-thumb.webp';
    }

    /** A WebP data url's bytes, checked like EditedImages checks a picture; null when it is anything else. */
    private static function webpBytes(string $dataUrl): ?string
    {
        if (preg_match('#^data:image/webp;base64,([A-Za-z0-9+/=]+)$#', $dataUrl, $m) !== 1) {
            return null;
        }
        $bytes = base64_decode($m[1], true);
        if ($bytes === false || $bytes === '' || strlen($bytes) > EditedImages::MAX_BYTES) {
            return null;
        }
        $info = @getimagesizefromstring($bytes);

        return $info !== false && ($info['mime'] ?? null) === 'image/webp' && max($info[0], $info[1]) <= EditedImages::MAX_SIDE ? $bytes : null;
    }

    /** @return array<string,mixed>|null */
    public static function kit(string $id): ?array
    {
        $file = self::KITS[$id] ?? null;
        if ($file === null || ! is_file(public_path($file))) {
            return null;
        }
        $kit = json_decode((string) file_get_contents(public_path($file)), true);

        return is_array($kit) ? $kit : null;
    }

    /**
     * The recipe with only ids this kit has; null when its body or a needed piece is unknown.
     *
     * @param  array<string,mixed>  $kit
     * @param  array<string,mixed>  $r
     * @return array<string,mixed>|null
     */
    public static function recipe(array $kit, array $r): ?array
    {
        $body = collect($kit['bodies'] ?? [])->firstWhere('id', $r['body'] ?? null);
        if (! is_array($body)) {
            return null;
        }
        $pieces = collect($body['pieces'] ?? [])->pluck('id')->all();
        $has = fn (string $id): bool => in_array($id, $pieces, true);
        $outfit = is_string($r['outfit'] ?? null) ? $r['outfit'] : '';
        $face = is_string($r['face'] ?? null) ? $r['face'] : '';
        if (! $has("outfit/{$outfit}") || ! $has("face/{$face}")) {
            return null;
        }
        $ids = fn (string $list, string $key) => collect($kit[$list] ?? [])->pluck('id')->contains($r[$key] ?? null);
        $swatches = collect($kit['swatches'] ?? [])->pluck('id')->all();
        $zones = collect(is_array($r['zones'] ?? null) ? $r['zones'] : [])
            ->filter(fn ($c, $z) => is_string($z) && array_key_exists($z, $kit['zoneKinds'] ?? []) && in_array($c, $swatches, true))
            ->all();
        $out = [
            'kit' => $kit['id'], 'kitVersion' => (int) ($kit['version'] ?? 1), 'view' => 'front34',
            'body' => $body['id'], 'outfit' => $outfit, 'face' => $face,
            'parts' => array_values(array_filter(is_array($r['parts'] ?? null) ? $r['parts'] : [], fn ($p) => is_string($p) && $has($p))),
            'skin' => $ids('skins', 'skin') ? $r['skin'] : ($kit['skins'][0]['id'] ?? 's3'),
            'hair_colour' => $ids('hairColours', 'hair_colour') ? $r['hair_colour'] : ($kit['hairColours'][0]['id'] ?? 'black-brown'),
            'height_m' => is_numeric($r['height_m'] ?? null) ? round(max(0.9, min(2.1, (float) $r['height_m'])), 2) : 1.6,
            'zones' => $zones,
            'facing' => ($r['facing'] ?? 1) === -1 ? -1 : 1,
        ];
        foreach (['eyes' => 'eyes', 'mouth' => 'mouths'] as $key => $folder) {
            if (is_string($r[$key] ?? null) && $has("{$folder}/{$r[$key]}")) {
                $out[$key] = $r[$key];
            }
        }
        if (is_string($r['role'] ?? null)) {
            $out['role'] = Str::limit(strip_tags($r['role']), 60, '');
        }

        return $out;
    }

    /**
     * The puppet rebuilt from what the stage reads (stage25d/types.ts Puppet), every number finite and in its frame;
     * null when it does not hold together.
     *
     * @param  array<string,mixed>  $p
     * @return array<string,mixed>|null
     */
    public static function puppet(array $p): ?array
    {
        $w = $p['width'] ?? null;
        $h = $p['height'] ?? null;
        if (! is_int($w) || ! is_int($h) || $w < 1 || $h < 1 || $w > self::MAX_PX || $h > self::MAX_PX) {
            return null;
        }
        $num = fn ($v, float $min, float $max): ?float => is_int($v) || is_float($v) ? (is_finite((float) $v) && $v >= $min && $v <= $max ? round((float) $v, 4) : null) : null;
        $point = function ($v) use ($num, $w, $h): ?array {
            if (! is_array($v) || count($v) !== 2) {
                return null;
            }
            $x = $num($v[0] ?? null, -$w, 2 * $w);
            $y = $num($v[1] ?? null, -$h, 2 * $h);

            return $x === null || $y === null ? null : [$x, $y];
        };
        $uv = function ($v) use ($num): ?array {
            if (! is_array($v) || count($v) !== 4) {
                return null;
            }
            $out = array_map(fn ($c) => $num($c, 0.0, 1.0), array_values($v));

            return in_array(null, $out, true) ? null : $out;
        };
        $bones = [];
        foreach (is_array($p['bones'] ?? null) ? $p['bones'] : [] as $b) {
            $name = $b['name'] ?? null;
            $parent = $b['parent'] ?? null;
            $from = $point($b['from'] ?? null);
            if (! in_array($name, self::BONES, true) || ($parent !== null && ! in_array($parent, self::BONES, true)) || $from === null || isset($bones[$name])) {
                return null;
            }
            $bone = ['name' => $name, 'parent' => $parent, 'from' => $from];
            if (isset($b['to']) && ($to = $point($b['to'])) !== null) {
                $bone['to'] = $to;
            }
            $limit = $b['limit'] ?? null;
            if (is_array($limit) && count($limit) === 2 && ($lo = $num($limit[0] ?? null, -180, 180)) !== null && ($hi = $num($limit[1] ?? null, -180, 180)) !== null && $lo <= $hi) {
                $bone['limit'] = [$lo, $hi];
            }
            foreach (['band', 'reach'] as $k) {
                if (isset($b[$k]) && ($v = $num($b[$k], 0, self::MAX_PX)) !== null) {
                    $bone[$k] = $v;
                }
            }
            $bones[$name] = $bone;
        }
        foreach ($bones as $bone) {
            if ($bone['parent'] !== null && ! isset($bones[$bone['parent']])) {
                return null;
            }
        }
        $parts = [];
        foreach (array_slice(is_array($p['parts'] ?? null) ? $p['parts'] : [], 0, self::MAX_PARTS) as $part) {
            $quad = is_array($part['quad'] ?? null) && count($part['quad']) === 4 ? array_map($point, array_values($part['quad'])) : null;
            $u = $uv($part['uv'] ?? null);
            if (! isset($bones[$part['bone'] ?? '']) || $quad === null || in_array(null, $quad, true) || $u === null) {
                return null;
            }
            $parts[] = ['bone' => $part['bone'], 'quad' => $quad, 'uv' => $u];
        }
        if ($bones === [] || $parts === []) {
            return null;
        }
        $faces = [];
        foreach (is_array($p['faces'] ?? null) ? $p['faces'] : [] as $face => $f) {
            if (in_array($face, self::EXPRESSIONS, true) && ($u = $uv($f)) !== null) {
                $faces[$face] = $u;
            }
        }

        return [
            'width' => $w, 'height' => $h, 'facing' => ($p['facing'] ?? 1) === -1 ? -1 : 1, 'paint' => 'flat',
            'bones' => array_values($bones), 'parts' => $parts, ...($faces !== [] ? ['faces' => $faces] : []),
        ];
    }

    /** @return Collection<int, SvgAsset> */
    public static function of(User $user): Collection
    {
        return SvgAsset::query()->where('user_id', $user->id)->where('source', self::SOURCE)->latest()->get();
    }

    /** Off the teacher's shelf; scenes that show it keep showing it. */
    public static function remove(User $user, int $id): bool
    {
        return SvgAsset::query()->whereKey($id)->where('user_id', $user->id)->where('source', self::SOURCE)->update(['source' => self::REMOVED]) === 1;
    }

    /**
     * A character as a row of the 3D library: a figure with its puppet. `file` is relative to a bundle's own folder, the
     * puppet's atlas a site path (bones.ts puppetOf leaves it as it is).
     *
     * @return array<string,mixed>
     */
    public static function stageRow(SvgAsset $a): array
    {
        $puppet = $a->character['puppet'] ?? [];
        $url = '/storage/'.ltrim($a->svg_path, '/');

        return [
            'id' => 'chr-'.$a->id,
            'layer' => 'figure',
            'tags' => ['figure', 'character'],
            'file' => '../../'.ltrim($a->svg_path, '/'),
            'w' => (int) $a->width,
            'h' => (int) $a->height,
            'anchor' => [0.5, 1],
            'height_m' => $a->height_m ?: 1.6,
            'name' => ['nl' => $a->title, 'en' => $a->title],
            'character' => true,
            'recipe' => $a->character['recipe'] ?? null,
            'puppet' => [...$puppet, 'atlas' => $url],
            ...(Storage::disk('public')->exists(self::thumbPath($a->svg_path)) ? ['thumb' => '/storage/'.self::thumbPath($a->svg_path)] : []),
            ...($a->source === self::REMOVED ? ['removed' => true] : []),
        ];
    }

    /** The character a 3D layer id names ('chr-<id>'), or null. */
    public static function idOf(string $assetId): ?int
    {
        return preg_match('/^chr-(\d+)$/', $assetId, $m) === 1 ? (int) $m[1] : null;
    }

    /** The library kind of a teacher's own character ('figure'), or null when it is not theirs. */
    public static function layerOf(string $assetId, int $userId): ?string
    {
        $id = self::idOf($assetId);

        return $id !== null && SvgAsset::query()->whereKey($id)->where('user_id', $userId)->where('source', self::SOURCE)->exists()
            ? 'figure' : null;
    }

    /**
     * The rows a page needs: the teacher's own characters (the editor) and every character the lesson's 3D scenes show,
     * whoever made it (the player: a class has to see them too).
     *
     * @return list<array<string,mixed>>
     */
    public static function forStage(?User $user, ?Lesson $lesson = null): array
    {
        $ids = [];
        foreach ($lesson?->scenes ?? [] as $scene) {
            foreach ($scene->config['stage25d']['set']['layers'] ?? [] as $layer) {
                if (is_string($layer['asset'] ?? null) && ($id = self::idOf($layer['asset'])) !== null) {
                    $ids[] = $id;
                }
            }
        }
        $rows = SvgAsset::query()
            ->where(fn ($q) => $q->whereIn('source', [self::SOURCE, self::REMOVED])->whereIn('id', $ids))
            ->when($user, fn ($q) => $q->orWhere(fn ($q) => $q->where('source', self::SOURCE)->where('user_id', $user->id)))
            ->latest()->get();

        return $rows->map(fn (SvgAsset $a) => self::stageRow($a))->values()->all();
    }
}
