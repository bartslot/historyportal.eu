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

    /**
     * The upright Tasman poster (Bart, 2026-10-17, Figma 2353:1311): portrait.json beside the
     * candidate's poster.json, the same data model, read by the same parser. A phone held upright
     * shows it (resources/js/title-poster.js variantFor); the landscape poster is unchanged.
     */
    public function test_the_tasman_poster_has_an_upright_variant_with_every_file_present(): void
    {
        $poster = TitlePoster::for('tasman-standard', 'poster');
        $portrait = $poster['portrait'];

        $this->assertNotNull($portrait);
        $this->assertSame(['w' => 1604.0, 'h' => 2456.0], $portrait['frame']);
        $this->assertSame('#F03E4A', $portrait['background']);
        $this->assertSame(['tasman', 'a', 'b', 'e', 'l', 't', 'a2', 's', 'm', 'a1', 'n'], array_column($portrait['layers'], 'id'));
        foreach ($portrait['layers'] as $layer) {
            $this->assertFileExists(public_path(parse_url($layer['url'], PHP_URL_PATH)));
        }
        $this->assertSame(10, count(array_filter($portrait['layers'], fn (array $l) => $l['enter'] === 'drop')));
        // The subtitle stays live text, so it translates; Figma sets it at 42 on the 1604 frame.
        $this->assertEqualsWithDelta(2.6185, $portrait['subtitle']['size'], 0.001);
        $this->assertArrayNotHasKey('portrait', $portrait);

        // The landscape poster is as it was, and a candidate without a portrait has none.
        $this->assertSame(8696.178, $poster['frame']['w']);
        $this->assertCount(17, $poster['layers']);
        $this->assertNull(TitlePoster::for('tasman-standard', 'banner')['portrait']);
    }

    /**
     * A tall card (2:3, 5:8) shows the upright poster as a still while the comic poster is the
     * lesson's title style, even over poster_image (decision b, 2026-10-17: the composer fills that
     * with a landscape photo); Logo or Plain keep the card as it was. A link preview stays landscape: the still is a SECOND og:image only (Pinterest-style).
     */
    public function test_a_tall_card_and_a_tall_share_image_use_the_upright_still(): void
    {
        $lesson = $this->lesson('tasman-standard');
        $still = $lesson->titlePosterStillUrl();
        $this->assertStringEndsWith('/lesson-titles/tasman-standard/poster/portrait-still.webp', (string) $still);
        $this->assertFileExists(public_path(parse_url((string) $still, PHP_URL_PATH)));
        $this->assertSame($still, $lesson->tallCardImageUrl());

        $this->assertNull($lesson->forceFill(['title_style' => TitlePoster::PLAIN])->titlePosterStillUrl());
        $this->assertSame($lesson->cardImageUrl(), $lesson->tallCardImageUrl());

        $lesson->forceFill(['poster_image' => 'https://res.cloudinary.com/demo/image/upload/own.webp']);
        $this->assertSame($lesson->cardImageUrl(), $lesson->tallCardImageUrl(), 'Plain keeps the old card');

        $lesson->forceFill(['title_style' => null]);
        $this->assertSame($still, $lesson->tallCardImageUrl(), 'the comic still outranks poster_image on a tall card');
        $this->assertStringEndsWith('/own.webp', (string) $lesson->cardImageUrl(), 'the other cards keep poster_image');

        $html = (string) $this->blade('<x-seo title="T" description="D" image="https://x.test/wide.png" tall-image="https://x.test/tall.webp" />');
        $this->assertMatchesRegularExpression('#og:image" content="https://x.test/wide.png".*og:image" content="https://x.test/tall.webp">\s*<meta property="og:image:width" content="1000">\s*<meta property="og:image:height" content="1500">#s', $html);
        $this->assertStringContainsString('twitter:image" content="https://x.test/wide.png"', $html);
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
        $this->assertSame(['poster', 'cover', 'banner', 'logo', 'letters', 'plain'], array_column($tasman->titleChoices(), 'key'));
        $this->assertSame('poster', $tasman->titleStyle());

        // No candidate, no logo: the lettered title (ComicRoma) by default, the plain one on offer.
        $plain = $this->lesson(null);
        $this->assertSame(['letters', 'plain'], array_column($plain->titleChoices(), 'key'));
        $this->assertSame('letters', $plain->titleStyle());
        $this->assertNull($plain->titlePoster());

        // A stored choice the series cannot show falls back to the default.
        $plain->update(['title_style' => 'banner']);
        $this->assertSame('letters', $plain->fresh()->titleStyle());
        $plain->update(['title_style' => 'plain']);
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
        $this->candidate(self::SCRATCH, 'letters', ['order' => 2]);

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
        // The badges live in "About this lesson", below the hero, never on the artwork.
        $this->assertMatchesRegularExpression('#data-title-about.*data-lesson-types#s', $html);

        $lesson->update(['title_style' => 'banner']);
        $html = $play();
        $this->assertStringContainsString('"title_style":"banner"', $html);
        $this->assertMatchesRegularExpression('#lesson-titles\\\\?/tasman-standard\\\\?/banner\\\\?/painting-gulls\.webp#', $html);
        $this->assertStringContainsString('family=Coming+Soon', $html);
        $this->assertDoesNotMatchRegularExpression('#<ul class="[^"]*\bflex-col\b[^"]*"[^>]*data-lesson-types#', $html, 'one row in the section');

        $lesson->update(['title_style' => 'logo']);
        $html = $play();
        $this->assertStringContainsString('"title_poster":null', $html);
        $this->assertMatchesRegularExpression('#lesson-logos\\\\?/tasman-standard\.svg#', $html);
        $this->assertStringNotContainsString('family=Coming+Soon', $html);

        $this->assertStringNotContainsString('ComicRoma.woff2', $html, 'ComicRoma is preloaded only for the lettered title');

        $lesson->update(['title_style' => 'plain']);
        $html = $play();
        $this->assertStringContainsString('"title_poster":null', $html);
        $this->assertStringContainsString('"title_logo_url":null', $html);
        $this->assertStringNotContainsString('ComicRoma.woff2', $html);

        $lesson->update(['title_style' => 'letters']);
        $html = $play();
        $this->assertStringContainsString('"title_style":"letters"', $html);
        $this->assertStringContainsString('"title_poster":null', $html);
        $this->assertMatchesRegularExpression('#<link rel="preload" href="[^"]*fonts/comicroma/ComicRoma\.woff2"#', $html);
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

    /**
     * Bart, 2026-10-16, on W24VRI: "trying to select a new image for the title screen, but it was
     * not possible". The pick was saved, but the Comic cover's full-bleed plate (the spyglass
     * coast) painted over it. A picture the teacher chose takes the poster's full-frame picture;
     * a poster with none gets it underneath its letters.
     */
    public function test_the_teachers_picture_replaces_the_posters_full_frame_picture(): void
    {
        $picture = '/storage/lessons/1/scenes/4/storm.webp';
        $cover = $this->lesson('tasman-standard', ['title_style' => 'cover', 'title_image' => $picture]);
        $plain = TitlePoster::for('tasman-standard', 'cover');

        $poster = $cover->titlePoster();
        $this->assertSame($cover->titleBgUrl(), $poster['layers'][0]['url']);
        $this->assertSame('plate', $poster['layers'][0]['id']);
        $this->assertCount(count($plain['layers']), $poster['layers']);
        $this->assertSame(['letters'], array_values(array_unique(array_column($poster['keep_clear'], 'kind'))),
            'faces and figures of the plate are not in the teacher\'s picture');

        $this->assertStringEndsWith('cover-tasman-spyglass-coast-hd.webp', $cover->fresh()->forceFill(['title_image' => null])->titlePoster()['layers'][0]['url'],
            'without a pick the cover keeps its own plate');

        $poster = $this->lesson('tasman-standard', ['title_style' => 'poster', 'title_image' => $picture])->titlePoster();
        $this->assertSame(['id' => 'picture', 'box' => ['x' => 0.0, 'y' => 0.0, 'w' => 100.0, 'h' => 100.0]],
            ['id' => $poster['layers'][0]['id'], 'box' => $poster['layers'][0]['box']]);
        $this->assertStringEndsWith($picture, $poster['layers'][0]['url']);
    }

    public function test_the_picked_tile_is_marked_as_chosen(): void
    {
        $lesson = $this->lesson('tasman-standard', ['title_style' => 'cover']);
        // Cloudinary pictures, as every Tasman scene has on production.
        $lesson->scenes()->first()->update(['image_path' => 'https://res.cloudinary.com/demo/image/upload/coast.webp']);
        $url = 'https://res.cloudinary.com/demo/image/upload/storm.webp';
        Scene::create(['lesson_id' => $lesson->id, 'order' => 2, 'kind' => 'narration', 'script_segment' => 'Toen.', 'status' => 'ready', 'image_path' => $url]);

        $component = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->assertDontSee('data-chosen', false);
        $component->call('selectTitleImage', $url);

        $this->assertSame(1, substr_count($component->html(), 'data-chosen'));
        $this->assertMatchesRegularExpression('#data-zoom\s+data-chosen\s+aria-pressed="true"\s+data-tooltip="Scene 2" aria-label="Scene 2"\s+class="[^"]*ring-2 ring-primary#', $component->html());
    }

    public function test_a_style_the_series_cannot_show_is_refused(): void
    {
        $lesson = $this->lesson(null);

        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->assertSeeText('Title style')
            ->assertSeeText('Letters')
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
