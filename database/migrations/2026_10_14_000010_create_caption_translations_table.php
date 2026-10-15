<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Translated subtitles: one row per narration line (by the hash of its text), per language, per
 * lesson. Made once and reused by every class that plays the lesson. machine_text is what the
 * translator returned; teacher_text is the teacher's correction, which wins while it is set.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('caption_translations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->char('source_hash', 64);
            $table->string('language', 8);
            $table->text('source_text');
            $table->text('machine_text');
            $table->text('teacher_text')->nullable();
            $table->timestamps();

            $table->unique(['lesson_id', 'language', 'source_hash']);
            $table->index(['source_hash', 'language']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('caption_translations');
    }
};
