<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Live test sessions (P1): an adult tester opts in with ?test=CODE and the page records what they
 * do, so Claude can read a timeline and replay any moment afterwards.
 *
 *  - test_sessions: one per test, addressed by its code. Open while started_at is set and ended_at
 *    is not; only an open session accepts data.
 *  - test_events: the compact timeline (click, route, http_error, console_error, scene, …), t_ms
 *    from the session start.
 *  - test_rrweb_chunks: the raw rrweb DOM recording in 5-second batches, for replay snapshots.
 *    `events` is the JSON text, or base64 gzip of it when `gzipped` (large chunks).
 *
 * Everything is deleted 30 days after the session was created (model:prune in routes/console.php).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('test_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('code', 32)->unique();
            $table->string('label')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->timestamp('started_at', 3)->nullable();
            $table->timestamp('ended_at', 3)->nullable();
            $table->timestamps();
        });

        Schema::create('test_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_session_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('t_ms');
            $table->string('type', 32);
            $table->json('payload')->nullable();

            $table->index(['test_session_id', 't_ms']);
        });

        Schema::create('test_rrweb_chunks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_session_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('seq');
            $table->boolean('gzipped')->default(false);
            $table->longText('events');
            $table->timestamp('created_at')->nullable();

            $table->unique(['test_session_id', 'seq']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('test_rrweb_chunks');
        Schema::dropIfExists('test_events');
        Schema::dropIfExists('test_sessions');
    }
};
