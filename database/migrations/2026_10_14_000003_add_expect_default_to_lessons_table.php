<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The "what you can expect" lines a lesson was composed with (its spec), kept beside the
 * teacher's own: the editor's Reset puts these back. Null for a lesson without a spec.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table): void {
            $table->json('expect_default')->nullable()->after('expect');
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table): void {
            $table->dropColumn('expect_default');
        });
    }
};
