<?php

declare(strict_types=1);

namespace App\Services\OfflineSync;

use App\Models\Lesson;
use App\Models\QuizQuestion;
use App\Models\Scene;
use Illuminate\Database\Eloquent\Model;

/**
 * Which columns a lesson taken offline carries back, and the fingerprint that tells whether they changed.
 *
 * A pull copies every column, so the copy plays and looks the same offline. A push sends back only what
 * the editor writes. Left out, and never overwritten on the live site:
 *  - what jobs write (narration, upscales, World Labs, generation status): a narration that finished while
 *    the teacher was away is kept, and its arrival is not a conflict, because it is not in the fingerprint;
 *  - ownership, the lesson code, publishing: those stay online decisions;
 *  - ids of rows in other tables (an animation clip, a strategy game, a story): they differ per machine.
 *
 * The fingerprint is only ever compared with one made on the same database (live with live, laptop with
 * laptop), and is normalised anyway, so key order and 1 vs 1.0 never count as a change.
 */
final class SyncFields
{
    /** Scene columns a job, the server or another table owns. */
    private const SCENE_KEPT = [
        'lesson_id', 'order',
        'status', 'upscale_status', 'error_message',
        'audio_path', 'audio_alignment', 'audio_script_hash', 'audio_locale', 'audio_provider', 'audio_voice', 'duration_seconds',
        'skybox_candidates',
        'world_labs_status', 'world_labs_operation_id', 'world_pano_path', 'world_spz_path', 'world_glb_path', 'world_semantics',
        'animation_clip_id', 'strategy_game_id',
    ];

    /** Lesson columns a job, the server, the owner's own decisions or another table owns. */
    private const LESSON_KEPT = [
        'teacher_id', 'lesson_code', 'translation_group',
        'status', 'is_public', 'scheduled_publish_at', 'error_message', 'generation_attempts', 'wizard_step',
        'game_pack_path', 'import_report',
        'audio_path', 'intel_drop_audio_path', 'portrait_path', 'visemes_path', 'audio_3d_path', 'blendshapes_path', 'duration_seconds',
        'avatar_id', 'strategy_game_id', 'story_id',
    ];

    /** Columns that hold the id of a row in another table: kept on a pull only when that row exists here. */
    public const SCENE_FOREIGN = ['animation_clip_id' => 'animation_clips', 'strategy_game_id' => 'strategy_games'];

    public const LESSON_FOREIGN = ['avatar_id' => 'avatars', 'strategy_game_id' => 'strategy_games', 'story_id' => 'stories'];

    /** Columns a pull leaves alone on the laptop's copy. */
    public const LESSON_LOCAL = ['teacher_id', 'lesson_code', 'translation_group', 'is_public', 'scheduled_publish_at'];

    /** @return list<string> */
    public static function scenePushed(): array
    {
        return array_values(array_diff((new Scene)->getFillable(), self::SCENE_KEPT));
    }

    /** @return list<string> */
    public static function lessonPushed(): array
    {
        return array_values(array_diff((new Lesson)->getFillable(), self::LESSON_KEPT));
    }

    /** @return list<string> */
    public static function questionFields(): array
    {
        return array_values(array_diff((new QuizQuestion)->getFillable(), ['lesson_id', 'scene_id']));
    }

    /** @return array<string, mixed> */
    public static function pick(Model $model, array $columns): array
    {
        $out = [];
        foreach ($columns as $column) {
            $out[$column] = $model->getAttribute($column);
        }

        return $out;
    }

    /**
     * A scene's quiz questions, or the lesson's own pool (scene null), in their running order.
     *
     * @return list<array<string, mixed>>
     */
    public static function questions(Lesson $lesson, ?Scene $scene): array
    {
        return QuizQuestion::query()->where('lesson_id', $lesson->id)
            ->when($scene, fn ($q) => $q->where('scene_id', $scene->id), fn ($q) => $q->whereNull('scene_id'))
            ->orderBy('order')->orderBy('id')->get()
            ->map(fn (QuizQuestion $q) => self::pick($q, self::questionFields()))
            ->all();
    }

    /**
     * The questions of a scene (or the lesson's pool, scene null) become $rows, row by row: existing rows are
     * updated in place, so the answers classes already gave stay linked to their question.
     *
     * @param  list<array<string, mixed>>  $rows
     */
    public static function writeQuestions(Lesson $lesson, ?Scene $scene, array $rows): void
    {
        $existing = QuizQuestion::query()->where('lesson_id', $lesson->id)
            ->when($scene, fn ($q) => $q->where('scene_id', $scene->id), fn ($q) => $q->whereNull('scene_id'))
            ->orderBy('order')->orderBy('id')->get()->values();
        $allowed = array_flip(self::questionFields());
        foreach (array_values($rows) as $i => $row) {
            $row = array_intersect_key((array) $row, $allowed);
            isset($existing[$i])
                ? $existing[$i]->forceFill($row)->save()
                : (new QuizQuestion)->forceFill($row + ['lesson_id' => $lesson->id, 'scene_id' => $scene?->id])->save();
        }
        $existing->slice(count($rows))->each->delete();
    }

    /**
     * The lesson's scenes numbered 1..n in $order, the ones it does not name after them in their own order.
     * Two passes because (lesson_id, order) is unique (Step3SceneConfigurator::renumberScenes).
     *
     * @param  list<int>  $order
     */
    public static function renumber(Lesson $lesson, array $order): void
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

    /** What a scene says, as the push sends it. @return array{fields: array<string, mixed>, questions: list<array<string, mixed>>} */
    public static function scenePayload(Scene $scene, Lesson $lesson): array
    {
        return ['fields' => self::pick($scene, self::scenePushed()), 'questions' => self::questions($lesson, $scene)];
    }

    /**
     * What the lesson says around its scenes. `order` lists the scene ids in running order.
     *
     * @return array{fields: array<string, mixed>, questions: list<array<string, mixed>>, order: list<int>}
     */
    public static function lessonPayload(Lesson $lesson): array
    {
        return [
            'fields' => self::pick($lesson, self::lessonPushed()),
            'questions' => self::questions($lesson, null),
            'order' => $lesson->scenes()->ordered()->pluck('id')->map(fn ($id) => (int) $id)->all(),
        ];
    }

    public static function hash(mixed $payload): string
    {
        return sha1((string) json_encode(self::normalise($payload), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    }

    /** Keys sorted, whole numbers as integers, numeric strings as numbers, dates as ISO strings. */
    public static function normalise(mixed $value): mixed
    {
        if ($value instanceof \DateTimeInterface) {
            return $value->format(DATE_ATOM);
        }
        if ($value instanceof \BackedEnum) {
            return $value->value;
        }
        if (is_array($value)) {
            $out = array_map([self::class, 'normalise'], $value);
            if (! array_is_list($out)) {
                ksort($out);
            }

            return $out;
        }
        if (is_string($value) && is_numeric($value) && trim($value) === $value) {
            $value = $value + 0;
        }
        if (is_float($value) && is_finite($value) && floor($value) === $value && abs($value) < PHP_INT_MAX) {
            return (int) $value;
        }

        return $value;
    }
}
