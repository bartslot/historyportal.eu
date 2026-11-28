<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Editing a lesson offline (Bart, 2026-11-28, on a flight: "Offline I can't do anything").
 *
 * - lesson_claims.offline_until: a scene taken offline stays held by its editor until then, instead of
 *   lapsing after the ping's 20 seconds. Others see it as held and can still Take over.
 * - offline_copies: only on the laptop that holds a local copy. Which live lesson a local lesson copies,
 *   and per scene which live scene it is plus the fingerprints both sides had at the last sync, so a push
 *   knows what changed here and what changed there.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lesson_claims', function (Blueprint $table) {
            $table->timestamp('offline_until')->nullable()->after('seen_at');
        });

        Schema::create('offline_copies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('remote_url');
            $table->unsignedBigInteger('remote_lesson_id');
            $table->string('remote_code', 32);
            $table->json('base');
            $table->boolean('holds_claims')->default(false);
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offline_copies');
        Schema::table('lesson_claims', function (Blueprint $table) {
            $table->dropColumn('offline_until');
        });
    }
};
