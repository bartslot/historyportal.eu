<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * An animated asset (an imported image sequence): its picture is a sprite sheet of `frames` frames
 * side by side, and `anims` names the clips in it, e.g. {"walk": {"frames": [0..7], "stride_m": 1.4},
 * "wave": {"frames": [8..15], "fps": 12}}. Null for a still picture.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('svg_assets', function (Blueprint $table) {
            $table->json('sheet')->nullable()->after('opaque_box');
        });
    }

    public function down(): void
    {
        Schema::table('svg_assets', function (Blueprint $table) {
            $table->dropColumn('sheet');
        });
    }
};
