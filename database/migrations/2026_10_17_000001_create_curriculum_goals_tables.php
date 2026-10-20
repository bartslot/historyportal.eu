<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The Dutch curriculum as data: kerndoelen, tijdvakken, kenmerkende aspecten and Canon windows,
 * each its own row (and public page), linked to the lessons that cover them. Coverage gaps then
 * become a query: which goals have no lesson yet (Bart, 2026-10-17).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('curriculum_goals', function (Blueprint $table) {
            $table->id();
            $table->string('type', 32);            // kerndoel | tijdvak | kenmerkend_aspect | canonvenster
            $table->string('code', 16);            // "37", "6", "6.3", "14"
            $table->string('slug')->unique();      // kerndoel-37, kenmerkend-aspect-6-3
            $table->text('title');
            $table->text('body')->nullable();      // official text where it is longer than the title
            $table->string('period')->nullable();
            $table->foreignId('parent_id')->nullable()->constrained('curriculum_goals')->cascadeOnDelete();
            $table->string('source_url')->nullable();
            $table->unsignedSmallInteger('sort')->default(0);
            $table->timestamps();

            $table->unique(['type', 'code']);
        });

        Schema::create('curriculum_goal_lesson', function (Blueprint $table) {
            $table->id();
            $table->foreignId('curriculum_goal_id')->constrained()->cascadeOnDelete();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->string('fit', 16)->default('direct'); // direct | partial
            $table->timestamps();

            $table->unique(['curriculum_goal_id', 'lesson_id']);
            $table->index('lesson_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('curriculum_goal_lesson');
        Schema::dropIfExists('curriculum_goals');
    }
};
