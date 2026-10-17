<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Index every foreign key column that had no index (infra audit 2026-10-17, opus.8). Postgres does
 * not index FK columns by itself, so every leaderboard poll, race poll and cascading delete was a
 * full scan. The list is the pg_constraint query in the audit, run against the full schema.
 */
return new class extends Migration
{
    /** @var array<string, list<string>> table => FK columns */
    private const KEYS = [
        'avatar_teacher_feedback' => ['teacher_id'],
        'avatar_voice_samples' => ['avatar_id'],
        'classroom_lessons' => ['lesson_id'],
        'classroom_student' => ['student_id'],
        'classrooms' => ['teacher_id'],
        'curriculum_goals' => ['parent_id'],
        'fal_ledger' => ['lesson_id'],
        'generation_runs' => ['lesson_id'],
        'lesson_feedback' => ['teacher_id'],
        'lesson_team_members' => ['student_id', 'team_id'],
        'lesson_teams' => ['classroom_id', 'lesson_id'],
        'lessons' => ['avatar_id', 'story_id', 'strategy_game_id'],
        'narration_credits' => ['lesson_id'],
        'quiz_answers' => ['quiz_question_id'],
        'quiz_questions' => ['lesson_id', 'scene_id'],
        'quiz_scores' => ['classroom_member_id', 'quiz_scene_id'],
        'race_runs' => ['lesson_id', 'scene_id'],
        'race_teams' => ['race_run_id'],
        'scenes' => ['animation_clip_id', 'strategy_game_id'],
        'stories' => ['created_by', 'reviewed_by'],
        'story_sources' => ['story_id'],
        'student_progress' => ['lesson_id'],
        'territory_reports' => ['user_id'],
        'test_sessions' => ['user_id'],
    ];

    public function up(): void
    {
        foreach (self::KEYS as $table => $columns) {
            if (! Schema::hasTable($table)) {
                continue;
            }
            foreach ($columns as $column) {
                if (Schema::hasColumn($table, $column) && ! Schema::hasIndex($table, [$column])) {
                    Schema::table($table, fn (Blueprint $t) => $t->index($column, "{$table}_{$column}_fk_index"));
                }
            }
        }
    }

    public function down(): void
    {
        foreach (self::KEYS as $table => $columns) {
            foreach ($columns as $column) {
                if (Schema::hasTable($table) && Schema::hasIndex($table, "{$table}_{$column}_fk_index")) {
                    Schema::table($table, fn (Blueprint $t) => $t->dropIndex("{$table}_{$column}_fk_index"));
                }
            }
        }
    }
};
