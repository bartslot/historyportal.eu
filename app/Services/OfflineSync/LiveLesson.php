<?php

declare(strict_types=1);

namespace App\Services\OfflineSync;

use App\Models\Lesson;
use App\Models\QuizQuestion;
use App\Models\Scene;
use App\Models\User;
use App\Services\Collaboration\LessonCollaboration;
use App\Services\Lessons\SceneIdRemap;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * The live site's half of editing offline (Bart, 2026-11-28): hand a lesson to a laptop, and take its
 * changes back, scene by scene.
 *
 * A scene goes back only when the live scene still says what it said when it was pulled (the fingerprint
 * in SyncFields), and nobody else holds it. Anything else is a conflict, and a push with any conflict
 * writes nothing: the laptop asks the teacher, per scene, mine / theirs / both, and pushes again with the
 * answers. "Mine" over a scene that did change keeps the replaced version as a JSON file on the private
 * disk (offline-sync-backups/), so nothing anyone made is lost.
 */
final class LiveLesson
{
    public function __construct(private LessonCollaboration $collab) {}

    /**
     * Everything the laptop needs to show and edit the lesson, with a fingerprint per scene.
     *
     * @param  list<string>  $hosts  hosts whose /storage/ URLs are this site's
     * @return array<string, mixed>
     */
    public function export(Lesson $lesson, array $hosts): array
    {
        $sceneFill = array_values(array_diff((new Scene)->getFillable(), ['lesson_id']));
        $lessonFill = array_values(array_diff((new Lesson)->getFillable(), SyncFields::LESSON_LOCAL));

        $scenes = $lesson->scenes()->get()->map(fn (Scene $scene) => [
            'id' => (int) $scene->id,
            'columns' => SyncFields::pick($scene, $sceneFill),
            'questions' => SyncFields::questions($lesson, $scene),
            'hash' => SyncFields::hash(SyncFields::scenePayload($scene, $lesson)),
        ])->all();

        $payload = SyncFields::lessonPayload($lesson);
        $data = [
            'lesson' => [
                'id' => (int) $lesson->id,
                'code' => (string) $lesson->lesson_code,
                'title' => (string) $lesson->title,
                'columns' => SyncFields::pick($lesson, $lessonFill),
                'questions' => $payload['questions'],
                'order' => $payload['order'],
                'hash' => SyncFields::hash($payload),
            ],
            'scenes' => $scenes,
        ];

        $paths = [];
        foreach ([$data['lesson'], ...$scenes] as $row) {
            foreach (MediaRefs::collect(['columns' => $row['columns'], 'questions' => $row['questions']], $hosts) as $p) {
                $paths[$p] = true;
            }
        }
        foreach ($data['lesson']['questions'] as $q) {
            foreach (MediaRefs::collect($q, $hosts) as $p) {
                $paths[$p] = true;
            }
        }
        $disk = Storage::disk('public');
        $data['media'] = collect(array_keys($paths))
            ->filter(fn (string $p) => MediaRefs::isSafe($p) && $disk->exists($p))
            ->map(fn (string $p) => ['path' => $p, 'size' => (int) $disk->size($p)])
            ->values()->all();

        return $data;
    }

    /**
     * Which of these files are already here, byte for byte. A laptop asks before uploading, so a library
     * picture it only placed is not uploaded again.
     *
     * @param  list<array{path: string, sha1: string}>  $files
     * @return list<string>  the paths that exist with that content
     */
    public function existing(array $files): array
    {
        $disk = Storage::disk('public');

        return collect($files)
            ->filter(fn (array $f) => MediaRefs::isSafe($f['path']) && $disk->exists($f['path'])
                && hash_equals(strtolower($f['sha1']), (string) sha1_file($disk->path($f['path']))))
            ->pluck('path')->values()->all();
    }

    /**
     * Apply a laptop's changes. Returns ['conflicts' => [...]] and writes nothing, or ['created' => [laptop
     * scene id => live scene id]] for the scenes it made.
     *
     * @param  array<string, mixed>  $push  see App\Http\Requests\Api\OfflinePushRequest
     * @return array<string, mixed>
     */
    public function apply(Lesson $lesson, User $user, array $push): array
    {
        $items = $push['scenes'] ?? [];
        $conflicts = [];
        $scenes = [];

        foreach ($items as $item) {
            $key = (int) $item['key'];
            $id = isset($item['id']) ? (int) $item['id'] : null;
            if ($id === null) {
                continue;
            }
            $scene = Scene::withTrashed()->where('lesson_id', $lesson->id)->whereKey($id)->first();
            $scenes[$key] = $scene;
            $resolution = $item['resolution'] ?? null;
            if ($scene === null || $scene->trashed()) {
                if (empty($item['deleted']) && $resolution === null) {
                    $conflicts[] = ['key' => $key, 'id' => $id, 'reason' => 'gone', 'title' => $this->sceneTitle($item['fields'] ?? [])];
                }

                continue;
            }
            $changed = SyncFields::hash(SyncFields::scenePayload($scene, $lesson)) !== ($item['base'] ?? null);
            $holder = $this->collab->heldByOther($lesson, $user, LessonCollaboration::sceneTarget($id));
            if (($changed || $holder !== null) && $resolution === null) {
                $conflicts[] = [
                    'key' => $key, 'id' => $id,
                    'reason' => $changed ? (! empty($item['deleted']) ? 'changed-deleted' : 'changed') : 'busy',
                    'holder' => $holder,
                    'title' => $this->sceneTitle(SyncFields::pick($scene, ['chapter_name', 'script_segment', 'kind'])),
                ];
            }
        }

        $lessonItem = $push['lesson'] ?? null;
        if (is_array($lessonItem) && ($lessonItem['resolution'] ?? null) === null
            && SyncFields::hash(SyncFields::lessonPayload($lesson)) !== ($lessonItem['base'] ?? null)) {
            $conflicts[] = ['key' => 'lesson', 'reason' => 'changed'];
        }

        if ($conflicts !== []) {
            return ['conflicts' => $conflicts];
        }

        return DB::transaction(function () use ($lesson, $push, $items, $scenes, $lessonItem): array {
            // Laptop scene id => live scene id for every scene the laptop already knew, sent or not.
            $ids = [];
            foreach ((array) ($push['id_map'] ?? []) as $local => $live) {
                $ids[(int) $local] = (int) $live;
            }
            $created = [];
            $after = [];
            $touched = [];
            $next = (int) Scene::withTrashed()->where('lesson_id', $lesson->id)->max('order') + 1;

            foreach ($items as $item) {
                $key = (int) $item['key'];
                $scene = $scenes[$key] ?? null;
                $alive = $scene !== null && ! $scene->trashed();
                $resolution = $item['resolution'] ?? null;
                $fields = array_intersect_key((array) ($item['fields'] ?? []), array_flip(SyncFields::scenePushed()));

                if (! empty($item['deleted'])) {
                    if ($alive && $resolution !== 'both') {
                        $this->backup($lesson, $scene);
                        $scene->delete();
                    }

                    continue;
                }

                if ($alive && $resolution !== 'both') {
                    if ($resolution === 'mine') {
                        $this->backup($lesson, $scene);
                    }
                    $scene->fill($fields)->save();
                    $ids[$key] = (int) $scene->id;
                } else {
                    $scene = new Scene($fields);
                    // A new scene keeps the laptop's status: a finished scene arriving as "pending" would be
                    // picked up by the generation pipeline as work still to do.
                    $scene->forceFill(['lesson_id' => $lesson->id, 'order' => $next++]
                        + (in_array($item['status'] ?? null, ['pending', 'ready', 'failed'], true) ? ['status' => $item['status']] : []))->save();
                    $ids[$key] = $created[$key] = (int) $scene->id;
                    if ($alive) {
                        $after[$scene->id] = (int) $scenes[$key]->id;  // "keep both": mine right after theirs
                    }
                }
                $this->writeQuestions($lesson, $scene, (array) ($item['questions'] ?? []));
                $touched[] = $scene;
            }

            // Choices named scenes by their laptop ids: now every one has a live id.
            foreach ($touched as $scene) {
                $config = SceneIdRemap::config($scene->config, $ids);
                if ($config !== $scene->config) {
                    $scene->forceFill(['config' => $config])->save();
                }
            }

            $current = $lesson->scenes()->pluck('id')->map(fn ($id) => (int) $id)->all();
            if (is_array($lessonItem)) {
                $fields = array_intersect_key((array) ($lessonItem['fields'] ?? []), array_flip(SyncFields::lessonPushed()));
                if (array_key_exists('story_map', $fields)) {
                    $fields['story_map'] = SceneIdRemap::storyMap(is_array($fields['story_map']) ? $fields['story_map'] : null, $ids);
                }
                $lesson->fill($fields)->save();
                $this->writeQuestions($lesson, null, (array) ($lessonItem['questions'] ?? []));
                $order = array_values(array_filter(array_map(fn ($local) => $ids[(int) $local] ?? null, (array) ($lessonItem['order'] ?? []))));
            } else {
                $order = array_values(array_diff($current, array_values($created)));
                foreach ($created as $id) {
                    $at = isset($after[$id]) ? array_search($after[$id], $order, true) : false;
                    $at === false ? $order[] = $id : array_splice($order, $at + 1, 0, [$id]);
                }
            }
            $this->renumber($lesson, $order);

            return ['created' => $created];
        });
    }

    /**
     * The live scenes numbered 1..n in $order, the ones it does not name after them in their own order. Two
     * passes because (lesson_id, order) is unique (Step3SceneConfigurator::renumberScenes).
     *
     * @param  list<int>  $order
     */
    private function renumber(Lesson $lesson, array $order): void
    {
        $alive = $lesson->scenes()->pluck('id')->map(fn ($id) => (int) $id)->all();
        $final = [...array_values(array_intersect($order, $alive)), ...array_values(array_diff($alive, $order))];
        $final = array_values(array_unique($final));
        foreach ($final as $i => $id) {
            Scene::query()->whereKey($id)->update(['order' => -1 * ($i + 1)]);
        }
        foreach ($final as $i => $id) {
            Scene::query()->whereKey($id)->update(['order' => $i + 1]);
        }
        $lesson->touch();
    }

    /**
     * The questions of a scene (or the lesson's pool) become $rows, row by row: existing rows are updated in
     * place, so the answers classes already gave stay linked to their question.
     *
     * @param  list<array<string, mixed>>  $rows
     */
    private function writeQuestions(Lesson $lesson, ?Scene $scene, array $rows): void
    {
        $existing = QuizQuestion::query()->where('lesson_id', $lesson->id)
            ->when($scene, fn ($q) => $q->where('scene_id', $scene->id), fn ($q) => $q->whereNull('scene_id'))
            ->orderBy('order')->orderBy('id')->get()->values();
        $allowed = array_flip(SyncFields::questionFields());
        foreach (array_values($rows) as $i => $row) {
            $row = array_intersect_key((array) $row, $allowed);
            if (isset($existing[$i])) {
                $existing[$i]->fill($row)->save();
            } else {
                (new QuizQuestion($row))->forceFill(['lesson_id' => $lesson->id, 'scene_id' => $scene?->id])->save();
            }
        }
        $existing->slice(count($rows))->each->delete();
    }

    /** The live version a push replaces, kept as JSON on the private disk. */
    private function backup(Lesson $lesson, Scene $scene): void
    {
        Storage::disk('local')->put(
            sprintf('offline-sync-backups/%d/scene-%d-%s.json', $lesson->id, $scene->id, now()->format('Ymd-His-u')),
            (string) json_encode([
                'scene' => $scene->getAttributes(),
                'questions' => SyncFields::questions($lesson, $scene),
            ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        );
    }

    /** A few words a person recognises a scene by. @param array<string, mixed> $fields */
    private function sceneTitle(array $fields): string
    {
        $words = trim((string) ($fields['chapter_name'] ?? '')) ?: trim(strip_tags((string) ($fields['script_segment'] ?? '')));

        return mb_strimwidth($words !== '' ? $words : (string) ($fields['kind'] ?? ''), 0, 80, '...');
    }
}
