<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The lesson's content version (App\Support\LessonVersion): bumped once per request that changes
 * the lesson or anything in it, shown small under the join QR, so any screen tells which state of
 * the lesson it loaded (Bart, 2026-10-17).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->unsignedInteger('content_version')->default(1)->after('updated_at');
            $table->timestamp('content_version_at')->nullable()->after('content_version');
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->dropColumn(['content_version', 'content_version_at']);
        });
    }
};
