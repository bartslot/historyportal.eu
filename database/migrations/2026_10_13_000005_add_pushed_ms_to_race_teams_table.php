<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * When a team last gained ground: the server lets a team gain at most a quarter of its meter per
 * second, however many phones (or forged requests) push for it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('race_teams', function (Blueprint $table) {
            // Epoch milliseconds: a datetime column loses the sub-second part the speed limit needs.
            $table->unsignedBigInteger('pushed_ms')->nullable()->after('finished_ms');
        });
    }

    public function down(): void
    {
        Schema::table('race_teams', function (Blueprint $table) {
            $table->dropColumn('pushed_ms');
        });
    }
};
