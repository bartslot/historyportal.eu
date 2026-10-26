<?php

declare(strict_types=1);

namespace App\Http\Controllers\Predict;

use App\Enums\LessonStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Predict\StorePredictionAnswerRequest;
use App\Jobs\GradePredictionAnswer;
use App\Models\ClassroomMember;
use App\Models\Lesson;
use App\Models\PredictionAnswer;
use App\Models\Scene;
use App\Services\Lessons\PredictSpec;
use App\Services\Predict\NamePseudonymizer;
use App\Services\Support\NameMatcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

/**
 * Typed answers at a predict moment (scene game_type=predict). Paper mode never calls this.
 *
 *   store      a prediction (stored, never graded) or a WHY (stored, then graded after the response)
 *   show       the browser that sent an answer reads its feedback back (it polls while grading runs)
 *   playMode   the board's "Devices in class?", remembered per class
 */
class PredictionAnswerController extends Controller
{
    public const DEVICE_MODES = ['paper', 'solo'];

    public function store(StorePredictionAnswerRequest $request, string $lessonCode): JsonResponse
    {
        $lesson = $this->lesson($request, $lessonCode);
        $scene = Scene::where('lesson_id', $lesson->id)->where('kind', 'game')->where('game_type', 'predict')
            ->findOrFail($request->integer('scene_id'));
        $manager = (bool) $request->user()?->canManage($lesson);
        $answerer = (string) $request->input('answerer');
        // The class's or a team's answer is typed on the board, by the teacher.
        abort_if($answerer !== 'pupil' && ! $manager, 403);

        $session = (string) $request->input('session');
        $label = $request->input('label');
        $classroom = $this->classroom($lesson, $request, $manager);
        $predict = PredictSpec::normalize((array) (($scene->config ?? [])['predict'] ?? []));
        $phase = (string) $request->input('phase');
        $ids = NamePseudonymizer::make();

        // A retry (school wifi) or a corrected answer replaces this browser's own answer.
        $answer = PredictionAnswer::updateOrCreate([
            'scene_id' => $scene->id,
            'session_hash' => PredictionAnswer::hashSession($session),
            'phase' => $phase,
            'answerer' => $answerer,
            'label' => $label,
        ], [
            'lesson_id' => $lesson->id,
            'classroom_id' => $classroom?->id,
            'classroom_member_id' => $answerer === 'pupil' ? $this->memberId($classroom?->id, $label) : null,
            'child_id' => $ids->childId($answerer === 'pupil' ? $session : $session.'|'.$label),
            'question' => mb_substr($phase === 'why' ? $predict['debrief'] : $predict['question'], 0, 300),
            'text' => (string) $request->input('text'),
            'status' => $phase === 'why' ? 'pending' : 'saved',
            'level' => null, 'concepts' => null, 'misconception' => null, 'confidence' => null,
            'feedback' => null, 'model' => null, 'graded_at' => null,
        ]);

        if ($phase === 'why') {
            // After the response, not on the cron worker: the child is waiting for the feedback card.
            GradePredictionAnswer::dispatchAfterResponse($answer->id);
        }

        return response()->json(['id' => $answer->id, 'status' => $answer->status], 201);
    }

    public function show(Request $request, string $lessonCode, int $answer): JsonResponse
    {
        $row = PredictionAnswer::whereHas('lesson', fn ($q) => $q->where('lesson_code', strtoupper($lessonCode)))
            ->findOrFail($answer);
        $session = (string) $request->query('session', '');
        abort_unless($session !== '' && hash_equals($row->session_hash, PredictionAnswer::hashSession($session)), 404);

        return response()->json([
            'id' => $row->id,
            'status' => $row->status,
            'feedback' => in_array($row->status, ['graded', 'flagged', 'failed'], true) ? $row->feedback : null,
        ]);
    }

    public function playMode(Request $request, string $lessonCode): Response
    {
        $lesson = Lesson::where('lesson_code', strtoupper($lessonCode))->firstOrFail();
        abort_unless($request->user()?->canManage($lesson), 403);
        $data = $request->validate([
            'classroom_id' => ['required', 'integer'],
            'mode' => ['required', Rule::in(self::DEVICE_MODES)],
        ]);
        $lesson->classrooms()->whereKey($data['classroom_id'])->firstOrFail()
            ->update(['devices_mode' => $data['mode']]);

        return response()->noContent();
    }

    /** A lesson the class may play, or one the teacher is previewing. */
    private function lesson(Request $request, string $lessonCode): Lesson
    {
        $lesson = Lesson::where('lesson_code', strtoupper($lessonCode))->firstOrFail();
        $playable = in_array($lesson->status, [LessonStatus::Published, LessonStatus::Previewable, LessonStatus::Ready], true);
        abort_unless($playable || $request->user()?->canManage($lesson), 404);

        return $lesson;
    }

    /** The board names its class; a pupil's class code (as in the quiz) finds theirs. Unknown: none. */
    private function classroom(Lesson $lesson, Request $request, bool $manager): ?\App\Models\Classroom
    {
        if ($manager && $request->filled('classroom_id')) {
            return $lesson->classrooms()->whereKey($request->integer('classroom_id'))->first();
        }
        if ($request->filled('class_code')) {
            return $lesson->classrooms()->where('join_code', strtoupper(trim((string) $request->input('class_code'))))->first();
        }

        return null;
    }

    /** A pupil already on the roster (the quiz adds them); this never writes one. */
    private function memberId(?int $classroomId, ?string $name): ?int
    {
        if ($classroomId === null || ! filled($name)) {
            return null;
        }

        return ClassroomMember::whereRaw('classroom_id = ? AND lower(display_name) = ?', [
            $classroomId, mb_strtolower(NameMatcher::canonical($name)),
        ])->value('id');
    }
}
