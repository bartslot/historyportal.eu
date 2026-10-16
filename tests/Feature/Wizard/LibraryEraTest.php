<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\IconPanel;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Bart 2026-10-16: "History Line must have categories per ERA (1600 VOC) for example." Every
 * library picture carries a tijdvak (svg_assets.era, a lesson-taxonomy period key), the Assets tab
 * gets an era chip row that narrows the type chips (AND), and it opens on the lesson's own era.
 */
class LibraryEraTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
    }

    // ── icons:import fills the era ─────────────────────────────────────────

    public function test_icons_import_files_each_picture_under_its_era(): void
    {
        Storage::fake('public');
        $root = storage_path('framework/testing/icons-'.uniqid());
        $img = imagecreatetruecolor(30, 20);
        foreach (['figures/tasman/schipper.webp', 'figures/citizens/frate.webp', 'figures/misc/vat.webp', 'props/medieval/kaars.webp', 'figures/citizens/odd.webp'] as $rel) {
            File::ensureDirectoryExists(dirname("{$root}/history-line/{$rel}"));
            imagewebp($img, "{$root}/history-line/{$rel}", 90);
        }
        File::put("{$root}/history-line/meta.json", json_encode([
            'figures/citizens/frate.webp' => ['era' => 'cities-states'],   // a generic folder: its meta says
            'figures/citizens/odd.webp' => ['era' => 'the-1600s'],         // not a period: ignored, with a warning
        ]));

        try {
            $this->artisan("icons:import --path={$root}")
                ->expectsOutputToContain("era 'the-1600s' in meta.json is not a period")
                ->assertSuccessful();
        } finally {
            File::deleteDirectory($root);
        }

        $era = fn (string $rel) => SvgAsset::bundled()->where('source_ref', "history-line/{$rel}")->value('era');
        $this->assertSame('regents-rulers', $era('figures/tasman/schipper.webp'), 'the folder map: tasman = 1600-1700');
        $this->assertSame('cities-states', $era('props/medieval/kaars.webp'), 'the folder map: medieval = 1000-1500');
        $this->assertSame('cities-states', $era('figures/citizens/frate.webp'), 'meta.json for a generic folder');
        $this->assertNull($era('figures/misc/vat.webp'), 'an unmapped folder is timeless');
        $this->assertNull($era('figures/citizens/odd.webp'));
    }

    public function test_the_shipped_generic_figures_carry_their_era_in_meta_json(): void
    {
        $meta = json_decode((string) file_get_contents(resource_path('icons/history-line/meta.json')), true);

        foreach (['figures/citizens/frate.webp', 'figures/soldiers/fante.webp', 'figures/power/papa-bonifacio.webp'] as $ref) {
            $this->assertSame('cities-states', $meta[$ref]['era'] ?? null, $ref);
        }
    }

    // ── The era chips ──────────────────────────────────────────────────────

    private function picture(string $category, string $title, ?string $era): SvgAsset
    {
        return SvgAsset::create([
            'user_id' => null, 'source' => 'bundled', 'source_ref' => "history-line/{$category}/{$title}.webp",
            'collection' => 'history-line', 'category' => $category, 'era' => $era, 'source_url' => '',
            'title' => $title, 'license' => 'Royalty-free (commercial)', 'svg_path' => "svg-assets/library/{$title}.webp",
        ]);
    }

    private function lesson(array $attributes = [], ?string $backdrop = null): Lesson
    {
        $lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'topic' => 'Abel Tasman', 'title' => 'Abel Tasman: de reis',
            'subject' => 'history', 'grade_level' => '6', 'image_style' => 'cinematic',
            'status' => LessonStatus::ScenesReady, ...$attributes,
        ]);
        Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'image_path' => $backdrop,
        ]);

        return $lesson;
    }

    private function panel(?Lesson $lesson)
    {
        return Livewire::actingAs($this->teacher)
            ->test(IconPanel::class, ['lessonId' => $lesson?->id])
            ->call('selectCollection', 'history-line');
    }

    private function seedLibrary(): void
    {
        $this->picture('figures', 'Schipper', 'regents-rulers');
        $this->picture('props', 'Kompas', 'regents-rulers');
        $this->picture('figures', 'Dante', 'cities-states');
        $this->picture('props', 'Vat', null);   // timeless
    }

    public function test_the_chips_are_every_era_with_pictures_in_historical_order(): void
    {
        $this->seedLibrary();

        $this->assertSame(
            ['Cities and states (1000-1500)', 'Regents and rulers (1600-1700)'],
            array_column($this->panel(null)->instance()->eras(), 'label'),
        );
    }

    public function test_the_tasman_lesson_opens_on_the_voc_era_from_its_own_backdrops(): void
    {
        $this->seedLibrary();
        // Composed lessons name no year: the era comes from the library folder of its backdrops.
        $lesson = $this->lesson(backdrop: 'https://res.cloudinary.com/x/image/upload/v1/library/history-line/backdrops/tasman/deck_dusk.webp');

        $panel = $this->panel($lesson)->assertSet('era', 'regents-rulers');

        $this->assertSame(['Kompas', 'Schipper', 'Vat'], $panel->instance()->icons()->pluck('title')->all(), 'the era, plus what is timeless');
        $this->assertSame(['Kompas', 'Vat'], $panel->call('selectGroup', 'props')->instance()->icons()->pluck('title')->all(), 'era AND category');
    }

    public function test_a_lesson_with_a_year_opens_on_its_period(): void
    {
        $this->seedLibrary();

        $this->panel($this->lesson(['era' => '1302']))->assertSet('era', 'cities-states');
    }

    public function test_all_times_shows_the_whole_library_and_sticks_for_this_lesson(): void
    {
        $this->seedLibrary();
        $lesson = $this->lesson(backdrop: 'lessons/1/history-line/backdrops/tasman/x.webp');

        $panel = $this->panel($lesson)->call('selectEra', '');

        $this->assertCount(4, $panel->instance()->icons());
        // The dock is rebuilt on every scene change; the teacher's pick survives it.
        $this->panel($lesson)->assertSet('era', '');
    }

    public function test_an_era_without_pictures_shows_everything(): void
    {
        $this->picture('figures', 'Schipper', 'regents-rulers');

        $panel = $this->panel($this->lesson(['era' => '1940']));

        $this->assertSame('', $panel->instance()->activeEra());
        $this->assertCount(1, $panel->instance()->icons());
    }

    public function test_an_unknown_era_is_refused(): void
    {
        $this->seedLibrary();

        $this->panel(null)->call('selectEra', 'drop table')->assertSet('era', '');
    }
}
