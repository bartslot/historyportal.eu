<?php

declare(strict_types=1);

namespace App\Services\Stage25d;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\Narrator;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;

/**
 * An autonomous lesson (lesson.json after the director ran) as real Lesson + Scene rows.
 *
 * Every story scene becomes a `stage25d` scene whose config.stage25d is the director's scene, field for
 * field, so the editor, the player and an export back to lesson.json all read the same shape. The narrator
 * is the only voice: its recording is the scene's audio, balloons are silent timed layers (config.lines).
 * A quiz interaction becomes the lesson's normal quiz scene right after; meter and choice cards are not
 * mapped yet and are reported, never dropped silently.
 *
 * Re-running with the same lesson id finds the lesson by topic `25d:<id>`; without $force it refuses,
 * because a rebuild throws away what a teacher changed.
 */
final class LessonImporter
{
    public const TOPIC_PREFIX = '25d:';

    /** Fields of the director's scene that the stage reads; the rest stays in the lesson file. */
    private const STAGE_FIELDS = ['set', 'figures', 'camera', 'camera_more', 'motion', 'sound', 'narration_at_s', 'dur_s', 'beat'];

    /**
     * @param  array<string,mixed>  $lesson  the directed lesson
     * @param  string  $audioRoot  folder the scenes' `audio` ("hunebedden/sc01.mp3") is relative to; null = no narration
     * @return array{lesson_id:?int,topic:string,scenes:int,audio:int,balloons:int,quizzes:int,keys:int,skipped:list<string>,warnings:list<string>}
     */
    public function import(array $lesson, User $teacher, ?string $audioRoot = null, bool $force = false, bool $dryRun = false): array
    {
        $id = (string) ($lesson['id'] ?? throw new InvalidArgumentException('lesson.json needs an id.'));
        $bundle = (string) ($lesson['bundle'] ?? throw new InvalidArgumentException('lesson.json needs a bundle.'));
        LibraryBundle::assertName($bundle);
        if (! is_array($lesson['scenes'] ?? null) || $lesson['scenes'] === []) {
            throw new InvalidArgumentException('lesson.json has no scenes.');
        }
        $topic = self::TOPIC_PREFIX.$id;
        $report = ['lesson_id' => null, 'topic' => $topic, 'scenes' => 0, 'audio' => 0, 'balloons' => 0, 'quizzes' => 0, 'keys' => 0, 'skipped' => [], 'warnings' => []];

        $existing = Lesson::withTrashed()->where('teacher_id', $teacher->id)->where('topic', $topic)->first();
        if ($existing && ! $force && ! $dryRun) {
            throw new InvalidArgumentException("Lesson {$existing->id} already imports {$id}; --force rebuilds its scenes and discards edits.");
        }

        $run = function () use ($lesson, $teacher, $audioRoot, $topic, $bundle, $existing, $dryRun, &$report): void {
            $row = $dryRun ? new Lesson : $this->lessonRow($lesson, $teacher, $topic, $existing);
            if (! $dryRun && $existing) {
                $stale = $row->scenes()->pluck('id');
                $row->quizQuestions()->delete();
                $row->scenes()->withTrashed()->forceDelete();
                foreach ($stale as $sceneId) {
                    Storage::disk('public')->deleteDirectory("lessons/{$row->id}/scenes/{$sceneId}");
                }
            }
            $report['lesson_id'] = $row->id;
            $order = 0;
            $quizIndex = 0;
            foreach ($lesson['scenes'] as $s) {
                $scene = $this->storyScene($row, $s, $order++, $bundle, (string) ($lesson['lang'] ?? 'en'), $audioRoot, $dryRun, $report, (array) ($lesson['narration'] ?? []));
                $report['scenes']++;
                $this->interaction($row, $s, $scene, $order, $quizIndex, $dryRun, $report);
            }
            if (! $dryRun) {
                $row->update(['status' => LessonStatus::Draft]);
            }
        };
        $dryRun ? $run() : DB::transaction($run);

        return $report;
    }

    /** @param  array<string,mixed>  $lesson */
    private function lessonRow(array $lesson, User $teacher, string $topic, ?Lesson $existing): Lesson
    {
        $row = $existing ?? new Lesson;
        $row->fill([
            'teacher_id' => $teacher->id,
            'title' => (string) ($lesson['title'] ?? $lesson['id']),
            'topic' => $topic,
            'details' => $lesson['teacher'] ?? null,
            'subject' => 'history',
            'language' => (string) ($lesson['lang'] ?? 'en'),
            'grade_level' => (string) ($lesson['level'] ?? '6'),
            'tone' => 'storytelling',
            'source_mode' => 'internet',
            'include_game' => true,
            'game_type' => 'quiz',
            'status' => LessonStatus::Draft,
        ]);
        // The narrator the lesson was read by (narrate.py's ElevenLabs voice), so a re-narration in the editor
        // uses the same voice. Named by slug: ids differ between installs.
        if ($slug = $lesson['narrator']['slug'] ?? null) {
            $row->avatar_id = Narrator::where('slug', (string) $slug)->value('id')
                ?? throw new InvalidArgumentException("lesson.json names narrator '{$slug}', which does not exist.");
        }
        if ($existing?->trashed()) {
            $existing->restore();
        }
        $row->save();

        return $row;
    }

    /**
     * @param  array<string,mixed>  $s
     * @param  array<string,mixed>  $report
     * @param  array<string,mixed>  $narration  lesson.narration: the provider and voice that read the recordings
     */
    private function storyScene(Lesson $lesson, array $s, int $order, string $bundle, string $lang, ?string $audioRoot, bool $dryRun, array &$report, array $narration = []): Scene
    {
        $script = trim((string) ($s['narration'] ?? ''));
        $stage = ['id' => (string) ($s['id'] ?? "s{$order}"), 'bundle' => (string) ($s['bundle'] ?? $bundle)];
        foreach (self::STAGE_FIELDS as $f) {
            if (array_key_exists($f, $s)) {
                $stage[$f] = $s[$f];
            }
        }
        // The director's figure tracks become keys on the figure's own layer, the shape the editor and the stage read.
        [$stage, $motion] = LayerKeys::fromMotion($stage);
        // ...and every picture on the ground has its distance in metres, as the editor drags it.
        [$stage] = GroundDistance::fill($stage);
        $report['keys'] += $motion['converted'];

        // Balloon times are scene times; the editor and the player read them on the narration's clock (it starts
        // narration_at_s into the scene), and the stage adds that lead back. A speaker with a painted figure layer
        // gets the figure's stage handle, so the tail points at its head (BalloonLayer, stage25d:<char>).
        $lead = (float) ($s['narration_at_s'] ?? 0);
        $faces = collect((array) ($s['figures'] ?? []))->keyBy('char');
        $drawn = collect((array) ($s['set']['layers'] ?? []))->pluck('figure')->filter()->all();
        $lines = collect((array) ($s['balloons'] ?? []))->map(function ($b) use ($lead, $faces, $drawn) {
            $char = (string) ($b['char'] ?? '');
            $start = max(0.0, round((float) ($b['at_s'] ?? 0) - $lead, 2));

            return [
                'speaker' => $char,
                'text' => (string) ($b['text'] ?? ''),
                'start' => $start,
                'end' => isset($b['dur_s']) ? round($start + (float) $b['dur_s'], 2) : null,
                'figure' => in_array($char, $drawn, true)
                    ? ['asset_id' => 'stage25d:'.$char, 'mouth' => [0.5, 0.3], 'facing' => ($faces[$char]['facing'] ?? 'right') === 'left' ? -1 : 1]
                    : null,
            ];
        })->filter(fn ($l) => $l['text'] !== '')->values()->all();
        $report['balloons'] += count($lines);

        $scene = new Scene([
            'lesson_id' => $lesson->id,
            'order' => $order,
            'kind' => 'stage25d',
            'script_segment' => $script,
            'location' => $s['where_when'] ?? null,
            'chapter_name' => $s['chapter'] ?? null,
            'duration_seconds' => (int) ceil(max((float) ($s['dur_s'] ?? 0), (float) ($s['tts_s'] ?? 0), 3.0)),
            'status' => 'ready',
            'config' => ['stage25d' => $stage] + ($lines ? ['lines' => $lines] : []),
        ]);
        if ($dryRun) {
            $report['audio'] += $this->recording($audioRoot, $s) !== null ? 1 : 0;

            return $scene;
        }
        $scene->save();
        $src = $this->recording($audioRoot, $s);
        if ($src !== null) {
            $path = "lessons/{$lesson->id}/scenes/{$scene->id}/narration.".pathinfo($src, PATHINFO_EXTENSION);
            Storage::disk('public')->put($path, (string) file_get_contents($src));
            // provenance: who read it (narrate.py writes lesson.narration), so a downgrade check has something to compare
            $scene->update(['audio_path' => $path, 'audio_script_hash' => sha1($script), 'audio_locale' => $lang,
                'audio_provider' => $narration['provider'] ?? null, 'audio_voice' => $narration['voice'] ?? null]);
            $report['audio']++;
        } elseif ($script !== '' && $audioRoot !== null) {
            $report['warnings'][] = "{$stage['id']}: no recording at {$audioRoot}/".($s['audio'] ?? '?');
        }

        return $scene;
    }

    /** @param  array<string,mixed>  $s */
    private function recording(?string $root, array $s): ?string
    {
        if ($root === null || empty($s['audio']) || str_contains((string) $s['audio'], '..')) {
            return null;
        }
        $file = rtrim($root, '/').'/'.$s['audio'];

        return is_file($file) ? $file : null;
    }

    /**
     * @param  array<string,mixed>  $s
     * @param  array<string,mixed>  $report
     */
    private function interaction(Lesson $lesson, array $s, Scene $after, int &$order, int &$quizIndex, bool $dryRun, array &$report): void
    {
        $i = $s['interaction'] ?? null;
        if (! is_array($i)) {
            return;
        }
        $type = (string) ($i['type'] ?? '');
        $options = array_values((array) ($i['options'] ?? []));
        if ($type !== 'quiz' || count($options) < 2) {
            $report['skipped'][] = "{$s['id']}: {$type} interaction (not mapped yet)";

            return;
        }
        $report['quizzes']++;
        if ($dryRun) {
            $order++;

            return;
        }
        $quiz = $lesson->scenes()->create([
            'order' => $order++,
            'kind' => 'game',
            'game_type' => 'quiz',
            'game_segment_index' => $quizIndex++,
            'quiz_question_count' => 1,
            'quiz_timing' => 'after',
            'duration_seconds' => max(30, (int) ($i['est_s'] ?? 60)),
            'background_color' => '#0f172a',
            'status' => 'ready',
            'config' => ['quiz_scope' => 'taught', 'quiz_shuffle' => 'per_player', 'quiz_difficulty' => 2],
        ]);
        $lesson->quizQuestions()->create([
            'scene_id' => $quiz->id,
            'order' => 0,
            'question' => (string) ($i['question'] ?? ''),
            'options' => $options,
            'correct_index' => (int) ($i['correct'] ?? 0),
            'asks_ahead' => false,
            'explanation' => $i['explain'] ?? null,
            'points' => 10,
        ]);
    }
}
