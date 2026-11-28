<?php

declare(strict_types=1);

namespace App\Services\OfflineSync;

use App\Models\Lesson;
use App\Models\OfflineCopy;
use App\Models\QuizQuestion;
use App\Models\Scene;
use App\Models\User;
use App\Services\Lessons\SceneIdRemap;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * The laptop's half of editing offline (Bart, 2026-11-28): a full local copy of a live lesson that the
 * laptop's own History Portal edits with every tool, and that goes back scene by scene.
 *
 * - pull(): copy the lesson and every file it points at (under MediaRefs::OFFLINE_PREFIX), and, the first
 *   time, hold its scenes on the live site. Pulling again refreshes what was not edited here; a scene edited
 *   here is left as it is, and the push will see whether it changed there too.
 * - push(): send what changed here, after uploading the files made here. A conflict comes back per scene,
 *   and the teacher answers mine / theirs / both. Once the push lands, the copy is refreshed from the live
 *   site, so both say the same again, and the scenes are released.
 */
final class LocalCopy
{
    /** @var (callable(string): void)|null */
    private $say = null;

    public function __construct(private RemoteSite $remote) {}

    /** Somewhere to report progress ("12 of 80 files"). */
    public function reporting(?callable $say): self
    {
        $this->say = $say;

        return $this;
    }

    /** @return list<array<string, mixed>> */
    public function remoteLessons(): array
    {
        return (array) ($this->remote->get('/api/v1/offline/lessons')['lessons'] ?? []);
    }

    /**
     * Copy a live lesson here, or refresh the copy. $claim holds its scenes on the live site (Take offline).
     * Returns the copy and the scenes somebody else was editing (left with them).
     *
     * @return array{copy: OfflineCopy, busy: list<string>}
     */
    public function pull(string $code, User $owner, bool $claim = true, bool $overwrite = false): array
    {
        $bundle = $this->remote->get('/api/v1/offline/lessons/'.rawurlencode($code), $claim ? ['claim' => 1] : []);
        $this->downloadMedia((array) ($bundle['media'] ?? []));

        $copy = OfflineCopy::query()->where('remote_url', $this->remote->url())->where('remote_code', $bundle['lesson']['code'])
            ->whereHas('lesson')->first();
        $copy = DB::transaction(fn () => $this->import($bundle, $copy, $owner, $overwrite));
        if ($claim) {
            $copy->forceFill(['holds_claims' => true])->save();
        }

        return ['copy' => $copy, 'busy' => (array) ($bundle['busy'] ?? [])];
    }

    /**
     * What changed here since the last sync: scene ids edited, made and deleted, and whether the lesson's own
     * settings or order changed. For the editor's "3 scenes changed" line.
     *
     * @return array{edited: list<int>, added: list<int>, deleted: list<int>, lesson: bool}
     */
    public function changes(OfflineCopy $copy): array
    {
        $lesson = $copy->lesson;
        $base = $copy->base;
        $out = ['edited' => [], 'added' => [], 'deleted' => [], 'lesson' => false];
        $alive = [];
        foreach ($lesson->scenes()->get() as $scene) {
            $alive[(int) $scene->id] = true;
            $entry = $base['scenes'][(string) $scene->id] ?? null;
            if ($entry === null) {
                $out['added'][] = (int) $scene->id;
            } elseif ($this->localHash($scene, $lesson) !== $entry['local_hash']) {
                $out['edited'][] = (int) $scene->id;
            }
        }
        foreach (array_keys($base['scenes'] ?? []) as $id) {
            if (! isset($alive[(int) $id])) {
                $out['deleted'][] = (int) $id;
            }
        }
        $out['lesson'] = SyncFields::hash(SyncFields::lessonPayload($lesson)) !== ($base['lesson']['local_hash'] ?? null);

        return $out;
    }

    /**
     * Send what changed here. $answers: laptop scene id (or "lesson") => mine | theirs | both, for the
     * conflicts a previous try reported. Returns ['conflicts' => [...]] (nothing was written there), or
     * ['pushed' => n] after the copy was refreshed and, unless $keepHolding, the scenes released.
     *
     * @param  array<int|string, string>  $answers
     * @return array<string, mixed>
     */
    public function push(OfflineCopy $copy, User $owner, array $answers = [], bool $keepHolding = false): array
    {
        $lesson = $copy->lesson ?? throw new RuntimeException('This copy has no lesson any more.');
        $base = $copy->base;
        $items = [];
        $alive = [];

        foreach ($lesson->scenes()->get() as $scene) {
            $id = (int) $scene->id;
            $alive[$id] = true;
            $entry = $base['scenes'][(string) $id] ?? null;
            $answer = $answers[$id] ?? $answers[(string) $id] ?? null;
            if (($entry !== null && $this->localHash($scene, $lesson) === $entry['local_hash']) || $answer === 'theirs') {
                continue;
            }
            $items[] = [
                'key' => $id,
                'id' => $entry['remote_id'] ?? null,
                'base' => $entry['remote_hash'] ?? null,
                'resolution' => in_array($answer, ['mine', 'both'], true) ? $answer : null,
                'status' => $scene->status,
                ...SyncFields::scenePayload($scene, $lesson),
            ];
        }
        foreach ((array) ($base['scenes'] ?? []) as $id => $entry) {
            $answer = $answers[(int) $id] ?? $answers[(string) $id] ?? null;
            if (isset($alive[(int) $id]) || $answer === 'theirs') {
                continue;
            }
            $items[] = [
                'key' => (int) $id, 'id' => $entry['remote_id'], 'base' => $entry['remote_hash'], 'deleted' => true,
                'resolution' => $answer === 'mine' ? 'mine' : null,
            ];
        }

        $lessonItem = null;
        $lessonPayload = SyncFields::lessonPayload($lesson);
        if (SyncFields::hash($lessonPayload) !== ($base['lesson']['local_hash'] ?? null) && ($answers['lesson'] ?? null) !== 'theirs') {
            $lessonItem = [
                'base' => $base['lesson']['remote_hash'],
                'resolution' => ($answers['lesson'] ?? null) === 'mine' ? 'mine' : null,
                ...$lessonPayload,
            ];
        }

        if ($items === [] && $lessonItem === null) {
            $this->finish($copy, $owner, $keepHolding, refresh: false);

            return ['pushed' => 0];
        }

        [$items, $lessonItem] = $this->uploadMedia($copy, $items, $lessonItem);

        $idMap = [];
        foreach ((array) ($base['scenes'] ?? []) as $id => $entry) {
            $idMap[(string) $id] = (int) $entry['remote_id'];
        }
        $result = $this->remote->post('/api/v1/offline/lessons/'.rawurlencode($copy->remote_code).'/push', [
            'id_map' => (object) $idMap,
            'scenes' => $items,
            'lesson' => $lessonItem,
        ]);
        if ($result['status'] === 409) {
            return ['conflicts' => (array) ($result['body']['conflicts'] ?? [])];
        }

        // Scenes made here (and "keep both" copies) now have live ids: remember them before the refresh, so
        // the refresh updates these scenes instead of adding them a second time.
        $base = $copy->base;
        foreach ((array) ($result['body']['created'] ?? []) as $local => $live) {
            $base['scenes'][(string) $local] = ['remote_id' => (int) $live, 'remote_hash' => '', 'local_hash' => ''];
        }
        $copy->forceFill(['base' => $base])->save();
        $this->finish($copy, $owner, $keepHolding, refresh: true);

        return ['pushed' => count($items) + ($lessonItem !== null ? 1 : 0)];
    }

    /** After a push: the copy says what the live lesson says again, and the scenes go back unless kept. */
    private function finish(OfflineCopy $copy, User $owner, bool $keepHolding, bool $refresh): void
    {
        if ($refresh) {
            $this->pull($copy->remote_code, $owner, claim: false, overwrite: true);
        }
        if (! $keepHolding && $copy->holds_claims) {
            $this->remote->post('/api/v1/offline/lessons/'.rawurlencode($copy->remote_code).'/release', []);
            $copy->refresh()->forceFill(['holds_claims' => false])->save();
        }
    }

    /**
     * @param  array<string, mixed>  $bundle  LiveLesson::export()
     */
    private function import(array $bundle, ?OfflineCopy $copy, User $owner, bool $overwrite): OfflineCopy
    {
        $hosts = [$this->remote->host()];
        $toOffline = fn (array $cols): array => MediaRefs::rewrite($cols, fn (string $p) => MediaRefs::toOffline($p), $hosts);
        $base = $copy?->base ?? ['lesson' => null, 'scenes' => []];
        $lesson = $copy?->lesson;
        if ($lesson === null) {
            $lesson = new Lesson;
            $lesson->forceFill(['teacher_id' => $owner->id, 'is_public' => false]);
        }
        $lessonEdited = $copy !== null && $lesson->exists
            && SyncFields::hash(SyncFields::lessonPayload($lesson)) !== ($base['lesson']['local_hash'] ?? null);
        $remoteLesson = $bundle['lesson'];

        // The lesson row first: scenes need its id. Its own columns now if they were not edited here.
        if (! $lesson->exists || $overwrite || ! $lessonEdited) {
            $cols = $this->withForeign($toOffline($remoteLesson['columns']), SyncFields::LESSON_FOREIGN);
            unset($cols['story_map']);   // names scenes: set below, once they have their ids here
            $lesson->forceFill(array_diff_key($cols, array_flip(SyncFields::LESSON_LOCAL)))->save();
        }

        $remoteToLocal = [];
        foreach ((array) $base['scenes'] as $local => $entry) {
            $remoteToLocal[(int) $entry['remote_id']] = (int) $local;
        }
        $next = (int) Scene::withTrashed()->where('lesson_id', $lesson->id)->max('order') + 1;
        $newBase = [];
        $imported = [];
        $seen = [];

        foreach ((array) $bundle['scenes'] as $row) {
            $remoteId = (int) $row['id'];
            $seen[$remoteId] = true;
            $localId = $remoteToLocal[$remoteId] ?? null;
            $scene = $localId !== null ? $lesson->scenes()->whereKey($localId)->first() : null;
            $entry = $localId !== null ? ($base['scenes'][(string) $localId] ?? null) : null;

            if ($scene !== null && $entry !== null && ! $overwrite && $entry['local_hash'] !== ''
                && $this->localHash($scene, $lesson) !== $entry['local_hash']) {
                $newBase[(string) $scene->id] = $entry;   // edited here: left alone, the push decides

                continue;
            }
            $cols = $this->withForeign($toOffline($row['columns']), SyncFields::SCENE_FOREIGN);
            unset($cols['order']);
            if ($scene === null) {
                $scene = new Scene;
                $cols += ['lesson_id' => $lesson->id, 'order' => $next++];
            }
            $scene->forceFill($cols)->save();
            $this->writeQuestions($lesson, $scene, array_map($toOffline, (array) $row['questions']));
            $newBase[(string) $scene->id] = ['remote_id' => $remoteId, 'remote_hash' => $row['hash'], 'local_hash' => ''];
            $imported[] = $scene;
        }

        // Deleted on the live site: gone here too, unless edited here (then the push asks).
        foreach ((array) $base['scenes'] as $local => $entry) {
            if (isset($seen[(int) $entry['remote_id']]) || isset($newBase[(string) $local])) {
                continue;
            }
            $scene = $lesson->scenes()->whereKey((int) $local)->first();
            if ($scene !== null && ! $overwrite && $entry['local_hash'] !== '' && $this->localHash($scene, $lesson) !== $entry['local_hash']) {
                $newBase[(string) $local] = $entry;

                continue;
            }
            $scene?->delete();
        }

        $ids = [];
        foreach ($newBase as $local => $entry) {
            $ids[(int) $entry['remote_id']] = (int) $local;
        }
        foreach ($imported as $scene) {
            $config = SceneIdRemap::config($scene->config, $ids);
            if ($config !== $scene->config) {
                $scene->forceFill(['config' => $config])->save();
            }
        }

        $lessonBase = $base['lesson'];
        if (! $lessonEdited || $overwrite) {
            $story = $toOffline(['story_map' => $remoteLesson['columns']['story_map'] ?? null])['story_map'];
            $lesson->forceFill(['story_map' => SceneIdRemap::storyMap(is_array($story) ? $story : null, $ids)])->save();
            $this->writeQuestions($lesson, null, array_map($toOffline, (array) $remoteLesson['questions']));
            $order = array_values(array_filter(array_map(fn ($r) => $ids[(int) $r] ?? null, (array) $remoteLesson['order'])));
            $this->renumber($lesson, $order);
            $lessonBase = ['remote_hash' => $remoteLesson['hash'], 'local_hash' => ''];
        } else {
            $this->renumber($lesson, $lesson->scenes()->pluck('id')->map(fn ($id) => (int) $id)->all());
        }

        // Fingerprints of what is here now, as this database stores it.
        $lesson->refresh();
        foreach ($newBase as $local => $entry) {
            if ($entry['local_hash'] === '' && ($scene = $lesson->scenes()->whereKey((int) $local)->first())) {
                $newBase[$local]['local_hash'] = $this->localHash($scene, $lesson);
            }
        }
        if ($lessonBase !== null && ($lessonBase['local_hash'] ?? '') === '') {
            $lessonBase['local_hash'] = SyncFields::hash(SyncFields::lessonPayload($lesson));
        }

        $copy ??= new OfflineCopy(['lesson_id' => $lesson->id]);

        return tap($copy->forceFill([
            'lesson_id' => $lesson->id,
            'remote_url' => $this->remote->url(),
            'remote_lesson_id' => (int) $remoteLesson['id'],
            'remote_code' => (string) $remoteLesson['code'],
            'base' => ['lesson' => $lessonBase, 'scenes' => $newBase],
            'synced_at' => now(),
        ]))->save();
    }

    /** Every file the lesson points at, copied once; a file already here with the same size is skipped. */
    private function downloadMedia(array $media): void
    {
        $disk = Storage::disk('public');
        $todo = array_values(array_filter($media, function ($m) use ($disk) {
            $target = MediaRefs::toOffline((string) $m['path']);

            return MediaRefs::isSafe((string) $m['path']) && ! ($disk->exists($target) && $disk->size($target) === (int) $m['size']);
        }));
        $failed = 0;
        foreach ($todo as $i => $m) {
            if (! $this->remote->download((string) $m['path'], $disk->path(MediaRefs::toOffline((string) $m['path'])))) {
                $failed++;
            }
            if ($this->say && ($i % 10 === 9 || $i === count($todo) - 1)) {
                ($this->say)(sprintf('%d of %d files copied', $i + 1, count($todo)));
            }
        }
        if ($failed > 0 && $this->say) {
            ($this->say)("{$failed} files could not be copied; those pictures stay blank offline.");
        }
    }

    /**
     * Files made here go up before the push; files that came from the live site just lose the offline prefix.
     *
     * @param  list<array<string, mixed>>  $items
     * @param  array<string, mixed>|null  $lessonItem
     * @return array{0: list<array<string, mixed>>, 1: array<string, mixed>|null}
     */
    private function uploadMedia(OfflineCopy $copy, array $items, ?array $lessonItem): array
    {
        $hosts = array_values(array_filter([parse_url((string) config('app.url'), PHP_URL_HOST)]));
        $all = ['items' => $items, 'lesson' => $lessonItem];
        $disk = Storage::disk('public');

        $local = [];
        foreach (MediaRefs::collect($all, $hosts) as $path) {
            if (MediaRefs::fromOffline($path) === null && MediaRefs::isSafe($path) && $disk->exists($path)) {
                $local[$path] = sha1_file($disk->path($path));
            }
        }
        $map = [];
        if ($local !== []) {
            $code = rawurlencode($copy->remote_code);
            $check = $this->remote->post("/api/v1/offline/lessons/{$code}/media/existing", [
                'files' => array_map(fn ($p, $s) => ['path' => $p, 'sha1' => $s], array_keys($local), array_values($local)),
            ]);
            $there = array_flip((array) ($check['body']['existing'] ?? []));
            $n = 0;
            foreach ($local as $path => $sha) {
                $n++;
                if (isset($there[$path])) {
                    continue;
                }
                $map[$path] = $this->remote->upload("/api/v1/offline/lessons/{$code}/media", $disk->path($path), basename($path));
                if ($this->say) {
                    ($this->say)(sprintf('%d of %d new files uploaded', $n, count($local)));
                }
            }
        }

        $all = MediaRefs::rewrite($all, fn (string $p) => $map[$p] ?? MediaRefs::fromOffline($p) ?? $p, $hosts);

        return [$all['items'], $all['lesson']];
    }

    private function localHash(Scene $scene, Lesson $lesson): string
    {
        return SyncFields::hash(SyncFields::scenePayload($scene, $lesson));
    }

    /**
     * Ids of rows in other tables only where that row exists here; otherwise empty.
     *
     * @param  array<string, mixed>  $cols
     * @param  array<string, string>  $foreign  column => table
     * @return array<string, mixed>
     */
    private function withForeign(array $cols, array $foreign): array
    {
        foreach ($foreign as $column => $table) {
            if (! empty($cols[$column]) && (! Schema::hasTable($table) || ! DB::table($table)->where('id', $cols[$column])->exists())) {
                $cols[$column] = null;
            }
        }

        return $cols;
    }

    /** @param list<array<string, mixed>> $rows */
    private function writeQuestions(Lesson $lesson, ?Scene $scene, array $rows): void
    {
        $existing = QuizQuestion::query()->where('lesson_id', $lesson->id)
            ->when($scene, fn ($q) => $q->where('scene_id', $scene->id), fn ($q) => $q->whereNull('scene_id'))
            ->orderBy('order')->orderBy('id')->get()->values();
        $allowed = array_flip(SyncFields::questionFields());
        foreach (array_values($rows) as $i => $row) {
            $row = array_intersect_key($row, $allowed);
            isset($existing[$i])
                ? $existing[$i]->forceFill($row)->save()
                : (new QuizQuestion)->forceFill($row + ['lesson_id' => $lesson->id, 'scene_id' => $scene?->id])->save();
        }
        $existing->slice(count($rows))->each->delete();
    }

    /** @param list<int> $order */
    private function renumber(Lesson $lesson, array $order): void
    {
        $alive = $lesson->scenes()->pluck('id')->map(fn ($id) => (int) $id)->all();
        $final = array_values(array_unique([...array_values(array_intersect($order, $alive)), ...array_values(array_diff($alive, $order))]));
        foreach ($final as $i => $id) {
            Scene::query()->whereKey($id)->update(['order' => -1 * ($i + 1)]);
        }
        foreach ($final as $i => $id) {
            Scene::query()->whereKey($id)->update(['order' => $i + 1]);
        }
    }
}
