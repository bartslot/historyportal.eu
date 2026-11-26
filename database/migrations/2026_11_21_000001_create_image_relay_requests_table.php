<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A picture the server asked ChatGPT on Bart's Mac for (App\Services\Imaging\ImageRelay). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('image_relay_requests', function (Blueprint $table) {
            $table->id();
            $table->string('status', 16)->default('queued')->index();
            $table->text('prompt');
            $table->string('size', 16);
            $table->boolean('transparent')->default(false);
            $table->json('inputs')->nullable();
            $table->string('result_path')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('claimed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('image_relay_requests');
    }
};
