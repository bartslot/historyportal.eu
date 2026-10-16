<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The tijdvak a library picture belongs to: a key of config('lesson-taxonomy.periods'), written by
 * icons:import from meta.json or the folder map (App\Support\LibraryEra). Null = timeless, shown
 * under every era.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('svg_assets', function (Blueprint $table) {
            $table->string('era', 40)->nullable()->after('subcategory');
        });
    }

    public function down(): void
    {
        Schema::table('svg_assets', function (Blueprint $table) {
            $table->dropColumn('era');
        });
    }
};
