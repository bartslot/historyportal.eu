<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Story to video (bart, 2026-11-23): after the script is approved, a lesson gets character sheets, empty world
 * shots and one clip per narration beat, each made through ElevenLabs and checked by the teacher before the next
 * step. One row per thing made, so every item can be redone on its own and its prompt is kept for the record.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('story_media_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scene_id')->nullable()->constrained()->cascadeOnDelete();
            // character_sheet | world_shot | clip
            $table->string('kind', 32);
            // Stable key inside the lesson: the cast member's slug, "scene-{id}", or "scene-{id}-beat-{n}".
            $table->string('key');
            $table->unsignedInteger('position')->default(0);
            $table->string('label')->nullable();
            // What the item is made from: the cast entry, the scene brief, the beat's text, length and cast.
            $table->json('input')->nullable();
            // planned | queued | generating | ready | approved | failed
            $table->string('status', 16)->default('planned');
            $table->text('prompt')->nullable();
            $table->text('note')->nullable();   // the teacher's redo instruction
            $table->string('model')->nullable();
            $table->string('generation_id')->nullable();
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->json('style')->nullable();   // StyleCheck metrics + problems of the last picture
            $table->string('path')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamps();

            $table->unique(['lesson_id', 'kind', 'key']);
            $table->index(['lesson_id', 'kind', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('story_media_items');
    }
};
