<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * How large this teacher wants the interface.
 *
 * Stored as the percentage they PICK, not the factor the browser gets. Bart, on the wizard:
 * *"Our UI looks much better if i put the browser size on 80%. UI Size = 100% should be what is
 * now 80%."* So 100 is the new normal and it renders at 0.8 — the base lives in one place in CSS,
 * and nobody has to remember that 100 secretly means 80.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->unsignedSmallInteger('ui_scale')->default(100)->after('teaching_locale');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn('ui_scale');
        });
    }
};
