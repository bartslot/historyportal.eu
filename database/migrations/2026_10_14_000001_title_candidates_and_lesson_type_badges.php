<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Title screens became an open set of candidates (App\Support\TitlePoster): title_style now holds a
 * candidate folder name ('poster', 'cover', 'banner', ...) or 'logo' / 'plain'. The old enum value
 * 'comic' is the folder 'poster' now; 'cover', 'logo' and 'plain' keep their names.
 *
 * show_lesson_types: the teacher can hide the lesson-type badges on the title screen.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table): void {
            $table->string('title_style', 64)->nullable()->change();
            $table->boolean('show_lesson_types')->default(true)->after('title_style');
        });
        DB::table('lessons')->where('title_style', 'comic')->update(['title_style' => 'poster']);
    }

    public function down(): void
    {
        DB::table('lessons')->where('title_style', 'poster')->update(['title_style' => 'comic']);
        DB::table('lessons')->whereRaw('length(title_style) > 16')->update(['title_style' => null]);
        Schema::table('lessons', function (Blueprint $table): void {
            $table->dropColumn('show_lesson_types');
            $table->string('title_style', 16)->nullable()->change();
        });
    }
};
