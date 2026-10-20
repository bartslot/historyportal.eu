<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The predict moment (scene kind=game, game_type=predict): a typed prediction and a typed WHY, from
 * a pupil on their own device or from the teacher typing the class's (or a team's) answer on the
 * board. Paper mode stores nothing. Only the WHY is graded (JEV), and gets feedback (a small model).
 *
 * A pupil is a pseudonymous child id, stable for one pupil session; names never leave our database.
 * Kept one school year (PredictionAnswer::RETENTION_DAYS, model:prune). The row is a SNAPSHOT: the
 * question and the text as answered, so editing the moment later never rewrites a past answer.
 *
 * Also: classrooms.devices_mode, the board's answer to "Devices in class?", remembered per class.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prediction_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scene_id')->constrained()->cascadeOnDelete();
            $table->foreignId('classroom_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('classroom_member_id')->nullable()->constrained()->cascadeOnDelete();
            $table->string('child_id', 32);
            // sha256 of the browser's run token: only that browser reads its feedback back.
            $table->string('session_hash', 64)->index();
            $table->string('answerer', 10);          // pupil | class | team
            $table->string('label', 40)->nullable(); // "Team 2", or the pupil's own name (teacher view only)
            $table->string('phase', 10);             // predict | why
            $table->string('question', 300);
            $table->string('text', 300);
            $table->string('status', 12)->default('pending'); // pending | graded | flagged | failed | saved
            $table->unsignedTinyInteger('level')->nullable();
            $table->json('concepts')->nullable();
            $table->string('misconception', 200)->nullable();
            $table->float('confidence')->nullable();
            $table->text('feedback')->nullable();
            $table->string('model', 80)->nullable();
            $table->timestamp('graded_at')->nullable();
            $table->unsignedTinyInteger('teacher_override')->nullable();
            $table->timestamps();

            $table->index(['lesson_id', 'scene_id']);
            $table->index('created_at');
        });

        Schema::table('classrooms', function (Blueprint $table) {
            $table->string('devices_mode', 12)->nullable()->after('is_active');
        });
    }

    public function down(): void
    {
        Schema::table('classrooms', function (Blueprint $table) {
            $table->dropColumn('devices_mode');
        });
        Schema::dropIfExists('prediction_answers');
    }
};
