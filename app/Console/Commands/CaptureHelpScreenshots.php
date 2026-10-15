<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Enums\LessonStatus;
use App\Enums\OnboardingStatus;
use App\Models\Lesson;
use App\Models\User;
use App\Support\HelpMedia;
use App\Support\Locales;
use App\Support\ProductTour;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

/**
 * Captures the help-centre screenshots from the running app, one set per language.
 *
 *   php artisan help:screenshots                  every language
 *   php artisan help:screenshots --locale=de      just German
 *   php artisan help:screenshots --url=http://…   against another host
 *   php artisan help:screenshots --only=tour      just the About page product tour
 *
 * How it works: for each language it switches the demo teacher's UI language, resolves every named
 * route to a URL, and hands the list to tests/playwright/help-screenshots.spec.ts, which drives a
 * real browser. The teacher's original language and tour state are restored afterwards.
 *
 * Local only. It needs a signed-in session, which locally comes from AutoLoginDev.
 */
class CaptureHelpScreenshots extends Command
{
    protected $signature = 'help:screenshots
        {--locale=* : Languages to capture (default: all shipped languages)}
        {--url= : Base URL of the running app (default: APP_URL)}
        {--lesson= : Lesson id to use for the editor screenshots}
        {--only= : Capture just one set: "help" (help centre) or "tour" (About page product tour)}';

    protected $description = 'Capture the help-centre screenshots per language with Playwright';

    public function handle(): int
    {
        if (! app()->environment('local')) {
            $this->error('Screenshots are captured locally, against the dev server.');

            return self::FAILURE;
        }

        $teacher = $this->demoTeacher();

        if (! $teacher) {
            $this->error('No teacher account to capture with. Seed one first.');

            return self::FAILURE;
        }

        $lesson = $this->demoLesson($teacher);

        if (! $lesson) {
            $this->warn('No finished lesson found — the editor screenshots will be skipped.');
        }

        $locales = $this->option('locale') ?: Locales::codes();
        $baseUrl = rtrim((string) ($this->option('url') ?: config('app.url')), '/');

        // Remember what to put back: capturing must not leave the account in another language, or
        // with its welcome tour re-armed.
        $original = [
            'locale' => $teacher->locale,
            'onboarding_status' => $teacher->onboarding_status,
            'onboarding_step' => $teacher->onboarding_step,
        ];

        $failed = [];

        try {
            // The tour overlay would sit on top of the dashboard in every shot.
            $teacher->forceFill(['onboarding_status' => OnboardingStatus::Completed])->save();

            foreach ($locales as $locale) {
                if (! Locales::isSupported($locale)) {
                    $this->error("Unknown language '{$locale}' — skipped.");
                    $failed[] = $locale;

                    continue;
                }

                $captured = false;

                $this->components->task(
                    Locales::name($locale).' ('.$locale.')',
                    function () use ($teacher, $locale, $baseUrl, $lesson, &$captured): bool {
                        $teacher->forceFill(['locale' => $locale])->save();

                        return $captured = $this->capture($locale, $baseUrl, $lesson, $teacher);
                    },
                );

                if (! $captured) {
                    $failed[] = $locale;
                }
            }
        } finally {
            $teacher->forceFill($original)->save();
        }

        if ($failed !== []) {
            $this->newLine();
            $this->error('Failed: '.implode(', ', $failed));

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Captured '.count($locales).' language(s) into public/'.'help-media/.');

        return self::SUCCESS;
    }

    private function capture(string $locale, string $baseUrl, ?Lesson $lesson, User $teacher): bool
    {
        $directory = HelpMedia::directoryFor($locale);
        File::ensureDirectoryExists($directory);

        $process = new Process(
            ['npx', 'playwright', 'test', 'tests/playwright/help-screenshots.spec.ts', '--project=chromium'],
            base_path(),
            [
                'HELP_LOCALE' => $locale,
                'HELP_OUTPUT_DIR' => $directory,
                'HELP_SHOTS' => json_encode([
                    ...($this->option('only') === 'tour' ? [] : $this->shots($baseUrl, $lesson)),
                    ...($this->option('only') === 'help' ? [] : $this->tourShots($baseUrl, $this->tourLesson($teacher, $locale) ?? $this->tourLesson($teacher, 'en') ?? $lesson)),
                ], JSON_THROW_ON_ERROR),
                'PW_BASE_URL' => $baseUrl,
                'PATH' => getenv('PATH'),
            ],
            null,
            600,
        );

        $process->run(fn (string $type, string $buffer) => $this->output->isVerbose() ? $this->output->write($buffer) : null);

        if (! $process->isSuccessful()) {
            $this->newLine();
            $this->line(trim($process->getErrorOutput() ?: $process->getOutput()));
        }

        return $process->isSuccessful();
    }

    /**
     * One entry per screenshot the help centre can show. Routes are resolved here, in PHP, so the
     * browser script never has to know the app's URL structure.
     *
     * @return list<array<string,mixed>>
     */
    private function shots(string $baseUrl, ?Lesson $lesson): array
    {
        $url = fn (string $route, array $params = []) => $baseUrl.parse_url(route($route, $params), PHP_URL_PATH)
            .(($query = parse_url(route($route, $params), PHP_URL_QUERY)) ? '?'.$query : '');

        $shots = [
            ['key' => 'dashboard', 'url' => $url('teacher.dashboard'), 'waitFor' => '[data-tour="new-lesson"]'],
            ['key' => 'new-lesson', 'url' => $url('teacher.lessons.chat'), 'settleMs' => 800],
            ['key' => 'wizard-steps', 'url' => $url('teacher.lessons.create'), 'settleMs' => 800],
            ['key' => 'lessons', 'url' => $url('teacher.lessons.index')],
            ['key' => 'classes', 'url' => $url('teacher.classes.index')],
            ['key' => 'results', 'url' => $url('teacher.results.hub')],
            // The map draws through WebGL; headless Chromium's software renderer complains no
            // matter what, so its console is reported rather than treated as a failed capture.
            ['key' => 'timemap', 'url' => $url('teacher.timemap'), 'settleMs' => 3500, 'allowConsoleErrors' => true],
            ['key' => 'settings', 'url' => $url('settings.index')],
        ];

        if ($lesson) {
            $shots[] = [
                'key' => 'wizard-configure',
                'url' => $url('teacher.lessons.wizard', ['lesson' => $lesson->id]).'?step=4',
                'settleMs' => 2500,
            ];
            $shots[] = [
                'key' => 'wizard-play',
                'url' => $url('teacher.lessons.wizard', ['lesson' => $lesson->id]).'?step=5',
                'settleMs' => 2500,
            ];
        }

        return $shots;
    }

    /**
     * The About page's product tour (App\Support\ProductTour): the same app, shot as JPEGs, each with
     * the rectangles of the elements its steps spotlight. Lesson screens use a lesson in the language
     * being captured, so a Dutch visitor sees a Dutch lesson; a language without one uses English.
     *
     * @return list<array<string,mixed>>
     */
    private function tourShots(string $baseUrl, ?Lesson $lesson): array
    {
        if (! $lesson) {
            $this->warn('No finished lesson found, so the product tour will be skipped.');

            return [];
        }

        $wizard = $baseUrl.parse_url(route('teacher.lessons.wizard', ['lesson' => $lesson->id]), PHP_URL_PATH);
        $player = $baseUrl.parse_url(route('lesson.play', ['lessonCode' => $lesson->lesson_code]), PHP_URL_PATH);
        $scenes = $lesson->scenes()->get(['id', 'kind', 'config'])->values();
        // A quiz, not a team game: the tour's last step promises a quiz. A language whose lesson
        // has none gets no quiz picture, and the tour shows the English one.
        $quizIndex = $scenes->search(fn ($scene) => $scene->kind === 'game' && ($scene->config['spec_id'] ?? null) === 'quiz');

        $pages = [
            'create' => ['url' => $baseUrl.parse_url(route('teacher.lessons.create'), PHP_URL_PATH), 'settleMs' => 800],
            'wizard-story' => ['url' => $wizard.'?step=2', 'settleMs' => 1500],
            'wizard-generate' => ['url' => $wizard.'?step=3', 'settleMs' => 2500],
            'wizard-editor' => ['url' => $wizard.'?step=4', 'settleMs' => 3500],
            'player-title' => ['url' => $player, 'settleMs' => 4000],
            // A few scenes in, past the opening title card, so the picture is a painted scene.
            'player-scene' => ['url' => $player.'?scene='.min(3, max(0, $scenes->count() - 1)), 'settleMs' => 9000, 'start' => true, 'reveal' => '[data-player-chrome="bottom"]'],
            'player-quiz' => $quizIndex === false ? null : ['url' => $player.'?scene='.$quizIndex, 'settleMs' => 9000, 'start' => true],
        ];

        $shots = [];

        foreach (ProductTour::SHOTS as $key => $shot) {
            $page = $pages[$shot['page']] ?? null;

            if ($page === null) {
                continue;
            }

            $shots[] = [
                'key' => $key,
                ...$page,
                'type' => 'jpeg',
                // Sharp on retina screens, and when the tour zooms in on a small highlight.
                'deviceScaleFactor' => 2,
                'highlights' => (object) $shot['highlights'],
                // Teacher-only chrome a visitor would never see on the board.
                'hide' => ['[data-player-chrome="top"]'],
            ];
        }

        return $shots;
    }

    /**
     * A finished lesson in the language being captured, or null to use the editor lesson. The one
     * with the most scenes: on a dev database that is the full story lesson, not a test stub.
     */
    private function tourLesson(User $teacher, string $locale): ?Lesson
    {
        return Lesson::where('teacher_id', $teacher->id)
            ->where('status', LessonStatus::Published->value)
            ->where('language', $locale)
            ->whereNotNull('lesson_code')
            ->withCount('scenes')
            ->orderByDesc('scenes_count')
            ->first();
    }

    /**
     * The account the browser will actually be signed in as. It has to be exactly the user
     * AutoLoginDev logs in, or the language is switched on one account while the screenshots are
     * taken as another — which silently produces five identical English sets.
     */
    private function demoTeacher(): ?User
    {
        $role = config('app.dev_user_role', 'admin');

        $user = match ($role) {
            'teacher' => User::where('email', 'teacher@example.com')->first(),
            'student' => User::where('email', 'student@example.com')->first(),
            default => User::where('role', 'admin')->first(),
        };

        if ($user && ! $user->isTeacher() && ! $user->isAdmin()) {
            $this->warn("APP_USER_ROLE={$role} signs in a student, who cannot see the teacher pages.");

            return null;
        }

        return $user;
    }

    private function demoLesson(User $teacher): ?Lesson
    {
        return Lesson::where('teacher_id', $teacher->id)
            ->whereIn('status', [LessonStatus::Published->value, LessonStatus::Previewable->value])
            ->when($this->option('lesson'), fn ($q, $id) => $q->whereKey($id))
            ->latest()
            ->first();
    }
}
