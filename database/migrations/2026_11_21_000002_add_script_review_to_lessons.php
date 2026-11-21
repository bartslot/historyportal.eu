<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The teacher reads the generated script before pictures and narration are made (Bart, 2026-11-21:
 * "When the script is created I want the teacher to approve the text, or make changes using the AI
 * assistant"). Null: no review, the pipeline runs straight through (commands, benchmarks).
 * Otherwise {state: writing|ready|revising|approved, messages: [{role, text, at}]}.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->json('script_review')->nullable()->after('outline');
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->dropColumn('script_review');
        });
    }
};
