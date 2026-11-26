<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Pictures no longer go to the ElevenLabs studio (bart, 2026-11-23: the Recraft test was not History Lines).
 * Character sheets and world shots still waiting for the studio go back to "not made yet", so the next start of
 * the step sends them to ChatGPT. Pictures the studio already delivered stay for the teacher to judge.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('story_media_items')
            ->where('model', 'studio')->where('kind', '!=', 'clip')->whereIn('status', ['queued', 'generating'])
            ->update(['status' => 'planned', 'model' => null, 'generation_id' => null, 'prompt' => null, 'started_at' => null,
                'error' => null, 'updated_at' => now()]);
    }

    public function down(): void
    {
        // Nothing to undo: the items simply wait to be started again.
    }
};
