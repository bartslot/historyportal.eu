<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\LessonComposer;
use App\Services\LessonExporter;
use App\Support\TitlePoster;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Title screens as an open set of candidates: a series' folders under public/lesson-titles/{group}/
 * found and ordered, a new one picked up with no code, the teacher's choice (a candidate, logo or
 * plain) with its default and reset, the old enum values mapped, what the player receives, and the
 * spec round trip.
 */
class TitlePosterTest extends TestCase
{
    use RefreshDatabase;

    private const SCRATCH = 'titleposter-test';

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(public_path('lesson-titles/'.self::SCRATCH));
        File::deleteDirectory(public_path('lesson-titles/tasman-standard/zz-test-candidate'));
        parent::tearDown();
    }

    private function lesson(?string $group, array $extra = []): Lesson
    {
        $lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'title' => 'Abel Tasman: De reis naar het onbekende',
            'topic' => 'X', 'subject' => 'history', 'grade_level' => '9th', 'language' => 'nl',
            'image_style' => 'cinematic', 'status' => LessonStatus::Published, 'translation_group' => $group,
        ] + $extra);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'Eens.', 'status' => 'ready']);

        return $lesson;
    }

    /** A candidate folder written as data only: a poster.json and one picture. */
    private function candidate(string $group, string $key, array $meta): void
    {
        $dir = public_path("lesson-titles/{$group}/{$key}");
        File::ensureDirectoryExists($dir);
        File::copy(public_path('lesson-titles/tasman-standard/poster/letter-a.svg'), "{$dir}/letter-a.svg");
        File::put("{$dir}/poster.json", json_encode($meta + [
            'frame' => ['w' => 1000, 'h' => 600],
            'layers' => [['id' => 'a', 'src' => 'letter-a.svg', 'box' => ['x' => 10, 'y' => 10, 'w' => 20, 'h' => 30], 'enter' => 'drop']],
        ]));
    }

    public function test_the_tasman_poster_is_found_with_every_file_resolved_and_present(): void
    {
        $poster = TitlePoster::for('tasman-standard', 'poster');

        $this->assertNotNull($poster);
        $this->assertSame('#F03E4A', $poster['background']);
        $this->assertCount(17, $poster['layers']);
        foreach ($poster['layers'] as $layer) {
            $this->assertFileExists(public_path(parse_url($layer['url'], PHP_URL_PATH)));
        }
        $this->assertStringEndsWith('/lesson-titles/tasman-standard/poster/mask.svg', $poster['groups']['scene']['mask_url']);
        $this->assertSame(['x' => 90.0, 'y' => 84.0, 'color' => '#000000'], $poster['groups']['tasman']['shadow']);

        $layers = collect($poster['layers'])->keyBy('id');
        // Ambient motion goes through the one whitelist the scene layers use.
        $this->assertSame('swell', $layers['swell-far']['ambient']);
        $this->assertSame('roll', $layers['voc-ships']['ambient']);
        $this->assertSame(['x', 0.88], [$layers['wave-break']['flip'], $layers['wave-break']['rotate']]);
        $this->assertNull($layers['a']['ambient']);
    }

    public function test_no_folder_or_a_climbing_group_or_candidate_has_no_poster(): void
    {
        $this->assertNull(TitlePoster::for(null, 'poster'));
        $this->assertNull(TitlePoster::for('no-such-series', 'poster'));
        $this->assertNull(TitlePoster::for('../lesson-titles/tasman-standard', 'poster'));
        $this->assertNull(TitlePoster::for('tasman-standard', '../dante/poster'));
        $this->assertFalse(TitlePoster::exists('Tasman-Standard', 'poster'));
        $this->assertSame([], TitlePoster::candidates('../lesson-titles'));
        $this->assertSame([], TitlePoster::candidates(null));
    }

    public function test_the_series_candidates_are_found_by_order_and_the_first_is_the_default(): void
    {
        app()->setLocale('nl');
        $candidates = TitlePoster::candidates('tasman-standard');

        $this->assertSame(['poster', 'cover', 'banner'], array_column($candidates, 'key'));
        $this->assertSame(['Stripposter', 'Stripcover', 'Stripbanner'], array_column($candidates, 'label'));
        foreach ($candidates as $c) {
            $this->assertNotNull(TitlePoster::for('tasman-standard', $c['key']), "{$c['key']} must parse");
            $this->assertNotNull($c['thumb_url'], "{$c['key']} has a picker thumbnail");
            $this->assertFileExists(public_path(parse_url($c['thumb_url'], PHP_URL_PATH)));
        }

        $tasman = $this->lesson('tasman-standard');
        $this->assertSame(['poster', 'cover', 'banner', 'logo', 'plain'], array_column($tasman->titleChoices(), 'key'));
        $this->assertSame('poster', $tasman->titleStyle());

        $plain = $this->lesson(null);
        $this->assertSame(['plain'], array_column($plain->titleChoices(), 'key'));
        $this->assertSame('plain', $plain->titleStyle());

        // A stored choice the series cannot show falls back to the default.
        $plain->update(['title_style' => 'banner']);
        $this->assertSame('plain', $plain->fresh()->titleStyle());
    }

    public function test_a_new_candidate_is_data_only_a_folder_and_a_poster_json(): void
    {
        $this->candidate(self::SCRATCH, 'second', ['label' => ['nl' => 'Tweede', 'en' => 'Second'], 'order' => 20]);
        $this->candidate(self::SCRATCH, 'first', ['label' => 'Comic poster', 'order' => 10, 'thumb' => 'letter-a.svg']);
        $this->candidate(self::SCRATCH, 'unnamed', []);
        // A folder that is not a candidate: no poster.json, or a reserved name.
        File::ensureDirectoryExists(public_path('lesson-titles/'.self::SCRATCH.'/scraps'));
        $this->candidate(self::SCRATCH, 'plain', ['order' => 1]);

        app()->setLocale('en');
        $this->assertSame([
            ['key' => 'first', 'label' => 'Comic poster', 'order' => 10, 'thumb_url' => asset('lesson-titles/'.self::SCRATCH.'/first/letter-a.svg')],
            ['key' => 'second', 'label' => 'Second', 'order' => 20, 'thumb_url' => null],
            ['key' => 'unnamed', 'label' => 'Unnamed', 'order' => PHP_INT_MAX, 'thumb_url' => null],
        ], TitlePoster::candidates(self::SCRATCH));

        // And a real series offers it in the teacher's picker and the player draws it, no code changed.
        $this->candidate('tasman-standard', 'zz-test-candidate', ['label' => ['en' => 'Brand new'], 'order' => 99]);
        $lesson = $this->lesson('tasman-standard');
        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->assertSeeText('Brand new')
            ->assertSee('data-title-choice="zz-test-candidate"', false)
            ->call('setTitleStyle', 'zz-test-candidate');
        $this->assertSame('zz-test-candidate', $lesson->fresh()->title_style);
        $html = $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))->assertOk()->getContent();
        $this->assertMatchesRegularExpression('#lesson-titles\\\\?/tasman-standard\\\\?/zz-test-candidate\\\\?/letter-a\.svg#', $html);
    }

    public function test_the_old_style_values_are_mapped_by_the_migration_and_on_read(): void
    {
        $lesson = $this->lesson('tasman-standard');
        DB::table('lessons')->where('id', $lesson->id)->update(['title_style' => 'comic']);
        $this->assertSame('poster', $lesson->fresh()->titleStyle(), 'read fallback');

        $migration = require database_path('migrations/2026_10_14_000001_title_candidates_and_lesson_type_badges.php');
        $migration->down();
        $migration->up();

        $this->assertSame('poster', DB::table('lessons')->where('id', $lesson->id)->value('title_style'));
        $this->assertSame('poster', TitlePoster::key('comic'));
        $this->assertSame('cover', TitlePoster::key('cover'));
        $this->assertNull(TitlePoster::key('../dante'));
    }

    public function test_the_player_draws_the_poster_by_default_and_the_logo_or_plain_title_on_request(): void
    {
        $lesson = $this->lesson('tasman-standard');
        Scene::create(['lesson_id' => $lesson->id, 'order' => 2, 'kind' => 'game', 'game_type' => 'team', 'status' => 'ready']);
        $play = fn () => $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))->assertOk()->getContent();

        $html = $play();
        $this->assertStringContainsString('"title_style":"poster"', $html);
        $this->assertStringContainsString('family=Coming+Soon', $html);
        $this->assertMatchesRegularExpression('#lesson-titles\\\\?/tasman-standard\\\\?/poster\\\\?/mask\.svg#', $html);
        $this->assertStringContainsString('"title_logo_url":null', $html);
        // The flat poster's letters fill the bottom right: its badges stand in a column at the side.
        $this->assertMatchesRegularExpression('#<ul class="[^"]*\bflex-col\b[^"]*"[^>]*data-lesson-types#', $html);

        $lesson->update(['title_style' => 'banner']);
        $html = $play();
        $this->assertStringContainsString('"title_style":"banner"', $html);
        $this->assertMatchesRegularExpression('#lesson-titles\\\\?/tasman-standard\\\\?/banner\\\\?/painting-gulls\.webp#', $html);
        $this->assertStringContainsString('family=Coming+Soon', $html);
        $this->assertDoesNotMatchRegularExpression('#<ul class="[^"]*\bflex-col\b[^"]*"[^>]*data-lesson-types#', $html, 'the banner keeps Figma\'s row');

        $lesson->update(['title_style' => 'logo']);
        $html = $play();
        $this->assertStringContainsString('"title_poster":null', $html);
        $this->assertMatchesRegularExpression('#lesson-logos\\\\?/tasman-standard\.svg#', $html);
        $this->assertStringNotContainsString('family=Coming+Soon', $html);

        $lesson->update(['title_style' => 'plain']);
        $html = $play();
        $this->assertStringContainsString('"title_poster":null', $html);
        $this->assertStringContainsString('"title_logo_url":null', $html);
    }

    public function test_the_teacher_picks_and_resets_the_style_in_the_title_screen_format(): void
    {
        $lesson = $this->lesson('tasman-standard');
        $component = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->assertSeeText('Title style')
            ->assertSeeText('Comic poster')
            ->assertSeeText('Comic banner')
            ->assertSee('data-title-choice="cover"', false);
        $before = $component->get('titleFrameSrc');

        $component->call('setTitleStyle', 'banner');
        $this->assertSame('banner', $lesson->fresh()->title_style);
        $this->assertNotSame($before, $component->get('titleFrameSrc'));
        $component->assertSeeText('Reset to default');

        $component->call('setTitleStyle', 'nonsense');
        $this->assertSame('banner', $lesson->fresh()->title_style);

        $component->call('resetTitleStyle');
        $this->assertNull($lesson->fresh()->title_style);
        $this->assertSame('poster', $lesson->fresh()->titleStyle());
    }

    public function test_a_style_the_series_cannot_show_is_refused(): void
    {
        $lesson = $this->lesson(null);

        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->assertDontSeeText('Title style')
            ->call('setTitleStyle', 'poster');

        $this->assertNull($lesson->fresh()->title_style);
    }

    public function test_compose_and_export_round_trip_the_style_and_leave_it_alone_when_unset(): void
    {
        Storage::fake('public');
        $spec = [
            'key' => 'Poster round trip', 'title' => 'Abel Tasman: Test', 'translation_group' => 'tasman-standard',
            'title_style' => 'banner', 'show_lesson_types' => false,
            'scenes' => [['type' => 'story', 'chapter' => 'Begin', 'script' => 'Eens.']],
        ];
        $composer = app(LessonComposer::class);

        $lesson = $composer->build($spec, $this->teacher, false);
        $this->assertSame('banner', $lesson->fresh()->title_style);
        $this->assertFalse($lesson->fresh()->show_lesson_types);
        $exported = app(LessonExporter::class)->toSpec($lesson->fresh());
        $this->assertSame(['banner', false], [$exported['title_style'], $exported['show_lesson_types']]);

        // A spec without the keys keeps whatever the teacher chose; an old spec's 'comic' is the poster.
        $lesson->update(['title_style' => 'logo', 'show_lesson_types' => true]);
        unset($spec['title_style'], $spec['show_lesson_types']);
        $composer->build($spec, $this->teacher, false);
        $this->assertSame(['logo', true], [$lesson->fresh()->title_style, $lesson->fresh()->show_lesson_types]);
        $composer->build($spec + ['title_style' => 'comic'], $this->teacher, false);
        $this->assertSame('poster', $lesson->fresh()->title_style);

        // The defaults export as nothing, so a rebuilt lesson keeps the defaults too.
        $lesson->update(['title_style' => null]);
        $exported = app(LessonExporter::class)->toSpec($lesson->fresh());
        $this->assertArrayNotHasKey('title_style', $exported);
        $this->assertArrayNotHasKey('show_lesson_types', $exported);

        $this->expectException(\InvalidArgumentException::class);
        $composer->build($spec + ['title_style' => 'Not A Key'], $this->teacher, false);
    }
}
