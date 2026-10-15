<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Support\ProductTour;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * The About page's product tour reads screenshots and highlight rectangles from public/help-media.
 * Each test points the public path at an empty temp directory, so the real captures are never
 * read, overwritten or relied on.
 */
class ProductTourTest extends TestCase
{
    private string $public;

    protected function setUp(): void
    {
        parent::setUp();

        $this->public = sys_get_temp_dir().'/product-tour-'.uniqid();
        File::ensureDirectoryExists($this->public);
        $this->app->usePublicPath($this->public);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->public);

        parent::tearDown();
    }

    private function capture(string $locale, string $shot, array $rects = []): void
    {
        $directory = "{$this->public}/help-media/{$locale}";
        File::ensureDirectoryExists($directory);
        File::put("{$directory}/{$shot}.jpg", 'jpeg');
        File::put("{$directory}/{$shot}.rects.json", json_encode($rects));
    }

    public function test_every_step_points_at_a_shot_and_a_highlight_the_capture_command_takes(): void
    {
        foreach (ProductTour::definitions() as $step) {
            $this->assertArrayHasKey($step['shot'], ProductTour::SHOTS);

            if ($step['highlight'] !== null) {
                $this->assertArrayHasKey($step['highlight'], ProductTour::SHOTS[$step['shot']]['highlights'],
                    "{$step['shot']} never measures '{$step['highlight']}'");
            }
        }
    }

    public function test_a_tour_with_nothing_captured_is_empty_rather_than_broken(): void
    {
        $this->assertSame([], ProductTour::steps('en'));
    }

    public function test_steps_whose_picture_is_missing_are_left_out(): void
    {
        $this->capture('en', 'tour-story', ['arc' => ['x' => 10, 'y' => 20, 'w' => 50, 'h' => 30]]);

        $steps = ProductTour::steps('en');

        $this->assertCount(1, $steps);
        $this->assertSame(['x' => 10.0, 'y' => 20.0, 'w' => 50.0, 'h' => 30.0], $steps[0]['rect']);
        $this->assertStringContainsString('help-media/en/tour-story.jpg', $steps[0]['image']);
    }

    public function test_a_language_without_its_own_picture_uses_the_english_one_and_its_rectangle(): void
    {
        $this->capture('en', 'tour-story', ['arc' => ['x' => 1, 'y' => 2, 'w' => 3, 'h' => 4]]);
        // A Dutch rectangle without a Dutch picture belongs to no picture and must not be used.
        File::ensureDirectoryExists("{$this->public}/help-media/nl");
        File::put(ProductTour::rectsPath('nl', 'tour-story'), json_encode(['arc' => ['x' => 50, 'y' => 50, 'w' => 10, 'h' => 10]]));

        $step = ProductTour::steps('nl')[0];

        $this->assertStringContainsString('help-media/en/tour-story.jpg', $step['image']);
        $this->assertSame(1.0, $step['rect']['x']);
    }

    public function test_a_missing_or_nonsense_rectangle_centres_the_card_instead(): void
    {
        $this->capture('en', 'tour-story', ['arc' => null]);
        $this->capture('en', 'tour-generate', ['workshop' => ['x' => 10, 'y' => 10, 'w' => 0, 'h' => 20]]);
        $this->capture('en', 'tour-title', ['code' => ['x' => 'left', 'y' => 10, 'w' => 10, 'h' => 10]]);

        foreach (ProductTour::steps('en') as $step) {
            $this->assertNull($step['rect']);
        }
    }

    public function test_the_about_page_plays_the_tour_inline_once_it_has_been_captured(): void
    {
        // The public path is a temp dir, so there is no build manifest to resolve assets against.
        $this->withoutVite();

        $this->get('/about')->assertOk()->assertDontSee('screenshotTour(', false);

        $this->capture('en', 'tour-create', ['topic' => ['x' => 17, 'y' => 34, 'w' => 65, 'h' => 4]]);

        $this->get('/about')
            ->assertOk()
            ->assertSee('screenshotTour(', false)
            // /about plays it in the page (How it works), so no button opens it there
            ->assertSee('x-init="watch()"', false)
            ->assertSee(__('How it works'))
            ->assertSee(__('Start with what your class is studying'));
    }
}
