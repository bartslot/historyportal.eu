<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\QuizQuestion;
use App\Models\Scene;
use App\Services\Support\WebpEncoder;
use Illuminate\Support\Facades\DB;
use Livewire\Attributes\On;

/**
 * Quiz-question editing for the scene configurator's Quiz inspector.
 *
 * Questions belong to their quiz scene (quiz_questions.scene_id) because lessons are
 * chronological: each segment may only test the narration BEFORE it. The draft mirrors the
 * selected segment's set (legacy scene-less pools still load). Each question carries up to
 * four options (A/B/C/D) and a 0-based correct_index — the shape QuizPrompt writes and
 * StudentLessonController reads.
 */
trait EditsQuizQuestions
{
    /** @var array<int,array{id:?int,question:string,image_path:?string,options:array<int,string>,correct_index:int,explanation:string}> */
    public array $quizDraft = [];

    /** Per-question validation messages, keyed by draft index. */
    public array $quizErrors = [];

    public bool $quizSaved = false;

    /** Pictures being uploaded for a question, keyed by draft index (the component uses WithFileUploads). */
    public array $quizImageUploads = [];

    /** The quiz scene the draft was last loaded for — guards against status-poll re-selects wiping edits. */
    public ?int $quizDraftSceneId = null;

    private const QUIZ_OPTION_COUNT = 4;     // A/B/C/D — matches QuizPrompt + the player

    private const QUIZ_MAX_QUESTIONS = 12;

    private const QUIZ_TEXT_MAX = 500;

    /**
     * Load (or keep) the editable draft for the scene being opened. Only reloads from the DB when the
     * teacher switches to a different scene — a status-change re-select of the same quiz scene keeps
     * any unsaved edits intact. Clears the draft for non-quiz scenes.
     */
    public function syncQuizDraftFor(Scene $scene): void
    {
        $isQuiz = $scene->kind === 'game' && ($scene->game_type ?? null) === 'quiz';

        if (! $isQuiz) {
            $this->quizDraftSceneId = null;
            $this->quizDraft = [];
            $this->quizErrors = [];

            return;
        }

        if ($this->quizDraftSceneId === $scene->id && $this->quizDraft !== []) {
            return;
        }

        $this->quizDraftSceneId = $scene->id;
        $this->loadQuizDraft();
    }

    /**
     * Pull THIS quiz scene's questions into the draft (chronology-scoped per segment),
     * padded to four option slots each. Legacy lessons keep a scene-less pool.
     */
    public function loadQuizDraft(): void
    {
        $this->quizErrors = [];
        $this->quizSaved = false;
        $query = $this->lesson->quizQuestions();
        if ($this->quizDraftSceneId) {
            $scoped = (clone $query)->where('scene_id', $this->quizDraftSceneId);
            $query = $scoped->exists() ? $scoped : $query->whereNull('scene_id');
        }
        $this->quizDraft = $query->orderBy('order')->get()
            ->map(fn (QuizQuestion $q) => [
                'id' => $q->id,
                'question' => (string) $q->question,
                'image_path' => $q->image_path,
                'options' => $this->padOptions(is_array($q->options) ? $q->options : []),
                'correct_index' => (int) $q->correct_index,
                'asks_ahead' => (bool) $q->asks_ahead,
                'explanation' => (string) ($q->explanation ?? ''),
            ])->values()->all();

        // What the teacher typed but did not finish is kept on the scene (autosaveQuiz): a reload brings it back, slots and all
        $kept = $this->quizDraftSceneId ? (Scene::find($this->quizDraftSceneId)?->config['quiz_draft'] ?? null) : null;
        if (is_array($kept) && $kept !== []) {
            $this->quizDraft = array_values(array_map(fn ($q) => [
                'id' => null,
                'question' => (string) ($q['question'] ?? ''),
                'image_path' => $q['image_path'] ?? null,
                'options' => $this->padOptions((array) ($q['options'] ?? [])),
                'correct_index' => (int) ($q['correct_index'] ?? 0),
                'asks_ahead' => (bool) ($q['asks_ahead'] ?? false),
                'explanation' => (string) ($q['explanation'] ?? ''),
            ], array_slice($kept, 0, self::QUIZ_MAX_QUESTIONS)));
        }

        // A quiz with nothing in it yet still has its slots: the stage shows the card, to type on or to generate
        if ($this->quizDraft === [] && $this->quizDraftSceneId) {
            $count = (int) (Scene::find($this->quizDraftSceneId)?->quiz_question_count ?: \App\Services\QuizPrompt::DEFAULT_QUESTION_COUNT);
            $this->syncQuizDraftCount($count);
        }
    }

    /** What the stage's slides show for the scene: the draft, blank questions too. */
    private function stageQuizSlides(Scene $scene): array
    {
        $this->syncQuizDraftFor($scene);

        return array_map(
            fn (array $q) => array_intersect_key($q, array_flip(['question', 'image_path', 'options', 'correct_index', 'asks_ahead', 'explanation'])),
            array_values($this->quizDraft),
        );
    }

    public function addQuizQuestion(): void
    {
        if (count($this->quizDraft) >= self::QUIZ_MAX_QUESTIONS) {
            return;
        }
        $this->quizSaved = false;
        $this->quizDraft[] = [
            'id' => null,
            'question' => '',
            'image_path' => null,
            'options' => array_fill(0, self::QUIZ_OPTION_COUNT, ''),
            'correct_index' => 0,
            'asks_ahead' => false,
            'explanation' => '',
        ];
        $this->autosaveQuiz();
    }

    /** The teacher's picture for question $index: stored like any upload (WebP), then saved with the question. */
    public function updatedQuizImageUploads(mixed $value, string $key): void
    {
        $index = (int) $key;
        if (! array_key_exists($index, $this->quizDraft)) {
            $this->quizImageUploads = [];

            return;
        }
        $this->validate(["quizImageUploads.{$index}" => 'image|mimes:jpg,jpeg,png,webp,gif|max:8192']);   // 8 MB
        $path = WebpEncoder::storeUpload($this->quizImageUploads[$index], "lessons/{$this->lesson->id}/uploads");
        $this->quizImageUploads = [];
        $this->quizDraft[$index]['image_path'] = '/storage/'.$path;
        $this->autosaveQuiz();
    }

    public function removeQuizImage(int $index): void
    {
        if (! array_key_exists($index, $this->quizDraft)) {
            return;
        }
        $this->quizDraft[$index]['image_path'] = null;
        $this->autosaveQuiz();
    }

    public function removeQuizQuestion(int $index): void
    {
        if (! array_key_exists($index, $this->quizDraft)) {
            return;
        }
        unset($this->quizDraft[$index]);
        $this->quizDraft = array_values($this->quizDraft);
        $this->autosaveQuiz();
    }

    /**
     * Keep the draft slots in step with the "Questions" count field: growing adds blank
     * drafts, shrinking removes trailing EMPTY drafts only — filled questions are never
     * silently deleted (the count just stays at the filled number).
     */
    public function syncQuizDraftCount(int $count): void
    {
        $count = max(1, min(self::QUIZ_MAX_QUESTIONS, $count));

        while (count($this->quizDraft) < $count) {
            $this->addQuizQuestion();
        }

        while (count($this->quizDraft) > $count) {
            $last = $this->quizDraft[count($this->quizDraft) - 1];
            $isEmpty = trim((string) $last['question']) === ''
                && implode('', array_map('trim', $last['options'])) === '';
            if (! $isEmpty) {
                break;
            }
            unset($this->quizDraft[count($this->quizDraft) - 1]);
            $this->quizDraft = array_values($this->quizDraft);
        }
        $this->autosaveQuiz();
    }

    /**
     * After an undo or a redo the scene holds an older draft: the saved questions and the scene's readiness follow it, so the
     * editor, the player and the publish check never disagree.
     */
    public function quizFollowsRestoredDraft(Scene $scene): void
    {
        if ($scene->kind !== 'game' || ($scene->game_type ?? null) !== 'quiz') {
            return;
        }
        $this->quizDraftSceneId = $scene->id;
        $this->quizDraft = [];
        $this->loadQuizDraft();
        $this->autosaveQuiz();
    }

    /** Current quiz difficulty (1-3 stars) for the inspector UI. */
    public function quizDifficulty(): int
    {
        $scene = $this->quizDraftSceneId ? Scene::find($this->quizDraftSceneId) : null;

        return (int) (($scene?->config['quiz_difficulty'] ?? null) ?: \App\Services\QuizPrompt::DIFFICULTY_MEDIUM);
    }

    /** Current scope for the inspector UI: 'taught' or 'full' (prior-knowledge check). */
    public function quizScope(): string
    {
        return \App\Services\QuizPrompt::scopeFor(
            $this->quizDraftSceneId ? Scene::find($this->quizDraftSceneId) : null,
        );
    }

    /**
     * Teacher override: 'taught' quizzes only preceding scenes; 'full' turns the segment
     * into a "what do you already know?" check that may ask ahead of the story.
     */
    public function setQuizScope(string $scope): void
    {
        if (! $this->quizDraftSceneId || ! in_array($scope, ['taught', 'full'], true)) {
            return;
        }

        $scene = Scene::find($this->quizDraftSceneId);
        if ($scene) {
            $scene->update(['config' => array_merge($scene->config ?? [], ['quiz_scope' => $scope])]);
        }
    }

    /** off | once (same new order for the whole class) | per_player (digital only). */
    public function quizShuffle(): string
    {
        $scene = $this->quizDraftSceneId ? Scene::find($this->quizDraftSceneId) : null;
        $mode = ($scene?->config ?? [])['quiz_shuffle'] ?? 'per_player';

        return in_array($mode, ['off', 'once', 'per_player'], true) ? $mode : 'per_player';
    }

    public function setQuizShuffle(string $mode): void
    {
        if (! $this->quizDraftSceneId || ! in_array($mode, ['off', 'once', 'per_player'], true)) {
            return;
        }
        $scene = Scene::find($this->quizDraftSceneId);
        if ($scene) {
            $scene->update(['config' => array_merge($scene->config ?? [], ['quiz_shuffle' => $mode])]);
        }
    }

    /**
     * Set the quiz difficulty (1-3 stars) on the quiz scene. Takes effect on the next
     * generation — per-question sparkles or "Regenerate all".
     */
    public function setQuizDifficulty(int $level): void
    {
        if (! $this->quizDraftSceneId || $level < 1 || $level > 3) {
            return;
        }

        $scene = Scene::find($this->quizDraftSceneId);
        if ($scene) {
            $scene->update(['config' => array_merge($scene->config ?? [], ['quiz_difficulty' => $level])]);
        }
    }

    /**
     * Generate THIS quiz's questions and answers at the current difficulty, via the same job the pipeline uses (objective
     * coverage + duplicate-stem validation included), then reload the draft. Only on a click: it costs money. Runs inline: the
     * teacher watches a spinner, not a queue. The job clears the scene's questions first, so a failure writes the draft back.
     */
    #[On('quizStageGenerate')]
    public function regenerateAllQuizQuestions(): void
    {
        if ($this->guestDemoCannotGenerate()) {
            $this->dispatch('quiz:generate-failed');

            return;
        }

        $status = $this->lesson->status;
        $failed = function (string $message, string $type): void {
            $this->autosaveQuiz();
            $this->dispatch('toast', message: $message, type: $type);
            $this->dispatch('quiz:generate-failed');
        };

        try {
            (new \App\Jobs\GenerateLessonQuiz($this->lesson->id, null, $this->quizDraftSceneId))
                ->handle(app(\App\Services\OpenAiLlmService::class));
        } catch (\Throwable $e) {
            report($e);
            $failed(__('The quiz could not be generated. Try again.'), 'error');

            return;
        } finally {
            $this->lesson->update(['status' => $status]);   // the job marks a lesson as just generated: this one stays what it was
        }

        if ($this->quizDraftSceneId && ! $this->lesson->quizQuestions()->where('scene_id', $this->quizDraftSceneId)->exists()) {
            $failed(__('There is no story before this quiz yet, so there is nothing to ask about.'), 'warning');

            return;
        }

        $this->forgetKeptQuizDraft();
        $this->loadQuizDraft();
        $this->autosaveQuiz();
        $this->dispatch('toast', message: __('Quiz generated.'), type: 'success');
    }

    /**
     * AI-draft one question: question + linked correct answer + three plausible distractors,
     * generated as ONE unit. If the teacher already typed a question, its intent is kept.
     * The correct answer lands in a random slot; the teacher can reorder but never repoint
     * correctness — regenerating the question is the only way to change the correct answer.
     */
    public function generateQuizQuestion(int $index): void
    {
        if ($this->guestDemoCannotGenerate()) {
            return;
        }

        if (! array_key_exists($index, $this->quizDraft)) {
            return;
        }

        $existing = collect($this->quizDraft)
            ->reject(fn ($q, $i) => $i === $index)
            ->pluck('question')
            ->filter()
            ->values()
            ->all();

        try {
            $result = app(\App\Services\OpenAiLlmService::class)->json(
                system: \App\Services\QuizQuestionDraftPrompt::questionSystem($this->lesson),
                user: \App\Services\QuizQuestionDraftPrompt::questionUser(
                    $this->lesson->load('scenes'),
                    $existing,
                    (string) ($this->quizDraft[$index]['question'] ?? ''),
                    $this->taughtScenesForQuiz(),
                ),
            );
        } catch (\Throwable $e) {
            $this->dispatch('toast', message: 'Question generation failed — try again.', type: 'error');

            return;
        }

        $question = trim((string) ($result['question'] ?? ''));
        $correct = trim((string) ($result['correct_answer'] ?? ''));
        $distractors = array_values(array_filter(array_map(
            fn ($d) => trim((string) $d),
            (array) ($result['distractors'] ?? []),
        )));

        if ($question === '' || $correct === '' || count($distractors) < self::QUIZ_OPTION_COUNT - 1) {
            $this->dispatch('toast', message: 'Question generation came back incomplete — try again.', type: 'error');

            return;
        }

        $correctSlot = random_int(0, self::QUIZ_OPTION_COUNT - 1);
        $options = array_slice($distractors, 0, self::QUIZ_OPTION_COUNT - 1);
        array_splice($options, $correctSlot, 0, [$correct]);

        $this->quizDraft[$index] = [
            'id' => $this->quizDraft[$index]['id'] ?? null,
            'question' => $question,
            'image_path' => $this->quizDraft[$index]['image_path'] ?? null,   // a redrawn question keeps the teacher's picture
            'options' => $this->padOptions($options),
            'correct_index' => $correctSlot,
            // Keep the prior-knowledge flag: dropping it here silently reset it to false on
            // autosave, so a redrawn asks-ahead question wrongly counted toward the class's
            // "difficult questions" stats (the exact mis-blame asks_ahead exists to prevent).
            'asks_ahead' => (bool) ($this->quizDraft[$index]['asks_ahead'] ?? false),
            'explanation' => trim((string) ($result['explanation'] ?? '')),
        ];
        $this->autosaveQuiz();
    }

    /**
     * AI-redraw ONE plausible wrong answer. The correct answer is never redrawable on its
     * own — it only changes together with the question (generateQuizQuestion).
     */
    public function regenerateQuizOption(int $index, int $optionIndex): void
    {
        if (! array_key_exists($index, $this->quizDraft)
            || $optionIndex < 0 || $optionIndex >= self::QUIZ_OPTION_COUNT
            || $optionIndex === (int) $this->quizDraft[$index]['correct_index']) {
            return;
        }

        $draft = $this->quizDraft[$index];
        $question = trim((string) $draft['question']);
        $correct = trim((string) ($draft['options'][$draft['correct_index']] ?? ''));
        if ($question === '' || $correct === '') {
            $this->dispatch('toast', message: 'Generate the question first — distractors need it.', type: 'warning');

            return;
        }

        $others = collect($draft['options'])->forget($optionIndex)->filter()->values()->all();

        try {
            $result = app(\App\Services\OpenAiLlmService::class)->json(
                system: \App\Services\QuizQuestionDraftPrompt::distractorSystem($this->lesson),
                user: \App\Services\QuizQuestionDraftPrompt::distractorUser($this->lesson, $question, $correct, $others),
            );
        } catch (\Throwable $e) {
            $this->dispatch('toast', message: 'Answer generation failed — try again.', type: 'error');

            return;
        }

        $distractor = trim((string) ($result['distractor'] ?? ''));
        if ($distractor !== '') {
            $this->quizDraft[$index]['options'][$optionIndex] = $distractor;
            $this->autosaveQuiz();
        }
    }

    /**
     * Drag-reorder answers (A/B/C/D). The correct answer MOVES but its correctness is
     * pinned — correct_index follows the option to its new slot.
     */
    public function moveQuizOption(int $index, int $from, int $to): void
    {
        $max = self::QUIZ_OPTION_COUNT - 1;
        if (! array_key_exists($index, $this->quizDraft)
            || $from < 0 || $from > $max || $to < 0 || $to > $max || $from === $to) {
            return;
        }

        $options = $this->quizDraft[$index]['options'];
        $moved = $options[$from];
        array_splice($options, $from, 1);
        array_splice($options, $to, 0, [$moved]);

        $correct = (int) $this->quizDraft[$index]['correct_index'];
        if ($correct === $from) {
            $correct = $to;
        } elseif ($from < $correct && $to >= $correct) {
            $correct--;
        } elseif ($from > $correct && $to <= $correct) {
            $correct++;
        }

        $this->quizDraft[$index]['options'] = $options;
        $this->quizDraft[$index]['correct_index'] = $correct;
        $this->autosaveQuiz();
    }

    /** Livewire hook: any wire:model edit inside the draft autosaves — no Save button. */
    public function updatedQuizDraft(): void
    {
        $this->autosaveQuiz();
    }

    /**
     * Autosave: persist every COMPLETE question (prompt + ≥2 filled options + a filled correct
     * answer), silently keep incomplete ones in the draft until they're finished. Empty option
     * slots are dropped and the correct index remapped, so saved data is always clean. Replaces
     * the lesson's pool in one transaction — the same delete-then-recreate the generator uses.
     */
    public function autosaveQuiz(): void
    {
        $this->quizErrors = [];
        $clean = [];
        $unfinished = false;   // a question the teacher started and did not finish

        foreach ($this->quizDraft as $i => $q) {
            $question = trim((string) ($q['question'] ?? ''));
            $rawOptions = array_map(fn ($o) => trim((string) $o), $q['options'] ?? []);
            $correct = (int) ($q['correct_index'] ?? 0);
            $correctValue = $rawOptions[$correct] ?? '';
            $filled = array_values(array_filter($rawOptions, fn ($o) => $o !== ''));

            $isUntouched = $question === '' && $filled === [];
            $isComplete = self::draftIsComplete($q);

            if (! $isComplete) {
                // Only nag about questions the teacher has actually started.
                if (! $isUntouched) {
                    $unfinished = true;
                    $errors = [];
                    if ($question === '') {
                        $errors[] = 'Question text is required.';
                    }
                    if (count($filled) < 2) {
                        $errors[] = 'Add at least two answer options.';
                    }
                    if ($correctValue === '') {
                        $errors[] = 'The correct answer field is empty.';
                    }
                    $this->quizErrors[$i] = $errors;
                }

                continue;
            }

            $newCorrect = array_search($correctValue, $filled, true);
            $clean[] = [
                'question' => $question,
                'image_path' => $q['image_path'] ?? null,
                'options' => $filled,
                'correct_index' => $newCorrect === false ? 0 : (int) $newCorrect,
                'asks_ahead' => (bool) ($q['asks_ahead'] ?? false),
                'explanation' => trim((string) ($q['explanation'] ?? '')) ?: null,
            ];
        }

        DB::transaction(function () use ($clean) {
            // Replace only THIS segment's questions — other quiz scenes keep theirs.
            $this->lesson->quizQuestions()
                ->when($this->quizDraftSceneId,
                    fn ($q) => $q->where(fn ($w) => $w->where('scene_id', $this->quizDraftSceneId)->orWhereNull('scene_id')))
                ->delete();
            foreach ($clean as $order => $row) {
                $this->lesson->quizQuestions()->create([
                    'scene_id' => $this->quizDraftSceneId,
                    'order' => $order,
                    'question' => $row['question'],
                    'image_path' => $row['image_path'],
                    'options' => $row['options'],
                    'correct_index' => $row['correct_index'],
                    'asks_ahead' => $row['asks_ahead'],
                    'explanation' => $row['explanation'],
                    'points' => 10,
                ]);
            }
        });

        // Flip the quiz scene's readiness with its content: "ready" once it has a complete question and no started one
        // left unfinished, else "pending", which keeps the lesson from publishing (the gate requires every scene ready).
        // A half-typed question would otherwise be dropped from the class's quiz without a word.
        // The whole draft, unfinished questions and empty slots too, is kept on the scene so a reload brings it back.
        if ($this->quizDraftSceneId && ($scene = Scene::find($this->quizDraftSceneId))) {
            $count = max(1, count($this->quizDraft));
            if ((int) ($this->selectedScene['id'] ?? 0) === $scene->id) {
                $this->selectedScene['quiz_question_count'] = $count;
            }
            $scene->update([
                'quiz_question_count' => $count,
                'status' => $clean === [] || $unfinished ? 'pending' : 'ready',
                'config' => [...($scene->config ?? []), 'quiz_draft' => array_map(
                    fn (array $q) => array_intersect_key($q, array_flip(['question', 'image_path', 'options', 'correct_index', 'asks_ahead', 'explanation'])),
                    array_values($this->quizDraft),
                )],
            ]);
        }

        // No draft reload: reloading would clobber half-typed questions mid-edit.
        $this->quizSaved = true;

        // The stage's editable slides show the SAVED questions; send them the new set so an
        // inspector edit appears there at once instead of on the next scene select.
        // The cached relation still holds the rows just replaced; the next scene payload reads it.
        $this->lesson->unsetRelation('quizQuestions');
        if ($this->quizDraftSceneId) {
            $this->dispatch('quiz:questions-updated',
                sceneId: $this->quizDraftSceneId,
                questions: array_map(
                    fn (array $q) => array_intersect_key($q, array_flip(['question', 'image_path', 'options', 'correct_index', 'asks_ahead', 'explanation'])),
                    array_values($this->quizDraft),
                ),
            );
        }
    }

    /** An edit typed straight onto the stage (QuizEditorSlides.js), which shows the draft itself. Then the same autosave as an inspector edit. */
    #[On('quizStageEdited')]
    public function quizStageEdited(int $question, ?int $option, string $text): void
    {
        $text = mb_substr(trim($text), 0, self::QUIZ_TEXT_MAX);
        if ($text === '' || $this->quizDraftSceneId === null) {
            return;
        }

        if (! isset($this->quizDraft[$question]) || ($option !== null && ($option < 0 || $option >= self::QUIZ_OPTION_COUNT))) {
            return;
        }

        if ($option === null) {
            $this->quizDraft[$question]['question'] = $text;
        } else {
            $this->quizDraft[$question]['options'][$option] = $text;
        }

        $this->autosaveQuiz();
    }

    /** A generated set replaces what was typed: the kept draft goes, the saved questions are the draft again. */
    private function forgetKeptQuizDraft(): void
    {
        $scene = $this->quizDraftSceneId ? Scene::find($this->quizDraftSceneId) : null;
        if ($scene && isset($scene->config['quiz_draft'])) {
            $config = $scene->config;
            unset($config['quiz_draft']);
            $scene->update(['config' => $config]);
        }
    }

    /** A question autosave will persist: a prompt, two filled answers, and a filled correct one. */
    private static function draftIsComplete(array $q): bool
    {
        $options = array_map(fn ($o) => trim((string) $o), $q['options'] ?? []);
        $filled = array_filter($options, fn ($o) => $o !== '');

        return trim((string) ($q['question'] ?? '')) !== ''
            && count($filled) >= 2
            && ($options[(int) ($q['correct_index'] ?? 0)] ?? '') !== '';
    }

    /** @deprecated Autosave replaced the manual save — kept for any stray callers. */
    public function saveQuiz(): void
    {
        $this->autosaveQuiz();
    }

    /**
     * The narration the student has heard BEFORE this quiz segment — the only material a
     * question may test. Null when no quiz scene is selected (fall back to the whole lesson).
     */
    private function taughtScenesForQuiz(): ?\Illuminate\Support\Collection
    {
        $quizScene = $this->quizDraftSceneId ? Scene::find($this->quizDraftSceneId) : null;
        if (! $quizScene) {
            return null;
        }

        // Prior-knowledge override: the sparkle may draw from the whole story.
        if (\App\Services\QuizPrompt::scopeFor($quizScene) === 'full') {
            return null;
        }

        return $this->lesson->scenes
            ->filter(fn (Scene $scene) => in_array($scene->kind, ['narration', 'stage25d'], true) && $scene->order < $quizScene->order)
            ->sortBy('order')
            ->values();
    }

    /** Pad/truncate an options list to exactly four slots so the editor always shows A/B/C/D. */
    private function padOptions(array $options): array
    {
        $options = array_values(array_map(fn ($o) => (string) $o, $options));

        return array_slice(array_pad($options, self::QUIZ_OPTION_COUNT, ''), 0, self::QUIZ_OPTION_COUNT);
    }
}
