<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Where the teacher put each scene on the story map, the editor's node view of a branching story
 * (Bart, 2026-11-24). Editor layout only, never lesson content: it is not versioned, the player never reads it,
 * and null means "lay it out for me". {scenes: {id: [x, y]}, choices: {id: [x, y]}}.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->json('story_map')->nullable()->after('script_review');
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->dropColumn('story_map');
        });
    }
};
