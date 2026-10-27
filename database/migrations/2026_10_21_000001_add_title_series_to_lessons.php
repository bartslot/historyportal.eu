<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The title poster's series (public/lesson-titles/{series}), apart from translation_group: a copy
 * keeps the poster without becoming another language of the original (Bart, 2026-10-21:
 * "everything has to have a Figma title poster"). Null reads as translation_group.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->string('title_series')->nullable()->after('translation_group');
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->dropColumn('title_series');
        });
    }
};
