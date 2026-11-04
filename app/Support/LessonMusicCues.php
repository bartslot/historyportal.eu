<?php

declare(strict_types=1);

namespace App\Support;

/**
 * The lesson's music list ("this track from scene 1, that one from scene 15") read from and written
 * to scenes.music. No second store: a row is a scene with a mix of its own, and every scene after
 * it keeps "Continue from scene before" until the next row. So a per-scene edit shows up in the list
 * by itself, and the list never needs syncing.
 *
 * A row's track is the first layer of that scene's mix; null = silence from that scene on. `origin` is
 * the scene the row's mix was read from, so moving a row to another scene takes its mix along.
 */
final class LessonMusicCues
{
    /**
     * @param  list<array{id: int, music: ?array}>  $scenes  in lesson order
     * @return list<array{scene: int, track_id: ?int, layers: int, origin: int}>
     */
    public static function rows(array $scenes): array
    {
        $rows = [];
        foreach (array_values($scenes) as $i => $scene) {
            if ($scene['music'] !== null) {
                $layers = $scene['music']['layers'] ?? [];
                $rows[] = ['scene' => $i + 1, 'track_id' => isset($layers[0]) ? (int) $layers[0]['track_id'] : null, 'layers' => count($layers), 'origin' => $i + 1];
            }
        }

        return $rows;
    }

    /**
     * The scenes.music each scene needs for `rows`, only for scenes that change. A row that keeps its
     * scene and first track keeps the scene's own mix as it is (volume, loop points, extra layers).
     *
     * @param  list<array{id: int, music: ?array}>  $scenes  in lesson order
     * @param  list<array{scene: int|string, track_id: int|string|null, origin?: int|null}>  $rows
     * @param  list<int>  $knownTrackIds
     * @return array<int, ?array> scene id → new music
     *
     * @throws \InvalidArgumentException a scene number outside the lesson, or used twice
     */
    public static function apply(array $scenes, array $rows, array $knownTrackIds): array
    {
        $scenes = array_values($scenes);
        $byScene = [];
        foreach ($rows as $row) {
            $n = (int) $row['scene'];
            if ($n < 1 || $n > count($scenes)) {
                throw new \InvalidArgumentException('scene out of range');
            }
            if (isset($byScene[$n])) {
                throw new \InvalidArgumentException('scene used twice');
            }
            $id = (int) ($row['track_id'] ?? 0);
            $origin = (int) ($row['origin'] ?? 0);
            $byScene[$n] = [
                'track' => in_array($id, $knownTrackIds, true) ? $id : null,
                'base' => $origin >= 1 && $origin <= count($scenes) ? $scenes[$origin - 1]['music'] : $scenes[$n - 1]['music'],
            ];
        }

        $changes = [];
        foreach ($scenes as $i => $scene) {
            $want = array_key_exists($i + 1, $byScene)
                ? self::mixFor($byScene[$i + 1]['base'], $byScene[$i + 1]['track'], $knownTrackIds)
                : null;
            if ($want !== $scene['music']) {
                $changes[$scene['id']] = $want;
            }
        }

        return $changes;
    }

    private static function mixFor(?array $current, ?int $trackId, array $knownTrackIds): array
    {
        $layers = $current['layers'] ?? [];
        $first = isset($layers[0]) ? (int) $layers[0]['track_id'] : null;
        if ($current !== null && $first === $trackId) {
            return $current;
        }
        $rest = array_values(array_filter(array_slice($layers, 1), fn ($l) => (int) $l['track_id'] !== $trackId));
        $music = ['layers' => $trackId === null ? [] : [['track_id' => $trackId] + SceneMusic::LAYER_DEFAULTS, ...$rest]]
            + ($current ?? []) + SceneMusic::DEFAULTS;

        return SceneMusic::normalize($music, $knownTrackIds);
    }
}
