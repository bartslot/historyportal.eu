<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Anonymous player telemetry for the Phase 0 classroom experiment.
 *
 * PRIVACY BY DESIGN (children use the player without accounts, EU classrooms):
 *  - session_uuid is generated per PAGE LOAD in the browser — no cross-session tracking.
 *  - No user id, no student name, no IP address, no device fingerprint. Ever.
 *  - Rows are pruned by lessons:prune-telemetry after lessons.telemetry_retention_days.
 * Adding any identifying column to this table is a design violation, not an extension.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lesson_telemetry_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->uuid('session_uuid')->index();
            $table->string('event', 32)->index();
            $table->unsignedSmallInteger('scene_index')->nullable();
            $table->unsignedBigInteger('scene_id')->nullable();
            $table->float('playback_position')->nullable(); // seconds into the current scene's audio
            $table->timestamp('client_ts')->nullable();     // browser clock (informational)
            $table->timestamp('created_at')->useCurrent();

            $table->index(['lesson_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_telemetry_events');
    }
};
