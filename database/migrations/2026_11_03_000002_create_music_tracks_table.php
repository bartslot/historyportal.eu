<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The music library (Suno and other licensed tracks) and the per-scene mix that plays them.
 *
 * The mix lives in its own column rather than in scenes.config: two dozen editor actions rewrite
 * config wholesale, and a stale copy saved by any of them would silently drop the teacher's music.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('music_tracks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title', 120);
            $table->string('source_url', 500)->nullable()->after('title');   // e.g. the Suno share link
            $table->string('licence', 16)->after('source_url');                // App\Enums\MusicLicence
            $table->string('licence_note', 500)->nullable()->after('licence'); // plan, author, attribution
            $table->string('path')->after('licence_note');                     // public disk
            $table->timestamps();
        });

        Schema::table('scenes', function (Blueprint $table) {
            // null = carry on with the previous scene's music; {layers: []} = silence.
            $table->json('music')->nullable();
            $table->json('music_undo')->nullable()->after('music');
        });
    }

    public function down(): void
    {
        Schema::table('scenes', function (Blueprint $table) {
            $table->dropColumn(['music', 'music_undo']);
        });
        Schema::dropIfExists('music_tracks');
    }
};
