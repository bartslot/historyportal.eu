<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * What a library picture IS and how tall the drawn thing really is (Bart, 2026-09-29). A diorama
 * stands it on the floor at that size; the description is also what a screen reader says.
 * height_m is of the drawn part only (opaque_box: [left, top, right, bottom] fractions), never the
 * transparent margin. placement: stands | sky | held | closeup | cropped.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('svg_assets', function (Blueprint $table) {
            $table->text('description')->nullable()->after('title');
            $table->string('placement', 16)->nullable()->after('description');
            $table->decimal('height_m', 7, 2)->nullable()->after('placement');
            $table->json('opaque_box')->nullable()->after('height_m');
        });
    }

    public function down(): void
    {
        Schema::table('svg_assets', function (Blueprint $table) {
            $table->dropColumn(['description', 'placement', 'height_m', 'opaque_box']);
        });
    }
};
