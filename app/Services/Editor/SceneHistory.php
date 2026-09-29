<?php

declare(strict_types=1);

namespace App\Services\Editor;

use App\Models\Scene;

/**
 * Undo and redo for the scene editor (Bart, 2026-09-29: Cmd-Z did nothing on a scene).
 *
 * Every edit a teacher makes on a scene ends up in its `config` or `shots` (texts, artwork layers,
 * keyframes, the diorama), and every one of those saves goes through the model, so the Scene
 * `updating` hook is the one place that sees them all. It keeps what the scene looked like BEFORE,
 * per scene, in the teacher's session: nothing is stored in the lesson, and nothing outside the
 * editor (an agent import, a job) is recorded, because only the editor switches recording on.
 */
final class SceneHistory
{
    /** Steps kept per scene. */
    public const DEPTH = 30;

    /** Saves this close together are one step: a drag or a burst of typing undoes in one go. */
    public const MERGE_SECONDS = 1.5;

    /** The columns an edit changes. */
    private const FIELDS = ['config', 'shots'];

    private static bool $applying = false;

    /** Turn recording on for this request (the editor does, in its boot hook). */
    public static function enable(): void
    {
        app()->instance(self::class.'.on', true);
    }

    /** Called from Scene::updating: remember the state before this save. */
    public static function remember(Scene $scene): void
    {
        if (self::$applying || ! app()->bound(self::class.'.on') || ! $scene->isDirty(self::FIELDS)) {
            return;
        }
        $history = self::load($scene->id);
        $now = now()->getTimestampMs() / 1000;
        if ($history['undo'] === [] || $now - $history['at'] > self::MERGE_SECONDS) {
            $history['undo'][] = self::stateOf($scene, original: true);
            $history['undo'] = array_slice($history['undo'], -self::DEPTH);
        }
        $history['redo'] = [];                                  // a new edit ends the redo trail
        $history['at'] = $now;
        self::store($scene->id, $history);
    }

    /** Take the last step back. False when there is nothing to undo. */
    public static function undo(Scene $scene): bool
    {
        return self::step($scene, 'undo', 'redo');
    }

    /** Put back what the last undo took. False when there is nothing to redo. */
    public static function redo(Scene $scene): bool
    {
        return self::step($scene, 'redo', 'undo');
    }

    private static function step(Scene $scene, string $from, string $to): bool
    {
        $history = self::load($scene->id);
        $state = array_pop($history[$from]);
        if ($state === null) {
            return false;
        }
        $history[$to][] = self::stateOf($scene, original: false);
        $history['at'] = 0.0;                                   // the next edit is its own step
        self::store($scene->id, $history);

        self::$applying = true;
        try {
            $scene->fill($state)->save();
        } finally {
            self::$applying = false;
        }

        return true;
    }

    /** @return array<string, mixed> */
    private static function stateOf(Scene $scene, bool $original): array
    {
        return collect(self::FIELDS)
            ->mapWithKeys(fn (string $field) => [$field => $original ? $scene->getOriginal($field) : $scene->getAttribute($field)])
            ->all();
    }

    /** @return array{undo: list<array<string, mixed>>, redo: list<array<string, mixed>>, at: float} */
    private static function load(int $sceneId): array
    {
        return session()->get(self::key($sceneId), ['undo' => [], 'redo' => [], 'at' => 0.0]);
    }

    /** @param array{undo: list<array<string, mixed>>, redo: list<array<string, mixed>>, at: float} $history */
    private static function store(int $sceneId, array $history): void
    {
        session()->put(self::key($sceneId), $history);
    }

    private static function key(int $sceneId): string
    {
        return "scene_history.{$sceneId}";
    }
}
