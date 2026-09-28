<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Where a library picture lives on Cloudinary once a lesson has used it. Lessons point at this URL
 * instead of a copy on our own disk, and the picture itself no longer has to live in git.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('svg_assets', function (Blueprint $table) {
            $table->string('cdn_url', 512)->nullable()->after('svg_path');
        });
    }

    public function down(): void
    {
        Schema::table('svg_assets', function (Blueprint $table) {
            $table->dropColumn('cdn_url');
        });
    }
};
