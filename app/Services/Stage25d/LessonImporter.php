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
 * A branching story (lesson.game + scene.branch, validate.py check_branches) becomes the player's story
 * game: game_type story_game with game_config.meters, and per scene branch_group / branch_role. An option
 * is a run of 1-3 shots; its first shot carries branch_choice_label (from the question's labels) and
 * config.branch_effects, which StoryGameEngine applies once when the run ends.
 *
 * A map scene (`kind: map`, lesson.schema.json $defs/map) becomes a scene of kind `map`: the painted lesson map
 * (lesson-map.js) with the scene's labels, region, route and camera, narrated like a story scene and held for its
 * length (timed), so a story plays on through it. It can be a shot of a branch run like any other scene.
 *
 * Re-running with the same lesson id finds the lesson by topic `25d:<id>`; without $force it refuses,
 * because a rebuild throws away what a teacher changed.
 */
final class LessonImporter
{
    public const TOPIC_PREFIX = '25d:';

    /** The server's bounds for a story game (BuildLessonOutline, StoryGameEngine). */
    private const METER_DELTA_LIMIT = 25;

    private const METERS_MAX = 4;

    /** Fields of the director's scene that the stage reads; the rest stays in the lesson file. */
    private const STAGE_FIELDS = ['set', 'figures', 'camera', 'camera_more', 'motion', 'sound', 'narration_at_s', 'dur_s', 'beat'];

    /** A forced re-import's teacher work it keeps: each scene's time of day (set.daylight), by the scene's stage id. */
    private array $keptDaylight = [];

    /** Named regions and region polygons live here (public/map-regions), as lesson-map.js draws them. */
    private const MAP_REGIONS = 'map-regions';

    /** Label kinds the lesson map draws with a dot (focus pins); river and region names are a label only. */
    private const DOT_KINDS = ['city', 'camp'];

    /**
     * @param  array<string,mixed>  $lesson  the directed lesson
     * @param  string  $audioRoot  folder the scenes' `audio` ("hunebedden/sc01.mp3") is relative to; null = no narration
     * @return array{lesson_id:?int,topic:string,scenes:int,audio:int,balloons:int,quizzes:int,keys:int,branches:int,skipped:list<string>,warnings:list<string>}
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
        $this->keptDaylight = [];
        $report = ['lesson_id' => null, 'topic' => $topic, 'scenes' => 0, 'audio' => 0, 'balloons' => 0, 'quizzes' => 0, 'keys' => 0, 'branches' => 0, 'skipped' => [], 'warnings' => []];
        $game = $this->game($lesson['game'] ?? null);

        $existing = Lesson::withTrashed()->where('teacher_id', $teacher->id)->where('topic', $topic)->first();
        if ($existing && ! $force && ! $dryRun) {
            throw new InvalidArgumentException("Lesson {$existing->id} already imports {$id}; --force rebuilds its scenes and discards edits.");
        }

        $run = function () use ($lesson, $teacher, $audioRoot, $topic, $bundle, $existing, $dryRun, $game, &$report): void {
            $row = $dryRun ? new Lesson : $this->lessonRow($lesson, $teacher, $topic, $existing, $game);
            if (! $dryRun && $existing) {
                // the time of day a teacher gave a scene stays when the file gives it none (Bart 11-12: the Sky panel)
                $this->keptDaylight = $row->scenes()->get(['config'])
                    ->filter(fn (Scene $sc) => is_array($sc->config['stage25d']['set']['daylight'] ?? null) && isset($sc->config['stage25d']['id']))
                    ->mapWithKeys(fn (Scene $sc) => [(string) $sc->config['stage25d']['id'] => $sc->config['stage25d']['set']['daylight']])
                    ->all();
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
            $labels = [];
            $previous = null;
            foreach ($lesson['scenes'] as $s) {
                $branch = $game ? $this->branch($s, $previous, $labels, array_column($game['meters'], 'key')) : [];
                $previous = $s;
                $scene = ($s['kind'] ?? 'story') === 'map'
                    ? $this->mapScene($row, $s, $order++, (string) ($lesson['lang'] ?? 'en'), $audioRoot, $dryRun, $report, (array) ($lesson['narration'] ?? []), $branch)
                    : $this->storyScene($row, $s, $order++, $bundle, (string) ($lesson['lang'] ?? 'en'), $audioRoot, $dryRun, $report, (array) ($lesson['narration'] ?? []), $branch);
                $report['scenes']++;
                $report['branches'] += ($branch['branch_role'] ?? null) === 'question' ? 1 : 0;
                if ($branch !== [] && is_array($s['interaction'] ?? null)) {
                    // the player cannot play a quiz inside a branch: it would sit between the runs
                    $report['skipped'][] = "{$s['id']}: interaction on a branch scene (the choice is the interaction)";

                    continue;
                }
                $this->interaction($row, $s, $scene, $order, $quizIndex, $dryRun, $report);
            }
            if (! $dryRun) {
                $row->update(['status' => LessonStatus::Draft]);
            }
        };
        $dryRun ? $run() : DB::transaction($run);

        return $report;
    }

    /**
     * lesson.game as the player's game_config: meters with a key and a label, start and threshold clamped 0-100.
     * Null = no story game (no block, or no usable meter).
     *
     * @return array{meters: list<array{key:string,label:string,icon:string,start:int}>, fail_threshold:int, roles: list<mixed>}|null
     */
    private function game(mixed $raw): ?array
    {
        if (! is_array($raw)) {
            return null;
        }
        $meters = collect(is_array($raw['meters'] ?? null) ? $raw['meters'] : [])
            ->filter(fn ($m) => is_array($m) && is_string($m['key'] ?? null) && preg_match('/^[a-z][a-z0-9_]*$/', $m['key']) && trim((string) ($m['label'] ?? '')) !== '')
            ->unique('key')
            ->take(self::METERS_MAX)
            ->map(fn (array $m) => [
                'key' => $m['key'],
                'label' => trim((string) $m['label']),
                'icon' => preg_match('/^[a-z0-9-]+$/', (string) ($m['icon'] ?? '')) ? (string) $m['icon'] : '',
                'start' => max(0, min(100, (int) ($m['start'] ?? 50))),
            ])->values()->all();

        return $meters === [] ? null : [
            'meters' => $meters,
            'fail_threshold' => max(0, min(100, (int) ($raw['fail_threshold'] ?? 0))),
            'roles' => [],
        ];
    }

    /**
     * A scene's branch as Scene columns: branch_group + branch_role always; on the FIRST shot of an option run
     * also the button text (the question's labels.a / labels.b) and config.branch_effects (deltas on known
     * meters, clamped to +-25).
     *
     * @param  array<string,mixed>  $s
     * @param  array<string,mixed>|null  $previous  the scene before, to tell the first shot of a run
     * @param  array<int,array<string,string>>  $labels  group -> the question's labels, filled here
     * @param  list<string>  $meterKeys
     * @return array<string,mixed>
     */
    private function branch(array $s, ?array $previous, array &$labels, array $meterKeys): array
    {
        $b = $s['branch'] ?? null;
        $role = is_array($b) ? ($b['role'] ?? null) : null;
        if (! is_numeric($b['group'] ?? null) || ! in_array($role, ['question', 'option_a', 'option_b'], true)) {
            return [];
        }
        $group = (int) $b['group'];
        $out = ['branch_group' => $group, 'branch_role' => $role, 'branch_choice_label' => null];
        if ($role === 'question') {
            $labels[$group] = array_map('strval', (array) ($b['labels'] ?? []));

            return $out;
        }
        $before = $previous['branch'] ?? null;
        if (is_array($before) && (int) ($before['group'] ?? 0) === $group && ($before['role'] ?? null) === $role) {
            return $out; // a later shot of the run: the first one carries the choice
        }
        $label = trim($labels[$group][$role === 'option_a' ? 'a' : 'b'] ?? '');
        $out['branch_choice_label'] = $label !== '' ? $label : null;
        $effects = is_array($b['effects'] ?? null) ? $b['effects'] : [];
        $deltas = [];
        foreach ($meterKeys as $key) {
            $deltas[$key] = max(-self::METER_DELTA_LIMIT, min(self::METER_DELTA_LIMIT, is_numeric($effects['deltas'][$key] ?? null) ? (int) $effects['deltas'][$key] : 0));
        }
        $out['branch_effects'] = [
            'deltas' => $deltas,
            'consequence_line' => trim((string) ($effects['consequence_line'] ?? '')),
            'historical_note' => trim((string) ($effects['historical_note'] ?? '')),
        ];

        return $out;
    }

    /**
     * @param  array<string,mixed>  $lesson
     * @param  array<string,mixed>|null  $game  game_config for a story game
     */
    private function lessonRow(array $lesson, User $teacher, string $topic, ?Lesson $existing, ?array $game = null): Lesson
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
            'game_type' => $game ? 'story_game' : 'quiz',
            'game_config' => $game,
            'status' => LessonStatus::Draft,
        ] + ($game ? ['narrative_framework' => 'branching'] : []));
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
     * @param  array<string,mixed>  $branch  branch columns from branch(), branch_effects going into config
     */
    private function storyScene(Lesson $lesson, array $s, int $order, string $bundle, string $lang, ?string $audioRoot, bool $dryRun, array &$report, array $narration = [], array $branch = []): Scene
    {
        $script = trim((string) ($s['narration'] ?? ''));
        $stage = ['id' => (string) ($s['id'] ?? "s{$order}"), 'bundle' => (string) ($s['bundle'] ?? $bundle)];
        foreach (self::STAGE_FIELDS as $f) {
            if (array_key_exists($f, $s)) {
                $stage[$f] = $s[$f];
            }
        }
        if (! isset($stage['set']['daylight']) && is_array($stage['set'] ?? null) && isset($this->keptDaylight[$stage['id']])) {
            $stage['set']['daylight'] = $this->keptDaylight[$stage['id']];
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

        $effects = $branch['branch_effects'] ?? null;
        unset($branch['branch_effects']);
        $scene = new Scene($branch + [
            'lesson_id' => $lesson->id,
            'order' => $order,
            'kind' => 'stage25d',
            'script_segment' => $script,
            'location' => $s['where_when'] ?? null,
            'chapter_name' => $s['chapter'] ?? null,
            'duration_seconds' => (int) ceil(max((float) ($s['dur_s'] ?? 0), (float) ($s['tts_s'] ?? 0), 3.0)),
            'status' => 'ready',
            'config' => ['stage25d' => $stage] + ($lines ? ['lines' => $lines] : []) + ($effects ? ['branch_effects' => $effects] : []),
        ]);

        return $this->save($lesson, $scene, $s, $lang, $audioRoot, $dryRun, $report, $narration);
    }

    /**
     * A map scene: config in the shape the player hands renderLessonMap (lesson-player.js _playMapScene).
     * City and camp labels are focus pins (dot + name, the composer's annotations); river and region labels are
     * place names without a dot (`labels`, all shown). No camera = the map frames the pins, labels and route.
     *
     * @param  array<string,mixed>  $s
     * @param  array<string,mixed>  $report
     * @param  array<string,mixed>  $narration
     * @param  array<string,mixed>  $branch
     */
    private function mapScene(Lesson $lesson, array $s, int $order, string $lang, ?string $audioRoot, bool $dryRun, array &$report, array $narration = [], array $branch = []): Scene
    {
        $id = (string) ($s['id'] ?? "s{$order}");
        $spec = is_array($s['map'] ?? null) ? $s['map'] : [];
        $annotations = [];
        $names = [];
        foreach ((array) ($spec['labels'] ?? []) as $label) {
            $point = $this->lngLat([$label['lng'] ?? null, $label['lat'] ?? null]);
            $name = trim((string) ($label['name'] ?? ''));
            if ($point === null || $name === '') {
                $report['warnings'][] = "{$id}: map label without a name or a place on earth skipped";

                continue;
            }
            if (in_array($label['kind'] ?? 'city', self::DOT_KINDS, true)) {
                $annotations[] = ['type' => 'focus', 'lng' => $point[0], 'lat' => $point[1], 'label' => $name, 'historical' => null, 'capital' => false];
            } else {
                $names[] = ['text' => $name, 'lng' => $point[0], 'lat' => $point[1]];
            }
        }
        $route = array_values(array_filter(array_map(fn ($p) => is_array($p) ? $this->lngLat($p) : null, (array) ($spec['route'] ?? []))));
        $camera = $spec['camera'] ?? null;
        $center = is_array($camera) ? $this->lngLat((array) ($camera['center'] ?? [])) : null;
        $duration = (int) ceil(max((float) ($s['dur_s'] ?? 0), (float) ($s['tts_s'] ?? 0), (float) ($s['est_s'] ?? 0), 3.0));

        $effects = $branch['branch_effects'] ?? null;
        unset($branch['branch_effects']);
        $scene = new Scene($branch + [
            'lesson_id' => $lesson->id,
            'order' => $order,
            'kind' => 'map',
            'script_segment' => trim((string) ($s['narration'] ?? '')),
            'location' => $s['where_when'] ?? null,
            'chapter_name' => $s['chapter'] ?? null,
            'duration_seconds' => $duration,
            'status' => 'ready',
            'config' => array_filter([
                'projection' => 'mercator',
                // the story goes on by itself: the map holds for the narration, no Continue button
                'playback_mode' => 'timed',
                'hold_seconds' => $duration,
                'annotations' => $annotations,
                'labels' => $names,
                'region' => $this->region($spec['region'] ?? null, $id, $report),
                'route' => count($route) >= 2 ? $route : null,
                'camera' => $center !== null && is_numeric($camera['zoom'] ?? null)
                    ? ['center' => $center, 'zoom' => max(1.6, min(8.0, (float) $camera['zoom']))] : null,
                'fit' => $center === null ? 'labels' : null,
                'branch_effects' => $effects,
            ], fn ($v) => $v !== null && $v !== []),
        ]);

        return $this->save($lesson, $scene, $s, $lang, $audioRoot, $dryRun, $report, $narration);
    }

    /**
     * @param  array<mixed>  $p  [lng, lat]
     * @return array{0:float,1:float}|null
     */
    private function lngLat(array $p): ?array
    {
        [$lng, $lat] = array_values($p) + [null, null];
        if (! is_numeric($lng) || ! is_numeric($lat) || abs((float) $lng) > 180 || abs((float) $lat) > 85) {
            return null;
        }

        return [round((float) $lng, 4), round((float) $lat, 4)];
    }

    /**
     * The region as the map reads it: its name and the URL of its polygon in public/map-regions.
     * 'fertile-crescent' and 'fertile-crescent.geojson' name the same file; a missing file is a warning, no region.
     *
     * @param  array<string,mixed>  $report
     * @return array{name:string,url:string}|null
     */
    private function region(mixed $raw, string $id, array &$report): ?array
    {
        if (! is_array($raw)) {
            return null;
        }
        $file = preg_replace('/\.geojson$/', '', (string) ($raw['highlight'] ?? '')).'.geojson';
        if (! preg_match('/^[a-z0-9-]+\.geojson$/', $file) || ! is_file(public_path(self::MAP_REGIONS.'/'.$file))) {
            $report['warnings'][] = "{$id}: map region '".($raw['highlight'] ?? '')."' has no polygon in public/".self::MAP_REGIONS;

            return null;
        }

        return ['name' => trim((string) ($raw['name'] ?? '')), 'url' => '/'.self::MAP_REGIONS.'/'.$file];
    }

    /**
     * Save a scene and give it the narrator's recording (story and map scenes alike).
     *
     * @param  array<string,mixed>  $s
     * @param  array<string,mixed>  $report
     * @param  array<string,mixed>  $narration
     */
    private function save(Lesson $lesson, Scene $scene, array $s, string $lang, ?string $audioRoot, bool $dryRun, array &$report, array $narration): Scene
    {
        if ($dryRun) {
            $report['audio'] += $this->recording($audioRoot, $s) !== null ? 1 : 0;

            return $scene;
        }
        $scene->save();
        $script = (string) $scene->script_segment;
        $src = $this->recording($audioRoot, $s);
        if ($src !== null) {
            $path = "lessons/{$lesson->id}/scenes/{$scene->id}/narration.".pathinfo($src, PATHINFO_EXTENSION);
            Storage::disk('public')->put($path, (string) file_get_contents($src));
            // provenance: who read it (narrate.py writes lesson.narration), so a downgrade check has something to compare
            $scene->update(['audio_path' => $path, 'audio_script_hash' => sha1($script), 'audio_locale' => $lang,
                'audio_provider' => $narration['provider'] ?? null, 'audio_voice' => $narration['voice'] ?? null]);
            $report['audio']++;
        } elseif ($script !== '' && $audioRoot !== null) {
            $report['warnings'][] = ($s['id'] ?? '?').": no recording at {$audioRoot}/".($s['audio'] ?? '?');
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
            // A choice card without a branch has no player card (no dilemma/vote scene): give it a `branch` to play it.
            $report['skipped'][] = $type === 'choice'
                ? "{$s['id']}: choice interaction without a branch (the player has no dilemma card; a branch plays it)"
                : "{$s['id']}: {$type} interaction (not mapped yet)";

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
