<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** The right words a team has found (indexes into the moment's list): each counts once per team. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('race_teams', function (Blueprint $table) {
            $table->json('words')->nullable()->after('pushed_ms');
        });
    }

    public function down(): void
    {
        Schema::table('race_teams', function (Blueprint $table) {
            $table->dropColumn('words');
        });
    }
};
