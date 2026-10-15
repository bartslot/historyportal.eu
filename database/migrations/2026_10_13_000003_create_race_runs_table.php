<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One harbour race played on team devices (power-meter moment with race.enabled, own-device mode).
 * Short-lived and personal-data free: team names set by the teacher, no pupils, no IPs. Deleted when
 * the race ends, and by races:prune (and every new race) once expires_at has passed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('race_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->foreignId('scene_id')->constrained()->cascadeOnDelete();
            $table->string('code', 8)->unique();
            $table->string('state', 12)->default('lobby');
            $table->unsignedTinyInteger('goal')->default(4);
            $table->json('roles')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamp('expires_at')->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('race_runs');
    }
};
