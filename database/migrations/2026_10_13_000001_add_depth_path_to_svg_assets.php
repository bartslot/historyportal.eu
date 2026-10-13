<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A backdrop's depth map on the public disk (php artisan art:depth, stored by icons:import): an
 * 8-bit grayscale <name>.depth.webp, near = white. Null for every picture without one.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('svg_assets', function (Blueprint $table) {
            $table->string('depth_path')->nullable()->after('svg_path');
        });
    }

    public function down(): void
    {
        Schema::table('svg_assets', function (Blueprint $table) {
            $table->dropColumn('depth_path');
        });
    }
};
