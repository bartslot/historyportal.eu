<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What a class should learn from a lesson and how it fits the curriculum: goal, objectives, end
 * goals, canon + kerndoelen, guiding questions, FAQ. Authored in the lesson spec, shown on the
 * lesson's public page. JSON because its shape is content, not something we query on.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->json('teacher_guide')->nullable()->after('translation_group');
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->dropColumn('teacher_guide');
        });
    }
};
