<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A teacher's own character (Character tab): its recipe and its puppet, beside the atlas in svg_path. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('svg_assets', function (Blueprint $table) {
            $table->json('character')->nullable()->after('sheet');
        });
    }

    public function down(): void
    {
        Schema::table('svg_assets', function (Blueprint $table) {
            $table->dropColumn('character');
        });
    }
};
