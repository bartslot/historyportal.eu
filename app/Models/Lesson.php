<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\LessonStatus;
use App\Enums\NarrativeFramework;
use App\Enums\TitlePosition;
use App\Models\Concerns\BelongsToTeacher;
use App\Support\LessonTypes;
use App\Support\LessonVersion;
use App\Support\MediaUrl;
use App\Support\TitlePoster;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class Lesson extends Model
{
    use BelongsToTeacher, HasFactory, SoftDeletes;

    /** "What you can expect" on the title screen: at most this many lines, each at most this long. */
    public const EXPECT_MAX_LINES = 3;

    public const EXPECT_MAX_CHARS = 60;

    /** The title column is a string(255). */
    public const TITLE_MAX_CHARS = 255;

    protected $fillable = [
        'teacher_id',
        'avatar_id',
        'region',
        'era',
        'include_game',
        'game_type',
        'game_config',
        'game_pack_path',
        'quiz_question_count',
        'quiz_timing',
        'strategy_game',
        'strategy_game_id',
        'title',
        'language',
        'translation_group',
        'title_series',
        'teacher_guide',
        'narration_edit_characters',
        'topic',
        'topic_id',
        'story_id',
        'canon_theme',
        'canon_intent',
        'focus',
        'focus_tags',
        'title_bg_path',
        'title_image',
        'title_position',
        'show_qr',
        'qr_position',
        'expect',
        'expect_default',
        'title_keep_clear',
        'title_style',
        'show_lesson_types',
        'poster_image',
        'subject',
        'grade_level',
        'tone',
        'details',
        'historical_figure',
        'lesson_code',
        'wikipedia_source',
        'script',
        'status',
        'is_public',
        'scheduled_publish_at',
        'error_message',
        'generation_attempts',
        'portrait_path',
        'audio_path',
        'slideshow_images',
        'intel_drop_enabled',
        'intel_drop_at_minutes',
        'intel_drop_script',
        'intel_drop_audio_path',
        'duration_seconds',
        'visemes_path',
        'audio_3d_path',
        'blendshapes_path',
        'image_style',
        'source_mode',
        'team_count',
        'game_split_count',
        'outline',
        'wizard_step',
        'background_music',
        'subtitles',
        'narrative_framework',
        'protagonist_qid',
        'protagonist_name',
    ];

    protected static function booted(): void
    {
        // A content change is a new version (LessonVersion); a new lesson starts at 1.
        static::updated(function (Lesson $lesson): void {
            if (LessonVersion::contentChanged($lesson->getChanges(), LessonVersion::LESSON_IGNORED)) {
                LessonVersion::changed($lesson->id);
            }
        });

        static::creating(function (Lesson $lesson): void {
            if (empty($lesson->lesson_code)) {
                do {
                    $code = strtoupper(Str::random(6));
                } while (static::where('lesson_code', $code)->exists());
                $lesson->lesson_code = $code;
            }

            if (empty($lesson->canon_theme) && $lesson->teacher_id) {
                $teacher = User::query()->find($lesson->teacher_id);
                $catalog = app(\App\Services\CanonThemeCatalog::class);

                if ($catalog->isDutchTeacher($teacher)) {
                    $lesson->canon_theme = $catalog->suggest(
                        $lesson->topic,
                        $lesson->details,
                        $lesson->focus,
                    );
                }
            }
        });

        // Keep the cached public pages fresh: any lesson save/delete (publish, status change,
        // edit, removal) drops both the landing-page list (routes/web.php home route) and this
        // lesson's player payload (LessonPlayerController), so changes show on the next request
        // instead of up to 10–30 min later.
        $forgetCaches = static function (Lesson $lesson): void {
            \App\Http\Controllers\Public\HomeController::forget();
            \App\Support\DemoLesson::forget();
            if (! empty($lesson->lesson_code)) {
                Cache::forget('lesson.player.'.strtoupper($lesson->lesson_code));
            }
        };
        static::saved($forgetCaches);
        static::deleted($forgetCaches);

        // A cover is rendered FROM the poster override, so changing the poster makes the existing
        // cover a picture of the wrong thing — and because the cover outranks the override on the
        // card, the teacher would see their change ignored. Drop it and let the card fall back to
        // the new poster until app:generate-lesson-covers renders the replacement.
        static::updating(function (Lesson $lesson): void {
            if (! $lesson->isDirty('poster_image')) {
                return;
            }

            $lesson->cover_url = null;
            Storage::disk('public')->delete("lessons/{$lesson->id}/cover.webp");
        });
    }

    protected function casts(): array
    {
        return [
            'status' => LessonStatus::class,
            'is_public' => 'boolean',
            'scheduled_publish_at' => 'datetime',
            'narrative_framework' => NarrativeFramework::class,
            'generation_attempts' => 'integer',
            'duration_seconds' => 'integer',
            'slideshow_images' => 'array',
            'intel_drop_enabled' => 'boolean',
            'intel_drop_at_minutes' => 'integer',
            'outline' => 'array',
            'game_config' => 'array',
            'teacher_guide' => 'array',
            'include_game' => 'boolean',
            'quiz_question_count' => 'integer',
            'team_count' => 'integer',
            'game_split_count' => 'integer',
            'wizard_step' => 'integer',
            'focus_tags' => 'array',
            'subtitles' => 'boolean',
            'background_music' => 'boolean',
            'title_position' => TitlePosition::class,
            'show_qr' => 'boolean',
            'expect' => 'array',
            'expect_default' => 'array',
            'title_keep_clear' => 'array',
            'content_version' => 'integer',
            'content_version_at' => 'datetime',
            'show_lesson_types' => 'boolean',
        ];
    }

    /**
     * Source attribution line for the lesson (A4). Curated catalog topics carry their dataset
     * licences; everything is grounded in Wikipedia. Returns null for legacy/uploaded sources.
     */
    public function sourceAttribution(): ?string
    {
        // Catalog stories cite their curated sources (Gutenberg book, author, license).
        if ($this->story_id && ($line = $this->story?->attributionLine())) {
            return $line;
        }

        if (str_starts_with((string) $this->topic_id, 'figure:')) {
            return 'Sources: Wikidata (CC0) · Wikipedia (CC BY-SA)';
        }
        if (str_starts_with((string) $this->topic_id, 'polity:')) {
            return 'Sources: Cliopatria / Seshat (CC BY 4.0) · Wikipedia (CC BY-SA)';
        }

        return null;
    }

    protected function normalizeHistoricalText(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        return str_ireplace(
            ['Iran/Irak', 'Iran Irak', 'Irak'],
            ['Iran/Iraq', 'Iran Iraq', 'Iraq'],
            $value
        );
    }

    public function getTitleAttribute(?string $value): ?string
    {
        return $this->normalizeHistoricalText($value);
    }

    public function getTopicAttribute(?string $value): ?string
    {
        return $this->normalizeHistoricalText($value);
    }

    // ── Relationships ───────────────────────────────────────────────────────

    public function narrator(): BelongsTo
    {
        return $this->belongsTo(Narrator::class, 'avatar_id');
    }

    /** Curated catalog story this lesson is grounded in (null for free-topic lessons). */
    public function story(): BelongsTo
    {
        return $this->belongsTo(Story::class);
    }

    public function strategyGame(): BelongsTo
    {
        return $this->belongsTo(\App\Models\StrategyGame::class);
    }

    public function teams(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(\App\Models\LessonTeam::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }

    public function quizQuestions(): HasMany
    {
        return $this->hasMany(QuizQuestion::class)->orderBy('order');
    }

    public function classrooms(): BelongsToMany
    {
        return $this->belongsToMany(Classroom::class, 'classroom_lessons')
            ->withPivot('assigned_at', 'due_at');
    }

    public function studentProgress(): HasMany
    {
        return $this->hasMany(StudentProgress::class);
    }

    public function quizScores(): HasMany
    {
        return $this->hasMany(QuizScore::class);
    }

    public function scenes(): HasMany
    {
        return $this->hasMany(Scene::class)->orderBy('order');
    }

    /** "≈ N min" on the lesson card and the player's title screen. Eager-load `scenes` when listing. */
    public function estimatedMinutes(): int
    {
        $seconds = $this->scenes->sum(fn (Scene $scene): int => $scene->timelineSeconds()['seconds']);

        return (int) ceil($seconds / 60);
    }

    /** Ordered lesson modules (Epic K) — the modular replacement for scenes. */
    public function modules(): HasMany
    {
        return $this->hasMany(LessonModule::class)->orderBy('order');
    }

    /**
     * Which wizard step a lesson card on the dashboard should open.
     *
     * A lesson that has scenes opens in the editor (step 4) instead of resuming wherever the wizard
     * was last left: opening a lesson from the dashboard means working on it. Two cases still resume
     * instead: a lesson mid-generation (its progress bar is the point) and one with no scenes yet.
     *
     * Returns null for "resume at wizard_step", which is what LessonWizard::mount() does with no
     * ?step= in the URL.
     *
     * Reads the eager-loaded firstScene relation (both dashboard controllers load it), so this
     * costs no extra query per card.
     */
    public function cardEntryStep(): ?int
    {
        if ($this->status->isGenerating() || $this->status === LessonStatus::Failed) {
            return null;
        }

        // The editor (4), not Preview (5): "edit a lesson, will still go to step 5, and not 4"
        // (Bart, 2026-10-16). Preview is one click away inside the editor (Play).
        return $this->firstScene !== null ? 4 : null;
    }

    public function firstScene(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Scene::class)->oldestOfMany('order');
    }

    public function source(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(LessonSource::class)->latestOfMany();
    }

    /** The kerndoelen, tijdvakken, kenmerkende aspecten and Canon windows this lesson covers. */
    public function curriculumGoals(): BelongsToMany
    {
        return $this->belongsToMany(CurriculumGoal::class)
            ->withPivot('fit')
            ->withTimestamps()
            ->orderByRaw("CASE type WHEN 'canonvenster' THEN 1 WHEN 'tijdvak' THEN 2 WHEN 'kenmerkend_aspect' THEN 3 ELSE 4 END")
            ->orderBy('sort');
    }

    /**
     * The other lessons in this lesson's translation group, ordered by language.
     *
     * Empty when the lesson has no group, and never includes a sibling a visitor could not open —
     * same playable rule as LessonPlayerController (published/previewable, a lesson_code to open
     * it by, has scenes), so the language switch never links to a lesson that would 404. Only the
     * same owner's lessons: a group name is a free string, and another account's lesson that shares
     * it (a guest's sandbox copy, say) is not a translation of this one.
     */
    public function translations(): \Illuminate\Database\Eloquent\Collection
    {
        if (! $this->translation_group) {
            return new \Illuminate\Database\Eloquent\Collection;
        }

        return static::query()
            ->where('translation_group', $this->translation_group)
            ->where('teacher_id', $this->teacher_id)
            ->where('id', '!=', $this->id)
            ->whereIn('status', [LessonStatus::Published, LessonStatus::Previewable])
            ->whereNotNull('lesson_code')
            ->has('scenes')
            ->orderBy('language')
            ->get();
    }

    public function startGenerationPipeline(): void
    {
        if (! $this->source()->exists()) {
            throw new \RuntimeException('Cannot start pipeline: no LessonSource attached.');
        }

        $this->update(['status' => LessonStatus::SourceReady]);
        \App\Jobs\BuildLessonOutline::dispatch($this->id);
    }

    /**
     * Persist a new module order from a list of module ids. Uses a two-phase shift to avoid the
     * (lesson_id, order) unique clash (same pattern as Scene::insertDefaultMapBlock). Ids not
     * belonging to this lesson are ignored.
     *
     * @param  list<int>  $orderedIds
     */
    public function reorderModules(array $orderedIds): void
    {
        \Illuminate\Support\Facades\DB::transaction(function () use ($orderedIds): void {
            foreach ($orderedIds as $index => $id) {
                $this->modules()->whereKey($id)->update(['order' => -1 * ($index + 1)]);
            }
            foreach ($orderedIds as $index => $id) {
                $this->modules()->whereKey($id)->update(['order' => $index]);
            }
        });
    }

    // ── Scopes ──────────────────────────────────────────────────────────────

    public function scopePublished($query)
    {
        return $query->where('status', LessonStatus::Published);
    }

    public function scopeReady($query)
    {
        return $query->whereIn('status', [LessonStatus::Ready, LessonStatus::Published]);
    }

    // ── Media URL helpers ────────────────────────────────────────────────────

    private function publicMediaUrl(?string $path): ?string
    {
        if (! $path) {
            return null;
        }
        if (MediaUrl::isRemote($path)) {
            return $path;   // a Cloudinary picture: nothing on our disk to find
        }

        $publicDisk = Storage::disk('public');

        if (! $publicDisk->exists($path) && Storage::disk('local')->exists($path)) {
            $publicDisk->put($path, Storage::disk('local')->get($path));
        }

        if (! $publicDisk->exists($path)) {
            return null;
        }

        return rtrim($this->mediaBaseUrl(), '/').'/storage/'.ltrim($path, '/');
    }

    private function mediaBaseUrl(): string
    {
        $fallback = (string) (config('app.url') ?: url('/'));

        if (app()->runningInConsole()) {
            return rtrim($fallback, '/');
        }

        try {
            return rtrim(request()->getSchemeAndHttpHost(), '/');
        } catch (\Throwable) {
            return rtrim($fallback, '/');
        }
    }

    private function publicMediaMimeType(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        $publicDisk = Storage::disk('public');

        if ($publicDisk->exists($path)) {
            try {
                $mime = $publicDisk->mimeType($path);
                if (is_string($mime) && $mime !== '') {
                    return $mime;
                }
            } catch (\Throwable) {
                // Fall back below.
            }
        }

        if (Storage::disk('local')->exists($path)) {
            $absolutePath = Storage::disk('local')->path($path);
            $mime = @mime_content_type($absolutePath);

            return is_string($mime) && $mime !== '' ? $mime : null;
        }

        return null;
    }

    private function mediaExists(?string $path): bool
    {
        return $path !== null
            && (
                Storage::disk('public')->exists($path)
                || Storage::disk('local')->exists($path)
            );
    }

    public function visemesUrl(): ?string
    {
        return $this->publicMediaUrl($this->visemes_path);
    }

    public function audioUrl(): ?string
    {
        return $this->publicMediaUrl($this->audio_path);
    }

    public function audioMimeType(): ?string
    {
        return $this->publicMediaMimeType($this->audio_path);
    }

    public function portraitUrl(): string
    {
        return $this->publicMediaUrl($this->portrait_path) ?? asset('assets/professor.webp');
    }

    /**
     * Best available card/cover image for the lesson, in priority order:
     *   1. worldhistory.org hero image (colorful, editorial quality)
     *   2. Narrator portrait
     *   3. Generic placeholder
     */
    /** Flag of the lesson's territory (polity), if the catalog flag was downloaded. */
    public function territoryFlagUrl(): ?string
    {
        if (! str_starts_with((string) $this->topic_id, 'polity:')) {
            return null;
        }
        $qid = substr((string) $this->topic_id, strlen('polity:'));

        return file_exists(public_path("flags/{$qid}.png")) ? asset("flags/{$qid}.png") : null;
    }

    /**
     * The series whose title posters and wordmark this lesson wears: its own title_series, else its
     * translation_group. A copy keeps the series without joining the original's language switch.
     */
    public function titleSeries(): ?string
    {
        return $this->title_series ?: $this->translation_group;
    }

    /** The series wordmark (public/lesson-logos/{series}.svg), when there is one. */
    public function titleLogoUrl(): ?string
    {
        $group = (string) $this->titleSeries();

        return $group !== '' && preg_match('/^[a-z0-9][a-z0-9-]*$/', $group) && is_file(public_path("lesson-logos/{$group}.svg"))
            ? asset("lesson-logos/{$group}.svg")
            : null;
    }

    /**
     * The title styles this lesson can show, in the picker's order: the series' comic candidates
     * (public/lesson-titles/{group}/{candidate}/, by their `order`), then the logo when the series
     * has one, then the lettered title (ComicRoma) and the plain title, which always work. The
     * first is the default.
     *
     * @return list<array{key: string, label: string, thumb_url: ?string}>
     */
    public function titleChoices(): array
    {
        $choices = array_map(
            fn (array $c): array => ['key' => $c['key'], 'label' => $c['label'], 'thumb_url' => $c['thumb_url']],
            TitlePoster::candidates($this->titleSeries()),
        );
        $logo = $this->titleLogoUrl();
        if ($logo !== null) {
            $choices[] = ['key' => TitlePoster::LOGO, 'label' => __('Logo'), 'thumb_url' => $logo];
        }
        $choices[] = ['key' => TitlePoster::LETTERS, 'label' => __('Letters'), 'thumb_url' => $this->titleBgUrl()];
        $choices[] = ['key' => TitlePoster::PLAIN, 'label' => __('Plain title'), 'thumb_url' => $this->titleBgUrl()];

        return $choices;
    }

    /**
     * Story-game publish gate: every branch OPTION scene must carry meter deltas
     * (config.branch_effects.deltas) before the lesson can go live, or the player would show a
     * choice with no consequences. A lesson that is not a story game has none.
     *
     * @return list<int> incomplete branch group numbers, ascending
     */
    public function incompleteStoryGameGroups(): array
    {
        if ($this->game_type !== 'story_game') {
            return [];
        }

        return $this->scenes()
            ->whereIn('branch_role', ['option_a', 'option_b'])
            ->get()
            ->filter(fn (Scene $s) => empty((($s->config ?? [])['branch_effects']['deltas'] ?? null)))
            ->map(fn (Scene $s) => (int) ($s->branch_group ?? 0))
            ->unique()
            ->sort()
            ->values()
            ->all();
    }

    /**
     * The title's two parts as the title screen shows them: the series, and the subtitle after the
     * first ": " (resources/js/title-letters.js splitTitle).
     *
     * @return array{series: string, subtitle: string}
     */
    public function titleParts(): array
    {
        $title = (string) $this->title;
        $at = strpos($title, ': ');

        return $at === false
            ? ['series' => $title, 'subtitle' => '']
            : ['series' => substr($title, 0, $at), 'subtitle' => substr($title, $at + 2)];
    }

    /**
     * The poster the title screen draws (a comic candidate), or null for the logo, letters and plain styles.
     *
     * @return array<string, mixed>|null
     */
    public function titlePoster(): ?array
    {
        $style = $this->titleStyle();

        $poster = in_array($style, TitlePoster::BUILT_IN, true) ? null : TitlePoster::for($this->titleSeries(), $style);

        // A picture the teacher picked is the title screen's picture, whichever poster draws it,
        // upright on a phone as well.
        if ($poster && trim((string) $this->title_image) !== '') {
            $picture = (string) $this->titleBgUrl();
            $poster = TitlePoster::withPicture($poster, $picture);
            if ($poster['portrait'] ?? null) {
                $poster['portrait'] = TitlePoster::withPicture($poster['portrait'], $picture);
            }
        }

        return $poster;
    }

    /**
     * The upright comic poster as one still picture (a tall card, a tall share image), while the
     * comic poster is this lesson's title style; null for the logo, letters and plain styles.
     */
    public function titlePosterStillUrl(): ?string
    {
        $still = $this->titlePoster()['portrait']['still_url'] ?? null;

        return is_string($still) ? $still : null;
    }

    /**
     * The picture for a tall card (2:3, 5:8): the upright poster's still while the comic poster is
     * the title style, even over poster_image (the composer fills that with a landscape photo);
     * otherwise the card picture as everywhere.
     */
    public function tallCardImageUrl(): ?string
    {
        return $this->titlePosterStillUrl() ?? $this->seriesPosterStillUrl() ?? $this->cardImageUrl();
    }

    /**
     * The series' upright still while a comic style WITHOUT an upright version (the cover, the
     * banner) is the title style: the tall card still gets the real poster, never a landscape
     * photo cropped tall (Bart, 2026-10-20). Null for the logo, letters and plain styles.
     */
    private function seriesPosterStillUrl(): ?string
    {
        if (in_array($this->titleStyle(), TitlePoster::BUILT_IN, true)) {
            return null;
        }
        foreach (TitlePoster::candidates($this->titleSeries()) as $candidate) {
            $still = TitlePoster::for($this->titleSeries(), $candidate['key'])['portrait']['still_url'] ?? null;
            if (is_string($still)) {
                return $still;
            }
        }

        return null;
    }

    /** The style the title screen shows: the teacher's choice while the series has it, else the first. */
    public function titleStyle(): string
    {
        $keys = array_column($this->titleChoices(), 'key');
        $chosen = TitlePoster::key($this->title_style);

        return in_array($chosen, $keys, true) ? $chosen : $keys[0];
    }

    /**
     * A copy of this lesson that draws its title in $style. Never saved: the title-style picker's
     * miniatures show each style of the real title screen this way (player ?title_preview&title_style=).
     */
    public function withTitleStyle(string $style): static
    {
        $copy = clone $this;
        $copy->title_style = $style;

        return $copy;
    }

    /**
     * The player URL that frames this lesson's title screen, in $style when given (a picker tile) or
     * the lesson's own style. The `v` changes with every title setting, so a frame reloads exactly
     * when there is something new to show.
     */
    public function titlePreviewSrc(?string $style = null): string
    {
        $version = substr(md5(implode('|', [
            $this->title_image, $this->title_position?->value, (int) $this->show_qr,
            $this->title_style, (int) ($this->show_lesson_types ?? true),
            $this->title, $this->qrPosition(), json_encode($this->expect),
            $this->updated_at?->getTimestampMs(),
        ])), 0, 10);
        $query = http_build_query(array_filter([
            'embed' => 1,
            'title_preview' => 1,
            'title_style' => $style,
            'v' => $version,
        ], fn (mixed $value): bool => $value !== null));

        return route('lesson.play', $this->lesson_code).'?'.$query;
    }

    /**
     * The lesson-type badges the title screen shows (LessonTypes), none when the teacher hid them.
     *
     * @return list<string>
     */
    public function titleBadges(): array
    {
        return ($this->show_lesson_types ?? true) ? LessonTypes::of($this) : [];
    }

    /**
     * The title screen's join QR: shown ('auto': its one place, the bottom rail's right end,
     * title-qr.js) or hidden. A corner stored before 2026-10-17 is ignored (Bart: "you should be
     * able to hide it only"); show_qr keeps a hidden one hidden.
     */
    public function qrPosition(): string
    {
        return ($this->show_qr ?? true) ? 'auto' : 'hidden';
    }

    /**
     * "What you can expect" lines for the title screen: 1-3 short lines, trimmed, empties dropped.
     * Null when there are none (then nothing is drawn).
     *
     * @return list<string>|null
     */
    public static function cleanExpect(mixed $lines): ?array
    {
        $out = [];
        foreach (is_array($lines) ? $lines : [] as $line) {
            $line = is_string($line) ? trim((string) preg_replace('/\s+/u', ' ', $line)) : '';
            if ($line !== '') {
                $out[] = mb_substr($line, 0, self::EXPECT_MAX_CHARS);
            }
        }
        $out = array_slice($out, 0, self::EXPECT_MAX_LINES);

        return $out === [] ? null : $out;
    }

    /** The title screen's picture: the teacher's choice, else the automatic lead image. */
    public function titleBgUrl(): ?string
    {
        $chosen = trim((string) ($this->title_image ?? ''));
        if ($chosen !== '') {
            // Picked from the lesson's own pictures, kept site-relative like poster_image.
            return str_starts_with($chosen, '/') ? $chosen : $this->publicMediaUrl($chosen);
        }

        return $this->title_bg_path ? $this->publicMediaUrl($this->title_bg_path) : null;
    }

    /**
     * Scenic portrait of the lesson's protagonist (Wikidata P18), resolved from the read-only
     * corpus by QID. People-topic lessons should show the person, never a flag. Cached per QID
     * (the corpus is static) so per-card resolution on a list page stays O(1) and survives a
     * dropped pooler connection without caching the transient failure.
     */
    public function protagonistImageUrl(): ?string
    {
        $url = $this->protagonistImageUrlFull();
        if ($url === null) {
            return null;
        }

        // Bound the raw Wikimedia original so even the pre-cover fallback <img> never pulls a
        // multi-MB file. Cover generation uses the unbounded full-size original instead.
        return $this->boundedWikimediaImageUrl($url, 600);
    }

    /**
     * Full-size protagonist portrait URL (corpus P18) with no thumbnail bound — the best source
     * for a high-quality cover crop. Cached per QID for a week (the corpus is static); a transient
     * corpus failure is never cached so the next request retries.
     */
    public function protagonistImageUrlFull(): ?string
    {
        if (! $this->protagonist_qid) {
            return null;
        }

        $key = "figure_image:{$this->protagonist_qid}";
        $cached = Cache::get($key);
        if ($cached !== null) {
            return $cached ?: null; // '' is the cached "known to have no portrait" sentinel
        }

        try {
            $url = \App\Models\Corpus\Figure::on('pgsql_corpus')
                ->where('qid', $this->protagonist_qid)
                ->value('image_url');
        } catch (\Throwable $e) {
            return null; // corpus unreachable — don't cache, retry next request
        }

        Cache::put($key, $url ?? '', now()->addWeek());

        return $url ?: null;
    }

    /**
     * Append a bounded thumbnail width to a Wikimedia Special:FilePath URL (preserving any existing
     * query string) so an <img> never streams a multi-MB original. Non-Wikimedia URLs are returned
     * unchanged.
     */
    private function boundedWikimediaImageUrl(string $url, int $width): string
    {
        if (! str_contains($url, 'Special:FilePath') || str_contains($url, 'width=')) {
            return $url;
        }

        $separator = str_contains($url, '?') ? '&' : '?';

        return $url.$separator.'width='.$width;
    }

    /**
     * Public URL for the pre-rendered local WebP cover, or null if it hasn't been generated yet.
     * Built exactly like publicMediaUrl() so it matches every other media URL on the model.
     */
    public function coverImageUrl(): ?string
    {
        // The CDN copy wins: same picture, served as a small WebP from Cloudinary instead of
        // off our own box. Written by app:generate-lesson-covers; null until it has run with
        // Cloudinary configured, and the local file below carries the page until then.
        if ($cdn = trim((string) ($this->cover_url ?? ''))) {
            return $cdn;
        }

        $path = "lessons/{$this->id}/cover.webp";

        if (! Storage::disk('public')->exists($path)) {
            return null;
        }

        return rtrim($this->mediaBaseUrl(), '/').'/storage/'.ltrim($path, '/');
    }

    /**
     * Public wrapper around the private publicMediaUrl() so the cover-generation command can
     * resolve a storage-path source image without duplicating URL-building logic.
     */
    public function coverSourceMediaUrl(?string $path): ?string
    {
        return $this->publicMediaUrl($path);
    }

    /**
     * Best SCENIC cover for the lesson, in priority order. Never a flag or a bare map: the
     * Wikipedia title image (which is a flag/map for some empires) sits below the protagonist
     * portrait, the generated scene, and the editorial hero — so person-led empire lessons show
     * the person. The pre-filtered slideshow art is a safety net before the narrator headshot.
     */
    public function cardImageUrl(): ?string
    {
        // The pre-rendered WebP cover (small, cropped, CDN-hosted) wins outright — including over
        // a teacher's poster override, because the cover is RENDERED FROM whatever the chain below
        // picked. The override decides WHICH picture the card shows; the cover decides how it is
        // delivered. Choosing the override here instead meant an overridden poster shipped as a
        // multi-megabyte original for ever, which is most of them.
        if ($url = $this->coverImageUrl()) {
            return $url;
        }

        return $this->cardImageSourceUrl();
    }

    /**
     * The card image chain WITHOUT the pre-rendered cover — i.e. the original artwork a cover is
     * rendered from, and what a card shows until one exists.
     *
     * Public because app:generate-lesson-covers needs exactly this: it used to keep its own copy
     * of the chain, which silently drifted (it was missing the slideshow art and narrator portrait
     * steps), so lessons whose only image came from those reported "no source image available"
     * and their cards went on serving multi-megabyte originals for ever.
     */
    public function cardImageSourceUrl(): ?string
    {
        // 0. A teacher-chosen poster always wins — it's the explicit override.
        if ($url = $this->posterOverrideUrl()) {
            return $url;
        }

        // 1. People: scenic portrait/painting of the protagonist (corpus P18).
        if ($url = $this->protagonistImageUrl()) {
            return $url;
        }

        // 2. First scene's generated panorama (skybox preferred, then the base scene image).
        if ($this->relationLoaded('firstScene') && $this->firstScene) {
            $url = $this->publicMediaUrl($this->firstScene->skybox_image_path)
                  ?? $this->publicMediaUrl($this->firstScene->image_path);
            if ($url) {
                return $url;
            }
        }

        // 3. Editorial hero image (worldhistory.org), when the source provided one.
        if ($this->relationLoaded('source') && $this->source?->hero_image_path) {
            if ($url = $this->publicMediaUrl($this->source->hero_image_path)) {
                return $url;
            }
        }

        // 4. Wikipedia title-screen image — scenic for most topics (a flag/map only for some
        //    empires, which are person-led and already covered by step 1).
        if ($this->title_bg_path) {
            if ($url = $this->publicMediaUrl($this->title_bg_path)) {
                return $url;
            }
        }

        // 5. Curated slideshow art (Europeana/Wikimedia, pre-filtered to drop flags/maps/icons).
        foreach ($this->slideshowImages() as $img) {
            if (! empty($img['url'])) {
                return $img['url'];
            }
        }

        // 6. Narrator portrait — last resort headshot.
        if ($this->portrait_path) {
            return $this->publicMediaUrl($this->portrait_path);
        }

        return null;
    }

    /** The teacher's explicit poster override as a usable URL, or null when unset. */
    public function posterOverrideUrl(): ?string
    {
        $poster = trim((string) ($this->poster_image ?? ''));
        if ($poster === '') {
            return null;
        }

        // Our own storage, saved as a full URL (the picker stored the address it was shown):
        // that address dies with the host that wrote it (another port, the renamed domain), so
        // keep only the same-site path.
        if (preg_match('#^(?:https?:)?//[^/]+(/storage/.+)$#i', $poster, $own)) {
            return $own[1];
        }

        // Full URLs (Cloudinary/Commons) and root-relative paths pass through; a bare storage
        // path is resolved on the public disk like every other stored image.
        return preg_match('#^(https?:)?//#i', $poster) || str_starts_with($poster, '/')
            ? $poster
            : $this->publicMediaUrl($poster);
    }

    /**
     * The lesson's poster — NEVER empty. The teacher's override wins; otherwise the first image
     * already loaded in the lesson (auto-pick), then the general card fallback chain, and finally
     * the narrator portrait (which itself has a built-in placeholder).
     */
    public function posterUrl(): string
    {
        return $this->posterOverrideUrl()
            ?? ($this->posterCandidates()[0]['url'] ?? null)
            ?? $this->cardImageUrl()
            ?? $this->portraitUrl();
    }

    /**
     * Every image already loaded in this lesson, as picker candidates. Unions the lesson-level
     * imagery with each scene's imagery (generated art, skyboxes, and voyage/gallery config images),
     * de-duplicated, so a teacher can pick any of them as the poster.
     *
     * @return array<int,array{url:string,label:string}>
     */
    /**
     * This lesson's own artwork, packed into one sprite sheet for the hero timewarp.
     *
     * Built by `lessons:build-warp-atlas`, which puts the cell count in the filename so the
     * browser can slice the sheet without a database column. Null when no sheet has been built,
     * in which case the hero simply flies through the generic history cards.
     *
     * @return array{url: string, cells: int}|null
     */
    public function warpAtlas(): ?array
    {
        foreach (Storage::disk('public')->files("lessons/{$this->id}") as $file) {
            if (preg_match('/warp-atlas-(\d+)\.webp$/', $file, $match)) {
                return ['url' => Storage::disk('public')->url($file), 'cells' => (int) $match[1]];
            }
        }

        return null;
    }

    /**
     * One picture per scene, in scene order, for the poster's "Scene" choice: its generated image,
     * else its first shot's picture, else a diorama's background, else its panorama.
     *
     * @return array<int, array{url: string, label: string}>
     */
    public function scenePosterOptions(): array
    {
        $out = [];
        foreach ($this->scenes()->ordered()->get() as $i => $scene) {
            if ($url = $this->scenePosterUrl($scene)) {
                $out[] = ['url' => $url, 'label' => __('Scene :n', ['n' => $i + 1])];
            }
        }

        return $out;
    }

    /** The one picture that stands for a scene: its image, else its first shot, plate or panorama. */
    private function scenePosterUrl(Scene $scene): ?string
    {
        $cfg = $scene->config ?? [];
        $shot = ($scene->shots ?? [])[0] ?? [];
        $plate = $cfg['diorama']['plate'] ?? null;
        $plateUrl = is_array($plate) && ! empty($plate['image'])
            ? (preg_match('#^(https?:)?//|^/#', $plate['image']) ? $plate['image'] : ($plate['base'] ?? '').$plate['image'])
            : null;

        return $this->publicMediaUrl($scene->image_path)
            ?? $this->publicMediaUrl($shot['bg_path'] ?? $shot['image_path'] ?? null)
            ?? $plateUrl
            ?? $this->publicMediaUrl($scene->skybox_image_path);
    }

    public function posterCandidates(): array
    {
        $out = [];
        $push = function (?string $url, string $label) use (&$out): void {
            $url = trim((string) $url);
            if ($url !== '' && ! isset($out[$url])) {
                $out[$url] = ['url' => $url, 'label' => $label];
            }
        };

        // Lesson-level imagery.
        if ($u = $this->publicMediaUrl($this->title_bg_path)) {
            $push($u, __('Title background'));
        }
        foreach ($this->slideshowImages() as $img) {
            $push($img['url'] ?? null, $img['title'] ?? __('Slideshow image'));
        }

        // Scene by scene: its picture (the poster's "Scene" choice), then everything else that scene
        // holds, so a split panel sits right after its own scene instead of after every scene's
        // picture (it fell off the Library shelf in long lessons). Voyage/gallery URLs are absolute.
        // Every label names its scene ("Scene 5, panel 2"): the shelf dedupes on the URL, so when
        // scene 5's main picture repeats scene 4's, scene 5's tile drops out and its panels used
        // to sit under scene 4's tile looking like scene 4's (pair test 2026-10-24).
        foreach ($this->scenes()->ordered()->get()->values() as $i => $scene) {
            $n = $i + 1;
            $push($this->scenePosterUrl($scene), __('Scene :n', ['n' => $n]));
            $push($this->publicMediaUrl($scene->skybox_image_path), __('Scene :n, panorama', ['n' => $n]));
            $push($this->publicMediaUrl($scene->image_path), __('Scene :n', ['n' => $n]));
            // Every shot / split panel holds its own picture; a panel left behind by going back
            // to one picture is still the teacher's image and must stay findable.
            foreach (array_values($scene->shots ?? []) as $p => $shot) {
                foreach (['image_path', 'bg_path', 'hero_path'] as $key) {
                    $push($this->publicMediaUrl(is_array($shot) ? ($shot[$key] ?? null) : null), __('Scene :n, panel :p', ['n' => $n, 'p' => $p + 1]));
                }
            }
            $cfg = $scene->config ?? [];
            foreach (($cfg['stop_images'] ?? []) as $u) {
                $push(is_string($u) ? $u : ($u['url'] ?? null), __('Landfall image'));
            }
            foreach (($cfg['images'] ?? []) as $u) {
                $push(is_array($u) ? ($u['url'] ?? null) : $u, __('Gallery image'));
            }
            foreach ((($cfg['gallery'] ?? [])['images'] ?? []) as $u) {
                $push(is_array($u) ? ($u['url'] ?? null) : $u, __('Gallery image'));
            }
        }

        return array_values($out);
    }

    /**
     * Return slideshow images stored from Europeana/Wikimedia.
     * Each entry: {url, thumb, title, attribution, source, link}
     *
     * @return array<int, array{url:string, thumb:string, title:string, attribution:string, source:string, link:string|null}>
     */
    public function slideshowImages(): array
    {
        return is_array($this->slideshow_images) ? $this->slideshow_images : [];
    }

    /**
     * Whether slideshow images have been fetched for this lesson.
     */
    public function hasSlideshowImages(): bool
    {
        return ! empty($this->slideshow_images);
    }

    /**
     * Whether any scene speaks in balloons (config.lines, drawn by BalloonLayer.js): the player
     * preloads the balloon font only then.
     */
    public function hasBalloons(): bool
    {
        return $this->scenes->contains(fn (Scene $scene) => ! empty($scene->config['lines'] ?? null));
    }

    // ── Status helpers ───────────────────────────────────────────────────────

    public function isReady(): bool
    {
        return in_array($this->status, [LessonStatus::Ready, LessonStatus::Published])
            && $this->hasGeneratedAssets();
    }

    public function isGenerating(): bool
    {
        return $this->status === LessonStatus::Generating;
    }

    public function canRetry(): bool
    {
        return $this->status === LessonStatus::Failed
            && $this->generation_attempts < config('lessons.max_generation_attempts', 3);
    }

    public function hasGeneratedAssets(): bool
    {
        return $this->script !== null
            && $this->quizQuestions()->exists()
            && $this->mediaExists($this->audio_path);
    }
}
