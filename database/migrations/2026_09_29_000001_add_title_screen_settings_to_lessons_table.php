<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The title screen becomes something a teacher edits (the pinned first item in the editor):
 * its own picture, where the title sits, and whether the join QR code shows. `title_image`
 * overrides the automatic `title_bg_path`, which stays as the fallback.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table): void {
            $table->text('title_image')->nullable()->after('title_bg_path');
            $table->string('title_position', 16)->default('bottom-left')->after('title_image');
            $table->boolean('show_qr')->default(true)->after('title_position');
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table): void {
            $table->dropColumn(['title_image', 'title_position', 'show_qr']);
        });
    }
};
