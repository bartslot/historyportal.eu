<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\LessonStatus;
use App\Jobs\TranslateLessonCaptions;
use App\Models\Lesson;
use App\Services\Captions\CaptionTranslator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

/**
 * The lesson's subtitles in another language, for the player's Audio & Subtitles panel: whatever
 * is cached, `pending` while lines are missing, and `translating` while a batch is on its way (the
 * player polls and shows the original line meanwhile). ?peek=1 only reads, for the panel's
 * previews. Open to anyone who may play the lesson, like the player itself.
 */
class LessonCaptionsController extends Controller
{
    public function __invoke(Request $request, string $lessonCode, string $language, CaptionTranslator $captions): JsonResponse
    {
        abort_unless(isset(CaptionTranslator::LANGUAGES[$language]), 404);

        $lesson = Lesson::where('lesson_code', strtoupper($lessonCode))->firstOrFail();
        $playable = in_array($lesson->status, [LessonStatus::Published, LessonStatus::Previewable], true);
        abort_unless($playable || $request->user()?->canManage($lesson), 404);

        $set = $captions->cached($lesson, $language);
        $key = TranslateLessonCaptions::statusKey($lesson->id, $language);

        // One batch per lesson + language at a time ("running", which expires on its own if a
        // worker dies mid-job); after a run that left lines missing the job holds the key for a
        // minute ("retry"), so a class's polls do not each hit a rate-limited provider.
        if ($set['missing'] > 0 && ! $request->boolean('peek') && Cache::add($key, 'running', now()->addMinutes(10))) {
            try {
                TranslateLessonCaptions::dispatch($lesson->id, $language);
            } catch (\Throwable $e) {
                report($e);   // only a sync queue runs the job here; the player keeps the original
            }
            $set = $captions->cached($lesson, $language);   // a sync queue has finished by now
        }

        return response()->json([
            'language' => $language,
            'dir' => in_array($language, CaptionTranslator::RTL, true) ? 'rtl' : 'ltr',
            'texts' => (object) $set['texts'],
            'pending' => $set['missing'] > 0,
            'translating' => $set['missing'] > 0 && in_array(Cache::get($key), ['running', 'retry'], true),
        ]);
    }
}
