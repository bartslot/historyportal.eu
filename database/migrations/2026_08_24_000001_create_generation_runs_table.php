<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 0 experiment instrumentation: one row per lesson generation, recording exactly which
 * code/config produced it (reproducibility), which visual path every scene took (comparison
 * eligibility), and what it cost (unit economics). See docs/experiment/phase0-protocol.md.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('generation_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();

            // Condition + reproducibility
            $table->string('experiment_label')->nullable()->index();
            $table->string('git_commit', 64)->nullable();
            $table->json('snapshot')->nullable();          // models, grid, prompts hashes, policy, style…
            $table->json('generation_paths')->nullable();  // scene_id → ai_grid | sourced_artwork | asset_pack | pre_assigned | generated_environment | none

            // Cost counters (incremented best-effort while the run is open)
            $table->unsignedInteger('llm_calls')->default(0);
            $table->unsignedInteger('vision_calls')->default(0);
            $table->unsignedInteger('image_calls')->default(0);
            $table->unsignedInteger('image_retries')->default(0);
            $table->unsignedBigInteger('llm_input_tokens')->default(0);
            $table->unsignedBigInteger('llm_cached_tokens')->default(0);
            $table->unsignedBigInteger('llm_output_tokens')->default(0);

            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('generation_runs');
    }
};
