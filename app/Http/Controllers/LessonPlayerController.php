<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\StrategyGame;
use App\Services\Captions\CaptionTranslator;
use App\Support\Locales;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cache;
use Illuminate\View\View;

class LessonPlayerController extends Controller
{
    public function __invoke(Request $request, string $lessonCode): View
    {
        $code = strtoupper($lessonCode);
        $playableStatuses = array_column([LessonStatus::Published, LessonStatus::Previewable], 'value');

        // Published lessons are static content. Cache the heavy eager-loaded payload
        // (scenes + strategyGame + narrator + source) for 30 min against the remote Supabase DB —
        // this is what takes the player from ~3s to ~40ms per open. The key is busted on any
        // Lesson save (see Lesson::booted). Only a *found* lesson is cached: Cache::remember
        // treats a null return as a miss, so unpublished/invalid codes fall through every time.
        $lesson = Cache::remember("lesson.player.{$code}", now()->addMinutes(30), function () use ($code, $playableStatuses) {
            $lesson = Lesson::where('lesson_code', $code)
                ->whereIn('status', $playableStatuses)
                // Same rule as the catalogue: no scenes, nothing to play. Without this the player
                // renders its whole chrome around an empty stage and the class sits looking at it.
                ->has('scenes')
                ->with(['strategyGame', 'narrator', 'source', 'scenes'])
                ->first();

            if (! $lesson) {
                return null;
            }

            // Auto-match a strategy game if none assigned, but only for a lesson that plays one:
            // the matcher falls back to the first active game, so every other lesson used to get
            // "Cross the Rubicon" pinned on it. The update persists, so this runs once.
            $playsStrategy = $lesson->game_type === 'strategy'
                || $lesson->scenes->contains(fn ($s) => $s->kind === 'game' && $s->game_type === 'strategy');
            if (! $lesson->strategy_game_id && $playsStrategy) {
                $game = StrategyGame::matchForLesson($lesson);
                if ($game) {
                    $lesson->update(['strategy_game_id' => $game->id]);
                    $lesson->setRelation('strategyGame', $game);
                }
            }

            return $lesson;
        });

        // Teachers can also preview their own lessons regardless of status. This path depends on
        // the authenticated user, so it is intentionally never cached.
        if (! $lesson) {
            $lesson = Lesson::where('lesson_code', $code)
                ->ownedByCurrentUser()
                ->with(['strategyGame', 'narrator', 'source', 'scenes'])
                ->first();
        }

        if (! $lesson) {
            abort(404, 'Lesson not found or not yet published.');
        }

        // The player speaks the LESSON's language (buttons, quiz, pause and score screens), not the
        // visitor's: the class is following an Italian lesson. Unshipped languages keep the UI locale.
        if (Locales::isSupported($lesson->language)) {
            App::setLocale($lesson->language);
            Carbon::setLocale($lesson->language);
        }

        $translations = $lesson->translations();
        $audioLanguages = $this->audioLanguages($lesson, $translations);

        return view('lesson.player', compact('lesson', 'translations', 'audioLanguages'));
    }

    /**
     * The Audio column of the subtitle panel: this lesson and its translation_group siblings, each
     * a lesson of its own. `same_scenes` says the sibling has the same scene kinds in the same
     * order, so switching can land on the scene the class is watching; otherwise it starts over.
     *
     * @return list<array{code: string, name: string, url: string, current: bool, same_scenes: bool}>
     */
    private function audioLanguages(Lesson $lesson, \Illuminate\Database\Eloquent\Collection $translations): array
    {
        $kinds = $lesson->scenes->sortBy('order')->pluck('kind')->values()->all();

        return collect([$lesson])->merge($translations)->map(fn (Lesson $l) => [
            'code' => (string) $l->language,
            'name' => CaptionTranslator::LANGUAGES[$l->language] ?? Locales::name((string) $l->language),
            'url' => route('lesson.play', ['lessonCode' => $l->lesson_code]),
            'current' => $l->is($lesson),
            'same_scenes' => $l->is($lesson) || $l->scenes()->ordered()->pluck('kind')->all() === $kinds,
        ])->values()->all();
    }
}
