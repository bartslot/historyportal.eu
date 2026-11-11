<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A teacher's own worlds (Bart 11-11: "save a 3D world that I have been working on as a new world that you can later
 * choose"): the place a stage25d scene stands in, saved from a scene and offered next to config/worlds.php.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stage_worlds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 60);
            $table->string('bundle', 80);          // the period library its pictures come from
            $table->json('parts');                 // { set: { sky, groundSlots, groundBands?, layers }, look }
            $table->string('thumb_path')->nullable(); // public disk, a small picture of the stage
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stage_worlds');
    }
};
