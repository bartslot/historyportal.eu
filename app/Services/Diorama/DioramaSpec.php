<?php

declare(strict_types=1);

namespace App\Services\Diorama;

/**
 * The diorama scene JSON: the one source of truth for where what is in a scene.
 *
 * Saved under `scenes.config.diorama`, exported/imported by `diorama:export` / `diorama:import`,
 * and the same shape the editor will copy and paste. AI agents and JEV edit this file; the editor
 * and player only render it. Example: docs/diorama-example.json.
 *
 * Rules the shape encodes (Bart, 2026-09-29):
 * - Nothing is off the grid: every item stands on a floor, at a cell. Cells may be decimal, so a
 *   walk loop slides smoothly, but a cell is always inside its floor's range.
 * - Floors are the only snap surfaces. A floor can ride on an item (a boat's deck, `on: "boat"`);
 *   what stands on it moves with that item.
 * - Every layer anchors at its bottom centre, so an item has no anchor field.
 * - Resizing is depth, never world height, so an item has no scale field.
 *
 * Axes follow Blender: x right, y forward (away from the camera), z up, metres. A floor cell
 * [cx, cy] sits at origin_m + cell × cell_m on that floor.
 */
final class DioramaSpec
{
    public const VERSION = 1;

    private const ID = '/^[a-z0-9][a-z0-9_.-]*$/';

    private const FACINGS = ['left', 'right'];

    /**
     * Every problem in $spec, each prefixed with its JSON path. Empty = valid.
     * All-or-nothing: callers reject the whole spec when this is not empty.
     *
     * @return list<string>
     */
    public static function errors(mixed $spec): array
    {
        if (! is_array($spec)) {
            return ['root: expected a JSON object'];
        }

        $version = $spec['diorama'] ?? null;
        if ($version !== self::VERSION) {
            return [is_int($version) && $version > self::VERSION
                ? "diorama: version {$version} is newer than this app understands (".self::VERSION.')'
                : 'diorama: expected '.self::VERSION];
        }

        $errors = self::cameraErrors($spec['camera'] ?? null);

        $floors = self::listOf($spec, 'floors', $errors);
        $spots = self::listOf($spec, 'spots', $errors, required: false);
        $items = self::listOf($spec, 'items', $errors, required: false);

        $floorsById = self::indexById($floors, 'floors', $errors);
        $itemsById = self::indexById($items, 'items', $errors);
        self::indexById($spots, 'spots', $errors);

        foreach ($floors as $i => $floor) {
            array_push($errors, ...self::floorErrors($floor, "floors[{$i}]", $itemsById));
        }
        foreach ($spots as $i => $spot) {
            array_push($errors, ...self::placementErrors($spot, "spots[{$i}]", $floorsById));
        }
        foreach ($items as $i => $item) {
            array_push($errors, ...self::itemErrors($item, "items[{$i}]", $floorsById));
        }

        if ($errors === []) {
            array_push($errors, ...self::nestingErrors($floorsById, $itemsById));
        }

        return $errors;
    }

    /** @return list<string> */
    private static function cameraErrors(mixed $camera): array
    {
        if (! is_array($camera)) {
            return ['camera: required object'];
        }

        $errors = [];
        foreach (['width', 'height'] as $key) {
            if (! is_int($camera[$key] ?? null) || $camera[$key] <= 0) {
                $errors[] = "camera.{$key}: expected a positive whole number of pixels";
            }
        }
        if (! self::isNumber($camera['focal_px'] ?? null) || $camera['focal_px'] <= 0) {
            $errors[] = 'camera.focal_px: expected a positive number';
        }
        if (! self::isVector($camera['principal_px'] ?? null, 2)) {
            $errors[] = 'camera.principal_px: expected [x, y] in pixels';
        }
        if (! self::isVector($camera['position_m'] ?? null, 3)) {
            $errors[] = 'camera.position_m: expected [x, y, z] in metres';
        }
        if (array_key_exists('yaw_deg', $camera) && ! self::isNumber($camera['yaw_deg'])) {
            $errors[] = 'camera.yaw_deg: expected a number';
        }
        if (($camera['level'] ?? null) !== true) {
            $errors[] = 'camera.level: must be true (a pitched or rolled camera is not supported in version 1)';
        }

        return $errors;
    }

    /**
     * @param  array<string, array<string, mixed>>  $itemsById
     * @return list<string>
     */
    private static function floorErrors(mixed $floor, string $path, array $itemsById): array
    {
        if (! is_array($floor)) {
            return ["{$path}: expected an object"];
        }

        $errors = [];
        if (! self::isNumber($floor['height_m'] ?? null)) {
            $errors[] = "{$path}.height_m: expected metres (above the parent floor when `on` is set)";
        }
        if (! self::isNumber($floor['cell_m'] ?? null) || $floor['cell_m'] <= 0) {
            $errors[] = "{$path}.cell_m: expected a positive cell size in metres";
        }
        if (array_key_exists('origin_m', $floor) && ! self::isVector($floor['origin_m'], 2)) {
            $errors[] = "{$path}.origin_m: expected [x, y] in metres";
        }
        $cells = $floor['cells'] ?? null;
        if (! is_array($cells) || count($cells) !== 2 || ! self::isVector($cells[0] ?? null, 2) || ! self::isVector($cells[1] ?? null, 2)) {
            $errors[] = "{$path}.cells: expected [[min x, min y], [max x, max y]]";
        } elseif ($cells[0][0] > $cells[1][0] || $cells[0][1] > $cells[1][1]) {
            $errors[] = "{$path}.cells: min is larger than max";
        }
        if (array_key_exists('on', $floor) && ! isset($itemsById[$floor['on']])) {
            $errors[] = "{$path}.on: no item with id ".json_encode($floor['on']);
        }

        return $errors;
    }

    /**
     * @param  array<string, array<string, mixed>>  $floorsById
     * @return list<string>
     */
    private static function itemErrors(mixed $item, string $path, array $floorsById): array
    {
        $errors = self::placementErrors($item, $path, $floorsById);
        if (! is_array($item)) {
            return $errors;
        }

        if (! is_string($item['asset'] ?? null) || $item['asset'] === '') {
            $errors[] = "{$path}.asset: expected the asset key";
        }
        if (! is_int($item['asset_version'] ?? null) || $item['asset_version'] < 1) {
            $errors[] = "{$path}.asset_version: expected a whole number from 1";
        }

        $keys = $item['keys'] ?? [];
        if (! array_is_list($keys)) {
            return [...$errors, "{$path}.keys: expected a list"];
        }
        $floor = $floorsById[$item['floor'] ?? ''] ?? null;
        $previous = -INF;
        foreach ($keys as $k => $key) {
            $keyPath = "{$path}.keys[{$k}]";
            $t = is_array($key) ? ($key['t'] ?? null) : null;
            if (! self::isNumber($t) || $t < 0) {
                $errors[] = "{$keyPath}.t: expected seconds from 0";
            } elseif ($t <= $previous) {
                $errors[] = "{$keyPath}.t: keys must be in time order";
            } else {
                $previous = $t;
            }
            if ($floor !== null) {
                array_push($errors, ...self::cellErrors(is_array($key) ? ($key['cell'] ?? null) : null, "{$keyPath}.cell", $floor, (string) $item['floor']));
            }
        }

        return $errors;
    }

    /**
     * What spots and items share: an id, a floor, a cell on it, and a facing.
     *
     * @param  array<string, array<string, mixed>>  $floorsById
     * @return list<string>
     */
    private static function placementErrors(mixed $placed, string $path, array $floorsById): array
    {
        if (! is_array($placed)) {
            return ["{$path}: expected an object"];
        }

        $errors = [];
        $floorId = $placed['floor'] ?? null;
        $floor = is_string($floorId) ? ($floorsById[$floorId] ?? null) : null;
        if ($floor === null) {
            $errors[] = "{$path}.floor: no floor with id ".json_encode($floorId).' (nothing can be off the grid)';
        } else {
            array_push($errors, ...self::cellErrors($placed['cell'] ?? null, "{$path}.cell", $floor, $floorId));
        }
        if (array_key_exists('facing', $placed) && ! in_array($placed['facing'], self::FACINGS, true)) {
            $errors[] = "{$path}.facing: expected ".implode(' or ', self::FACINGS);
        }

        return $errors;
    }

    /**
     * @param  array<string, mixed>  $floor
     * @return list<string>
     */
    private static function cellErrors(mixed $cell, string $path, array $floor, string $floorId): array
    {
        if (! self::isVector($cell, 2)) {
            return ["{$path}: expected [x, y] in cells (decimals allowed)"];
        }
        [$min, $max] = $floor['cells'] ?? [[0, 0], [0, 0]];
        if ($cell[0] < $min[0] || $cell[0] > $max[0] || $cell[1] < $min[1] || $cell[1] > $max[1]) {
            return [sprintf('%s: %s is outside floor %s (x %s..%s, y %s..%s)', $path, json_encode($cell), $floorId, $min[0], $max[0], $min[1], $max[1])];
        }

        return [];
    }

    /**
     * A floor riding on an item must lead back to a floor that rides on nothing: a boat cannot
     * stand on its own deck, directly or through another item.
     *
     * @param  array<string, array<string, mixed>>  $floorsById
     * @param  array<string, array<string, mixed>>  $itemsById
     * @return list<string>
     */
    private static function nestingErrors(array $floorsById, array $itemsById): array
    {
        $errors = [];
        foreach ($floorsById as $id => $floor) {
            $seen = [$id => true];
            $current = $floor;
            while (isset($current['on'])) {
                $nextId = $itemsById[$current['on']]['floor'];
                if (isset($seen[$nextId])) {
                    $errors[] = "floors: {$id} rides on ".$floor['on'].', which stands on a floor carried by itself';
                    break;
                }
                $seen[$nextId] = true;
                $current = $floorsById[$nextId];
            }
        }

        return $errors;
    }

    /**
     * @param  array<string, mixed>  $spec
     * @param  list<string>  $errors
     * @return list<mixed>
     */
    private static function listOf(array $spec, string $key, array &$errors, bool $required = true): array
    {
        $list = $spec[$key] ?? null;
        if ($list === null && ! $required) {
            return [];
        }
        if (! is_array($list) || ! array_is_list($list) || ($required && $list === [])) {
            $errors[] = "{$key}: expected a ".($required ? 'non-empty ' : '').'list';

            return [];
        }

        return $list;
    }

    /**
     * @param  list<mixed>  $list
     * @param  list<string>  $errors
     * @return array<string, array<string, mixed>>
     */
    private static function indexById(array $list, string $key, array &$errors): array
    {
        $byId = [];
        foreach ($list as $i => $entry) {
            $id = is_array($entry) ? ($entry['id'] ?? null) : null;
            if (! is_string($id) || ! preg_match(self::ID, $id)) {
                $errors[] = "{$key}[{$i}].id: expected a readable id like \"sailor_1\" or \"boat.deck\"";
            } elseif (isset($byId[$id])) {
                $errors[] = "{$key}[{$i}].id: \"{$id}\" is used twice";
            } else {
                $byId[$id] = $entry;
            }
        }

        return $byId;
    }

    private static function isNumber(mixed $value): bool
    {
        return (is_int($value) || is_float($value)) && is_finite((float) $value);
    }

    private static function isVector(mixed $value, int $size): bool
    {
        return is_array($value) && array_is_list($value) && count($value) === $size
            && array_filter($value, self::isNumber(...)) === $value;
    }
}
