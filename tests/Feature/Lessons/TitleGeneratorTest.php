<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Support\TitlePoster;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * titles:make: a recipe in, a poster folder out that the player's TitlePoster accepts, byte for
 * byte the same every run; a bad recipe fails naming what is wrong; a hand-made poster is safe.
 * Runs the real Python helper (tools/titles/make_title.py) on the Dante recipe.
 */
class TitleGeneratorTest extends TestCase
{
    private const GROUP = 'titlegen-test';

    private string $recipe;

    protected function setUp(): void
    {
        parent::setUp();
        $this->recipe = storage_path('framework/testing/titlegen-recipe.json');
        File::ensureDirectoryExists(dirname($this->recipe));
        $this->writeRecipe(json_decode((string) file_get_contents(resource_path('lessons/titles/dante.json')), true));
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(public_path('lesson-titles/'.self::GROUP));
        File::delete($this->recipe);
        parent::tearDown();
    }

    private function writeRecipe(array $recipe): void
    {
        file_put_contents($this->recipe, json_encode($recipe));
    }

    private function make(): \Illuminate\Testing\PendingCommand
    {
        return $this->artisan('titles:make', ['group' => self::GROUP, '--recipe' => $this->recipe]);
    }

    /** @return array<string, string> file => sha1 */
    private function hashes(): array
    {
        $out = [];
        foreach (File::files(public_path('lesson-titles/'.self::GROUP)) as $f) {
            $out[$f->getFilename()] = sha1_file($f->getPathname());
        }
        ksort($out);

        return $out;
    }

    public function test_it_writes_a_poster_the_player_accepts_with_every_file_present(): void
    {
        $this->make()->assertSuccessful();

        $poster = TitlePoster::for(self::GROUP);
        $this->assertNotNull($poster);
        $this->assertSame('#2152B5', $poster['background']);

        // 5 letters, 2 pictures, the hero, the outlines on top.
        $ids = array_column($poster['layers'], 'id');
        $this->assertSame(['d', 'a', 'n', 't', 'e', 'firenze', 'selva', 'dante', 'outlines'], $ids);
        foreach ($poster['layers'] as $layer) {
            $this->assertFileExists(public_path(parse_url($layer['url'], PHP_URL_PATH)));
        }
        $this->assertStringEndsWith('/lesson-titles/'.self::GROUP.'/mask.svg', $poster['groups']['scene']['mask_url']);
        $this->assertNotNull($poster['groups']['row0']['shadow']);
        $this->assertNotNull($poster['subtitle']);
        $this->assertNotNull($poster['focus']);

        // Letters drop in their own shadow group; pictures fade inside the masked scene.
        $byId = array_column($poster['layers'], null, 'id');
        $this->assertSame(['row0', 'drop'], [$byId['d']['group'], $byId['d']['enter']]);
        $this->assertSame(['scene', 'fade', 'breeze'], [$byId['dante']['group'], $byId['dante']['enter'], $byId['dante']['ambient']]);

        // Pictures are WebP, at most 2880 px, alpha kept for the cut-out hero.
        $hero = public_path('lesson-titles/'.self::GROUP.'/'.basename(parse_url($byId['dante']['url'], PHP_URL_PATH)));
        [$w, $h] = getimagesize($hero);
        $this->assertLessThanOrEqual(2880, max($w, $h));
        $this->assertSame('RIFF', substr((string) file_get_contents($hero), 0, 4));
    }

    public function test_the_same_recipe_gives_the_same_files(): void
    {
        $this->make()->assertSuccessful();
        $first = $this->hashes();
        $this->make()->assertSuccessful();

        $this->assertSame($first, $this->hashes());
    }

    public function test_a_bad_recipe_fails_naming_each_problem(): void
    {
        $recipe = json_decode((string) file_get_contents($this->recipe), true);
        $recipe['background'] = 'blue';
        $recipe['rows'][0]['gradient'] = ['#FFD54F'];
        $recipe['pictures'][0]['art'] = 'resources/icons/nope.webp';
        $this->writeRecipe($recipe);

        $this->make()
            ->expectsOutputToContain('background must be a colour')
            ->expectsOutputToContain('rows[0].gradient must be two colours')
            ->expectsOutputToContain('pictures[0].art file not found')
            ->assertFailed();
        $this->assertDirectoryDoesNotExist(public_path('lesson-titles/'.self::GROUP));
    }

    public function test_a_row_that_does_not_match_its_letters_fails_clearly(): void
    {
        $recipe = json_decode((string) file_get_contents($this->recipe), true);
        $recipe['rows'][0]['text'] = 'DANT';
        $this->writeRecipe($recipe);

        $this->make()->expectsOutputToContain('has 4 letters but its source has 5 shapes')->assertFailed();
    }

    public function test_letters_can_come_from_a_font_one_shape_per_letter_across_rows(): void
    {
        $this->writeRecipe([
            'letters' => ['font' => 'public/fonts/ComicNeue/ComicNeue-Bold.ttf'],
            'rows' => [['text' => 'LA', 'gradient' => ['#000000', '#FFFFFF']], ['text' => 'DIVINA', 'gradient' => ['#111111', '#EEEEEE']]],
            'background' => '#2152B5',
        ]);

        $this->make()->assertSuccessful();

        $ids = array_column(TitlePoster::for(self::GROUP)['layers'], 'id');
        $this->assertSame(['l', 'a', 'd', 'i', 'v', 'i1', 'n', 'a1', 'outlines'], $ids);
    }

    public function test_a_hand_made_poster_is_never_overwritten(): void
    {
        $before = sha1_file(public_path('lesson-titles/tasman-standard/poster.json'));

        $this->artisan('titles:make', ['group' => 'tasman-standard'])
            ->expectsOutputToContain('hand-made poster')
            ->assertFailed();

        $this->assertSame($before, sha1_file(public_path('lesson-titles/tasman-standard/poster.json')));
    }
}
