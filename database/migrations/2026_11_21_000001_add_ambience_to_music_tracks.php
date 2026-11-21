<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The music library also holds ambience: looping background sound (wind, waves, a bazaar) that plays
 * under a scene beside its music. `slug` is the sound bank id (engine-mvp/src/sound/bank.json),
 * `tags` the words a scene must say for the bed to be picked on its own, `prompt` what made it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('music_tracks', function (Blueprint $table) {
            $table->string('kind', 16)->default('music')->after('title');
            $table->string('slug', 64)->nullable()->unique()->after('kind');
            $table->json('tags')->nullable()->after('slug');
            $table->text('prompt')->nullable()->after('tags');
        });
    }

    public function down(): void
    {
        Schema::table('music_tracks', fn (Blueprint $table) => $table->dropColumn(['kind', 'slug', 'tags', 'prompt']));
    }
};
