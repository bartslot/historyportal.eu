<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('image_restyles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->morphs('subject');
            // queued | running | ready | kept | failed | discarded
            $table->string('status', 16)->default('queued')->after('subject_id');
            $table->json('before')->nullable()->after('status');
            $table->unsignedTinyInteger('step')->default(0)->after('before');   // 1 = ink, 2 = colour
            $table->string('ink_path')->nullable()->after('step');                // pass 1 output (ink)
            $table->string('result_path')->nullable()->after('ink_path');         // pass 2 output (final)
            $table->unsignedTinyInteger('api_calls')->default(0);                 // paid images/edits calls made
            $table->decimal('cost_usd', 8, 4)->default(0);                        // from the API usage field
            $table->string('error_code', 24)->nullable()->after('result_path');
            $table->text('error_detail')->nullable()->after('error_code');
            $table->timestamp('notified_at')->nullable()->after('error_detail');
            $table->timestamps();

            $table->index(['subject_type', 'subject_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('image_restyles');
    }
};
