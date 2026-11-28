<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The lesson a teacher's own picture was made in (a cut-out), so the Assets panel can show a lesson its own
 * pictures first (Bart 2026-11-22: "Dante is never going to be added to a story about marco polo and vice versa").
 */
return new class extends Migration
{
    public function up(): void
    {
        // Prod already had the column (added before this migration was recorded), which stopped the
        // 2026-11-27 deploy at "Duplicate column". Skip when it is there.
        if (Schema::hasColumn('svg_assets', 'lesson_id')) {
            return;
        }

        Schema::table('svg_assets', function (Blueprint $table) {
            $table->foreignId('lesson_id')->nullable()->after('user_id')->constrained()->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('svg_assets', function (Blueprint $table) {
            $table->dropConstrainedForeignId('lesson_id');
        });
    }
};
