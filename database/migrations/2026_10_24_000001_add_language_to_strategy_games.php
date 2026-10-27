<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A strategy game is written in one language (every one so far is English). A Dutch lesson must
 * never be handed an English Caesar card unasked, so the editor and the matcher filter on this.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('strategy_games', function (Blueprint $table) {
            $table->string('language', 5)->default('en')->after('title');
        });
    }

    public function down(): void
    {
        Schema::table('strategy_games', function (Blueprint $table) {
            $table->dropColumn('language');
        });
    }
};
