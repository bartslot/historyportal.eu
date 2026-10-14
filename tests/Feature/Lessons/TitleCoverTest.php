<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Support\TitlePoster;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Testing\PendingCommand;
use Tests\TestCase;

/**
 * The comic cover (candidate `cover`): titles:make --cover writes a poster the player accepts
 * (Bart's painting as the plate, ComicRoma letters in flat ink, cut-outs on the horizon and below
 * the frame edge), byte-stable; a bad cover recipe names its problems; the series offers the
 * cover next to the comic poster without taking the default; and ComicRoma works as the font of
 * an ordinary comic poster, kerned. Runs the real Python helper (tools/titles/).
 */
class TitleCoverTest extends TestCase
{
    use RefreshDatabase;

    private const GROUP = 'titlecover-test';

    private const FONT = 'public/fonts/comicroma/ComicRoma.ttf';

    private string $recipe;

    protected function setUp(): void
    {
        parent::setUp();
        $this->recipe = storage_path('framework/testing/titlecover-recipe.json');
        File::ensureDirectoryExists(dirname($this->recipe));
        $this->writeRecipe($this->tasmanCover());
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(public_path('lesson-titles/'.self::GROUP));
        File::delete($this->recipe);
        parent::tearDown();
    }

    /** @return array<string, mixed> */
    private function tasmanCover(): array
    {
        return json_decode((string) file_get_contents(resource_path('lessons/titles/tasman-standard-cover.json')), true);
    }

    private function writeRecipe(array $recipe): void
    {
        file_put_contents($this->recipe, json_encode($recipe));
    }

    private function make(): PendingCommand
    {
        return $this->artisan('titles:make', ['group' => self::GROUP, '--recipe' => $this->recipe]);
    }

    /** @return array<string, array<string, mixed>> */
    private function layersById(): array
    {
        return array_column(TitlePoster::for(self::GROUP, 'cover')['layers'], null, 'id');
    }

    public function test_a_cover_recipe_writes_a_cover_the_player_accepts_into_the_cover_folder(): void
    {
        $this->make()->assertSuccessful();

        $this->assertFalse(TitlePoster::exists(self::GROUP, 'poster'), 'a cover never lands in the comic poster folder');
        $poster = TitlePoster::for(self::GROUP, 'cover');
        $this->assertNotNull($poster);
        $this->assertSame('cover', $poster['fit']);
        $this->assertSame(['#C8E5F2', '#A3876F'], [$poster['background'], $poster['background_bottom']]);
        $this->assertSame(['lettering', '#16202E'], [$poster['subtitle']['font'], $poster['subtitle']['color']]);
        $this->assertNotNull($poster['focus']);

        // The painting first, there from the first frame and slowly drifting; then the letters
        // that drop in; the series line fades in last.
        $ids = array_column($poster['layers'], 'id');
        $this->assertSame(['plate', 'a', 'b', 'e', 'l', 't', 'a1', 's', 'm', 'a2', 'n', 'series'], $ids);
        $byId = $this->layersById();
        $this->assertSame([null, 'drift'], [$byId['plate']['enter'], $byId['plate']['ambient']]);
        $this->assertSame(['x' => -2.0, 'y' => -2.0, 'w' => 104.0, 'h' => 104.0], $byId['plate']['box']);
        $this->assertSame('drop', $byId['a']['enter']);
        $this->assertSame('fade', $byId['series']['enter']);
        foreach ($poster['layers'] as $layer) {
            $this->assertFileExists(public_path(parse_url($layer['url'], PHP_URL_PATH)));
            $this->assertStringContainsString('/lesson-titles/'.self::GROUP.'/cover/', $layer['url']);
        }

        // Tintin lettering: flat ink, no outline, no shadow group.
        $letter = (string) file_get_contents(public_path('lesson-titles/'.self::GROUP.'/cover/letter-a.svg'));
        $this->assertStringContainsString('fill="#16202E"', $letter);
        $this->assertStringNotContainsString('stroke', $letter);
        $this->assertSame([], $poster['groups']);

        // The title sits in the sky as asked: 44% of the frame wide, centred on 73%, top at 9%.
        $letters = array_filter($poster['layers'], fn ($l) => $l['enter'] === 'drop');
        $left = min(array_map(fn ($l) => $l['box']['x'], $letters));
        $right = max(array_map(fn ($l) => $l['box']['x'] + $l['box']['w'], $letters));
        $this->assertEqualsWithDelta(44, $right - $left, 0.3);
        $this->assertEqualsWithDelta(73, ($left + $right) / 2, 0.3);
    }

    public function test_the_same_cover_recipe_gives_the_same_files(): void
    {
        $this->make()->assertSuccessful();
        $hash = fn () => collect(File::files(public_path('lesson-titles/'.self::GROUP.'/cover')))
            ->mapWithKeys(fn ($f) => [$f->getFilename() => sha1_file($f->getPathname())])->sortKeys()->all();
        $first = $hash();
        $this->make()->assertSuccessful();

        $this->assertSame($first, $hash());
    }

    public function test_heroes_stand_below_the_frame_edge_and_the_subject_on_the_horizon(): void
    {
        $recipe = $this->tasmanCover();
        $recipe['horizon'] = 72;
        $recipe['subject'] = ['art' => 'resources/icons/history-line/props/tasman/heemskerck_anchor_dusk.webp', 'x' => 62, 'height' => 50, 'ambient' => 'roll'];
        $recipe['heroes'] = [
            ['art' => 'resources/icons/history-line/figures/tasman/tasman_back.webp', 'x' => 14, 'height' => 40],
            ['art' => 'resources/icons/history-line/figures/tasman/visscher_back.webp', 'x' => 24, 'height' => 38, 'bottom' => 106],
        ];
        $this->writeRecipe($recipe);

        $this->make()->assertSuccessful();

        $byId = $this->layersById();
        $box = fn (string $id) => $byId[$id]['box'];
        $this->assertSame(['plate', 'subject', 'hero-1', 'hero-2'], array_slice(array_keys($byId), 0, 4));
        $this->assertEqualsWithDelta(72, $box('subject')['y'] + $box('subject')['h'], 0.01);
        $this->assertEqualsWithDelta(103, $box('hero-1')['y'] + $box('hero-1')['h'], 0.01);
        $this->assertEqualsWithDelta(106, $box('hero-2')['y'] + $box('hero-2')['h'], 0.01);
        $this->assertEqualsWithDelta(14, $box('hero-1')['x'] + $box('hero-1')['w'] / 2, 0.01);
        $this->assertSame(['fade', 'roll'], [$byId['subject']['enter'], $byId['subject']['ambient']]);
    }

    public function test_a_bad_cover_recipe_fails_naming_each_problem(): void
    {
        $recipe = $this->tasmanCover();
        $recipe['plate']['art'] = 'resources/icons/nope.webp';
        unset($recipe['title']['w']);
        $recipe['background'] = 'sky';
        $recipe['subtitle']['font'] = 'papyrus';
        $recipe['series']['font'] = 'papyrus';
        $recipe['heroes'] = [['art' => 'resources/icons/history-line/figures/tasman/tasman_back.webp']];
        $this->writeRecipe($recipe);

        $this->make()
            ->expectsOutputToContain('plate.art file not found')
            ->expectsOutputToContain('title needs "w"')
            ->expectsOutputToContain('background must be a colour')
            ->expectsOutputToContain('subtitle.font must be comic, comicroma or lettering')
            ->expectsOutputToContain('series.font must be comicroma or lettering')
            ->expectsOutputToContain('heroes[0].height must be')
            ->assertFailed();
        $this->assertDirectoryDoesNotExist(public_path('lesson-titles/'.self::GROUP));
    }

    public function test_the_small_lines_take_the_lettering_face_or_comicroma(): void
    {
        $series = fn (): string => (string) file_get_contents(public_path('lesson-titles/'.self::GROUP.'/cover/series.svg'));

        $this->make()->assertSuccessful();
        $lettering = $series();
        $this->assertSame('lettering', TitlePoster::for(self::GROUP, 'cover')['subtitle']['font']);

        $recipe = $this->tasmanCover();
        $recipe['series']['font'] = 'comicroma';
        $recipe['subtitle']['font'] = 'comicroma';
        $this->writeRecipe($recipe);
        $this->make()->assertSuccessful();

        $this->assertNotSame($lettering, $series(), 'the series line is drawn from the lettering face, not the title font');
        $this->assertStringContainsString('fill="#16202E"', $series(), 'both stay flat ink');
        $this->assertSame('comicroma', TitlePoster::for(self::GROUP, 'cover')['subtitle']['font']);
    }

    public function test_comicroma_sets_an_ordinary_comic_poster_kerned(): void
    {
        $this->writeRecipe([
            'letters' => ['font' => self::FONT],
            'rows' => [['text' => 'AVATAR', 'gradient' => ['#04B3C4', '#C4F0F4']], ['text' => 'TASMAN', 'gradient' => ['#FF964D', '#ED7C5C']]],
            'background' => '#F03E4A',
        ]);

        $this->make()->assertSuccessful();

        $poster = TitlePoster::for(self::GROUP, 'poster');
        $byId = array_column($poster['layers'], null, 'id');
        $this->assertSame(['a', 'v', 'a1', 't', 'a2', 'r', 't1', 'a3', 's', 'm', 'a4', 'n', 'outlines'], array_keys($byId));
        // Kerned: the A's and the V's boxes overlap (their diagonals nest); unkerned they would not.
        $this->assertGreaterThan($byId['v']['box']['x'], $byId['a']['box']['x'] + $byId['a']['box']['w']);
        $this->assertGreaterThan($byId['a1']['box']['x'], $byId['v']['box']['x'] + $byId['v']['box']['w']);
    }

    public function test_the_tasman_series_offers_the_cover_and_keeps_the_comic_poster_as_default(): void
    {
        $teacher = User::factory()->create();
        $lesson = Lesson::create([
            'teacher_id' => $teacher->id, 'title' => 'Abel Tasman: De reis naar het onbekende',
            'topic' => 'X', 'subject' => 'history', 'grade_level' => '9th', 'language' => 'nl',
            'image_style' => 'cinematic', 'status' => LessonStatus::Published, 'translation_group' => 'tasman-standard',
        ]);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'Eens.', 'status' => 'ready']);

        $this->assertContains('cover', array_column($lesson->titleChoices(), 'key'));
        $this->assertSame('poster', $lesson->titleStyle());
        $this->assertStringEndsWith('/lesson-titles/tasman-standard/poster/mask.svg', $lesson->titlePoster()['groups']['scene']['mask_url']);

        $lesson->update(['title_style' => 'cover']);
        $html = $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))->assertOk()->getContent();
        $this->assertStringContainsString('"title_style":"cover"', $html);
        $this->assertStringContainsString('"fit":"cover"', $html);
        $this->assertMatchesRegularExpression('#lesson-titles\\\\?/tasman-standard\\\\?/cover\\\\?/letter-a\.svg#', $html);
        $this->assertStringContainsString('fonts/comic-lettering/ComicRomaLettering-Bold.woff2', $html);
        $this->assertStringNotContainsString('family=Coming+Soon', $html);
    }

    public function test_the_cover_is_found_only_in_its_own_folder_and_named_in_every_language(): void
    {
        $this->assertTrue(TitlePoster::exists('tasman-standard', 'cover'));
        $this->assertNull(TitlePoster::for('tasman-standard', '../dante'));
        $this->assertNull(TitlePoster::for('dante', 'cover'));

        foreach (['en' => 'Comic cover', 'nl' => 'Stripcover', 'de' => 'Comic-Cover', 'fr' => 'Couverture BD', 'it' => 'Copertina fumetto'] as $locale => $label) {
            app()->setLocale($locale);
            $this->assertSame($label, collect(TitlePoster::candidates('tasman-standard'))->firstWhere('key', 'cover')['label']);
        }
    }
}
