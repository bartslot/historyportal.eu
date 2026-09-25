<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One row per paid fal.ai art call. The fal balance is an ACCOUNT balance, so the budget is the
 * configured ceiling minus everything recorded here — a per-command cap alone can't stop five runs
 * each spending the whole balance.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fal_ledger', function (Blueprint $table): void {
            $table->id();
            $table->string('model');
            $table->string('purpose');                  // bakeoff | anchor | sheet | convert | colour | upscale
            $table->string('command')->nullable();      // artisan signature that triggered it
            // nullOnDelete, not cascade: deleting a lesson must not erase spend and free up budget.
            $table->foreignId('lesson_id')->nullable()->constrained()->nullOnDelete();
            $table->string('request_id')->nullable();
            $table->decimal('estimated_usd', 8, 4);
            $table->string('status')->default('pending'); // pending | completed | failed
            $table->text('error')->nullable();
            $table->jsonb('meta')->nullable();          // prompt_hash, reference count, output paths
            $table->timestamps();
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fal_ledger');
    }
};
