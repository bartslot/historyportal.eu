<?php

declare(strict_types=1);

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\CurriculumGoal;
use App\Support\Seo;
use Illuminate\View\View;

/** Public pages for the Dutch curriculum. Dutch only: kerndoelen are a Dutch system. */
class CurriculumController extends Controller
{
    public function index(): View
    {
        app()->setLocale('nl');

        $publicLessonIds = Seo::publicLessons()->select('lessons.id');

        $goals = CurriculumGoal::query()
            ->withCount(['lessons' => fn ($q) => $q->whereIn('lessons.id', $publicLessonIds)])
            ->orderBy('sort')
            ->get()
            ->groupBy('type');

        return view('marketing.curriculum.index', ['goals' => $goals]);
    }

    public function show(string $slug): View
    {
        app()->setLocale('nl');

        $goal = CurriculumGoal::query()->where('slug', $slug)->with(['parent', 'children'])->firstOrFail();

        $lessons = Seo::publicLessons()
            ->whereHas('curriculumGoals', fn ($q) => $q->whereKey($goal->id))
            ->latest()
            ->get();

        return view('marketing.curriculum.show', ['goal' => $goal, 'lessons' => $lessons]);
    }
}
