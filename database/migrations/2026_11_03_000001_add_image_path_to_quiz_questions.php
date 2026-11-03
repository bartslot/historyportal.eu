<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** A picture the class sees with the question (a site path, /storage/...). */
    public function up(): void
    {
        Schema::table('quiz_questions', function (Blueprint $table) {
            $table->string('image_path')->nullable()->after('question');
        });
    }

    public function down(): void
    {
        Schema::table('quiz_questions', function (Blueprint $table) {
            $table->dropColumn('image_path');
        });
    }
};
