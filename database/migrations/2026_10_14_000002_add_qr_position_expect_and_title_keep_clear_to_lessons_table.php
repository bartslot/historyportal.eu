<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The title screen's join QR gets a place the teacher can choose (null: placed automatically; a
 * corner; hidden stays show_qr = false), the lesson its "what you can expect" lines (1-3 short
 * lines), and a logo/plain title screen optional keep-clear boxes over its picture (faces, figures).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table): void {
            $table->string('qr_position', 16)->nullable()->after('show_qr');
            $table->json('expect')->nullable()->after('qr_position');
            $table->json('title_keep_clear')->nullable()->after('expect');
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table): void {
            $table->dropColumn(['qr_position', 'expect', 'title_keep_clear']);
        });
    }
};
