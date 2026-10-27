<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Territory borders are a switch now, and absent means off (Bart 2026-10-26: "territories should
 * also be auto off"). The Dante lessons' two maps of Italy (qid Q38) are drawn around the red
 * shading of the Guelph and Ghibelline lands, so they keep it: every map scene on Q38 that never
 * saved a choice gets `show_borders: true`, in every language copy. A saved choice is left alone.
 */
return new class extends Migration
{
    public function up(): void
    {
        $scenes = DB::table('scenes')->select('id', 'config')->where('kind', 'map')->whereNotNull('config')->get();

        foreach ($scenes as $scene) {
            $config = json_decode((string) $scene->config, true) ?: [];
            if (($config['qid'] ?? null) !== 'Q38' || array_key_exists('show_borders', $config)) {
                continue;
            }
            DB::table('scenes')->where('id', $scene->id)->update([
                'config' => json_encode([...$config, 'show_borders' => true]),
            ]);
        }
    }

    public function down(): void
    {
        // The flag is what the map showed before the switch existed; there is nothing to undo.
    }
};
