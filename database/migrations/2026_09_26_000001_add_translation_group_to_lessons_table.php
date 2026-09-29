<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Links sibling lessons that are the same lesson written in different languages (first case:
 * Dante in it/en/nl/de). A lesson without a group has none — this is opt-in, not every lesson's
 * `language` gains a sibling.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table): void {
            $table->string('translation_group', 64)->nullable()->after('language')->index();
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table): void {
            $table->dropColumn('translation_group');
        });
    }
};
