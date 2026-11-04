<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A track's tempo, so a music change lands on the next bar (Suno gives none: the editor estimates
 * it from the audio, an admin corrects it), and the undo stack of the lesson's music list.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('music_tracks', function (Blueprint $table) {
            $table->decimal('bpm', 5, 1)->nullable()->after('path');
            $table->float('beat_offset')->nullable()->after('bpm');   // seconds to the first downbeat
        });

        Schema::table('lessons', function (Blueprint $table) {
            // [{s: {scene_id: music|null}}], the scenes one list edit changed, as they were before it.
            $table->json('music_undo')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('lessons', fn (Blueprint $table) => $table->dropColumn('music_undo'));
        Schema::table('music_tracks', fn (Blueprint $table) => $table->dropColumn(['bpm', 'beat_offset']));
    }
};
