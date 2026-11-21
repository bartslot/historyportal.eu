<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Lesson;
use App\Models\Scene;
use App\Services\Lessons\ScriptReview;
use App\Services\LessonScriptPrompt;
use App\Services\Llm\Llm;
use App\Services\OpenAiLlmService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * The teacher read the script and asked the assistant for a change ("make scene 3 shorter", "less
 * about the war, more about daily life"). One call rewrites what the request touches and leaves the
 * rest word for word; the teacher reads the result and approves it or asks again.
 */
class ReviseLessonScript implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** A failed rewrite is reported to the teacher, who can simply ask again. */
    public int $tries = 1;

    public int $timeout = 300;

    /** The read timeout for the rewrite: it returns the whole script. */
    private const CALL_TIMEOUT = 180;

    public function __construct(public readonly int $lessonId, public readonly string $request) {}

    public function handle(#[Llm('script')] OpenAiLlmService $llm): void
    {
        $lesson = Lesson::with(['source', 'scenes'])->find($this->lessonId);
        if ($lesson === null || ! ScriptReview::isRevising($lesson)) {
            return;
        }

        $scenes = $lesson->scenes->where('kind', '!=', 'map')->sortBy('order')->values();

        try {
            $result = $llm->json(
                system: self::system($lesson),
                user: $this->user($lesson, $scenes),
                maxTokens: 16000,
                timeout: self::CALL_TIMEOUT,
            );
        } catch (Throwable $e) {
            Log::warning("ReviseLessonScript #{$lesson->id}: {$e->getMessage()}");
            $this->finish($lesson, __('Sorry, that change did not work this time. Your script is unchanged. Try asking again.'));

            return;
        }

        $byOrder = $scenes->keyBy('order');
        $changed = 0;
        foreach ((array) ($result['scenes'] ?? []) as $entry) {
            $scene = is_array($entry) ? $byOrder->get((int) ($entry['order'] ?? 0)) : null;
            $text = is_array($entry) ? trim((string) ($entry['script'] ?? '')) : '';
            if ($scene instanceof Scene && $text !== '' && $text !== trim((string) $scene->script_segment)) {
                $scene->update(['script_segment' => $text]);
                $changed++;
            }
        }

        $reply = trim((string) ($result['reply'] ?? ''));
        if ($changed === 0) {
            $reply = $reply !== '' ? $reply : __('I did not find anything to change for that. Could you say which scene, or what should be different?');
        } elseif ($reply === '') {
            $reply = trans_choice('I changed :count scene.|I changed :count scenes.', $changed, ['count' => $changed]);
        }

        $this->finish($lesson, $reply);
    }

    public function failed(?Throwable $e): void
    {
        $lesson = Lesson::find($this->lessonId);
        if ($lesson !== null && ScriptReview::isRevising($lesson)) {
            $this->finish($lesson, __('Sorry, that change did not work this time. Your script is unchanged. Try asking again.'));
        }
    }

    private function finish(Lesson $lesson, string $reply): void
    {
        $lesson->update(['script_review' => ScriptReview::withMessage($lesson->fresh(), 'assistant', $reply, ['state' => 'ready'])]);
    }

    private static function system(Lesson $lesson): string
    {
        $language = LessonScriptPrompt::contentLanguage($lesson);

        return <<<PROMPT
You revise the narration script of a history lesson on the teacher's request.

Rules:
- Change only what the request asks for. Every scene the request does not touch stays word for word.
- Keep each scene's role in the story, and keep the story connected from scene to scene.
- Only use facts from the provided source. If uncertain, omit — never invent.
- Write the narration in {$language}. Clean prose only: no bracket tags, no stage directions.
- If the request is unclear, change nothing and ask one short question in "reply".

Return one JSON object:
{
  "scenes": [{"order": int, "script": string}],   // only the scenes you changed, each in full
  "reply": string                                  // one or two sentences to the teacher, in the language they wrote in: what you changed
}
PROMPT;
    }

    /** @param  \Illuminate\Support\Collection<int, Scene>  $scenes */
    private function user(Lesson $lesson, $scenes): string
    {
        $source = mb_substr((string) ($lesson->source?->extracted_text ?? ''), 0, 12000);

        $history = collect((array) ($lesson->script_review['messages'] ?? []))
            ->slice(-8, 7)   // earlier turns for context; the last one is this request
            ->map(fn ($m) => ($m['role'] === 'teacher' ? 'Teacher' : 'Assistant').': '.$m['text'])
            ->implode("\n");

        $script = $scenes
            ->map(fn (Scene $scene) => "Scene {$scene->order}:\n".trim((string) $scene->script_segment))
            ->implode("\n\n");

        return 'Lesson: '.($lesson->title ?: $lesson->topic)."\n\n"
            .($history !== '' ? "Earlier in this conversation:\n{$history}\n\n" : '')
            ."The teacher's request:\n{$this->request}\n\n"
            ."Current script:\n{$script}\n\n"
            ."Source:\n{$source}";
    }
}
