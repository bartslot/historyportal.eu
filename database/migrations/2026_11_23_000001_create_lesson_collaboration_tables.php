<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Several accounts on one lesson (Bart, 2026-11-23: "Multiple accounts on 1 lesson. seeing what the other
 * person is doing, take over scene. only 1 account on 1 scene.").
 *
 * - lesson_editors: who besides the owner may open the editor. The owner adds them by email.
 * - lesson_presences: one row per person with the editor open, refreshed by the editor's ping every few
 *   seconds; a row that has not been refreshed for a while is somebody who closed the tab.
 * - lesson_claims: who holds which part of the lesson ("scene:12", "title"). One holder per target; a
 *   claim that stops being refreshed lapses, so a closed laptop never locks a scene for good.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_editors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['lesson_id', 'user_id']);
        });

        Schema::create('lesson_presences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('target', 40)->nullable();
            $table->timestamp('seen_at');
            $table->unique(['lesson_id', 'user_id']);
        });

        Schema::create('lesson_claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('target', 40);
            $table->timestamp('seen_at');
            $table->unique(['lesson_id', 'target']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_claims');
        Schema::dropIfExists('lesson_presences');
        Schema::dropIfExists('lesson_editors');
    }
};
