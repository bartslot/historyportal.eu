<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** The teams of a race_run: a teacher-set name, a colour, and how far its ship has come. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('race_teams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('race_run_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('position');
            $table->string('name', 24);
            $table->decimal('progress', 6, 3)->default(0);
            $table->unsignedInteger('finished_ms')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('race_teams');
    }
};
