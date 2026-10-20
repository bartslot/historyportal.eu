<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\IconPanel;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Support\LibraryEra;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Bart, 2026-10-17 on lesson 63 (Assets ▸ Lijntekeningen): "we know the era of the lesson. I would
 * expect not to see dinosaurs." And: "it's more logical to place characters in the scene than any
 * other thing." The line-art groups take the History line's era chips (one mechanism, LibraryEra),
 * and the drawer opens on History line ▸ Characters in the lesson's era.
 */
class AssetEraFilterTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
        foreach ([['Prehistoric', 'Dinosaurs', 'T-rex'], ['Prehistoric', 'Cave drawings', 'Bison'], ['Hunters & Farmers', 'Stone Age', 'Vuursteen'],
            ['Civilisations', 'Egyptians', 'Farao'], ['Nature', null, 'Boom']] as [$cat, $sub, $title]) {
            $this->asset('line-art', $cat, $sub, $title);
        }
        $this->asset('history-line', 'figures', 'tasman', 'Schipper', 'regents-rulers');
        $this->asset('history-line', 'figures', 'dante', 'Dante', 'cities-states');
        $this->asset('history-line', 'backdrops', 'tasman', 'Dek', 'regents-rulers');
        $this->asset('arrows', null, null, 'Pijl');
    }

    private function asset(string $collection, ?string $category, ?string $subcategory, string $title, ?string $era = null): SvgAsset
    {
        return SvgAsset::create([
            'user_id' => null, 'title' => $title, 'source' => 'bundled', 'source_ref' => "{$collection}/{$title}.svg",
            'collection' => $collection, 'category' => $category, 'subcategory' => $subcategory, 'era' => $era, 'source_url' => '', 'license' => 'Royalty-free (commercial)',
            'svg_path' => "svg-assets/library/{$collection}/".str($title)->slug().'.svg',
        ]);
    }

    /** A 1642 lesson like Tasman: its era comes from its history-line backdrop. */
    private function lesson(?string $backdrop = 'https://res.cloudinary.com/x/image/upload/v1/library/history-line/backdrops/tasman/deck.webp', array $extra = []): Lesson
    {
        $lesson = Lesson::create($extra + [
            'teacher_id' => $this->teacher->id, 'topic' => 'Abel Tasman', 'title' => 'Abel Tasman: de reis', 'subject' => 'history',
            'grade_level' => '6', 'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready', 'image_path' => $backdrop]);

        return $lesson;
    }

    private function panel(?Lesson $lesson)
    {
        return Livewire::actingAs($this->teacher)->test(IconPanel::class, ['lessonId' => $lesson?->id]);
    }

    private function titles($panel): array
    {
        return $panel->instance()->icons()->pluck('title')->sort()->values()->all();
    }

    public function test_every_line_art_group_has_its_tijdvakken(): void
    {
        $this->assertSame([], LibraryEra::groupEras('line-art', 'Prehistoric', 'Dinosaurs'), 'deep time: no tijdvak');
        $this->assertSame(['hunters-farmers'], LibraryEra::groupEras('line-art', 'Prehistoric', 'Cave drawings'));
        $this->assertSame(['hunters-farmers'], LibraryEra::groupEras('line-art', 'Hunters & Farmers', 'Stone Age'));
        $this->assertSame(['hunters-farmers', 'greeks-romans'], LibraryEra::groupEras('line-art', 'Civilisations', 'Egyptians'));
        $this->assertNull(LibraryEra::groupEras('line-art', 'Nature'), 'timeless');
        $this->assertFalse(LibraryEra::groupFits([], 'hunters-farmers'));
        $this->assertTrue(LibraryEra::groupFits(null, 'regents-rulers'));
    }

    public function test_a_1642_lesson_shows_no_dinosaurs_stone_age_or_egyptians_and_all_times_shows_them(): void
    {
        $panel = $this->panel($this->lesson())->call('selectCollection', 'line-art');
        $this->assertSame('regents-rulers', $panel->instance()->activeEra());
        $this->assertSame(['Boom'], $this->titles($panel), 'only what is timeless');
        $this->assertSame(['Nature'], array_column($panel->instance()->groups(), 'label'));
        $this->assertContains('regents-rulers', array_column($panel->instance()->eras(), 'era'), 'the lesson\'s chip shows, preselected');

        // A set with nothing of the era says so and offers every era (the Nature group gone too).
        SvgAsset::query()->where('title', 'Boom')->delete();
        $empty = $this->panel($this->lesson())->call('selectCollection', 'line-art');
        $empty->assertSee('Nothing from this period in this set.')->assertDontSee('No assets in this set yet.');

        $panel->call('selectEra', '');
        $this->assertSame(['Bison', 'Farao', 'T-rex', 'Vuursteen'], $this->titles($panel));
    }

    public function test_dinosaurs_never_show_under_an_era_even_the_oldest(): void
    {
        // No hunter-gatherer characters in the History line yet, so the drawer opened on All times;
        // the teacher picks the chip.
        $panel = $this->panel($this->lesson(null, ['era' => '-5000']))->call('selectCollection', 'line-art')->call('selectEra', 'hunters-farmers');
        $this->assertSame('hunters-farmers', $panel->instance()->activeEra());
        $this->assertSame(['Bison', 'Boom', 'Farao', 'Vuursteen'], $this->titles($panel), 'era-matching and timeless; deep time only under All times');
        $this->assertSame(['Civilisations', 'Egyptians', 'Hunters & Farmers', 'Stone Age', 'Prehistoric', 'Cave drawings', 'Nature'], array_column($panel->instance()->groups(), 'label'), 'era-matching first, timeless last');
    }

    public function test_the_drawer_opens_on_characters_of_the_lessons_era(): void
    {
        $panel = $this->panel($this->lesson());
        $panel->assertSet('collection', 'history-line')->assertSet('category', 'figures')->assertSet('era', 'regents-rulers');
        $this->assertSame(['Schipper'], $this->titles($panel));
        $this->assertSame(['history-line', 'line-art', 'arrows'], $panel->instance()->collections(), 'characters first, icons last');
        $this->assertSame(['Characters', 'Backdrops'], array_column($panel->instance()->groups(), 'label'), 'characters, then backgrounds');
    }

    public function test_an_era_without_characters_opens_on_characters_of_all_times(): void
    {
        $panel = $this->panel($this->lesson(null, ['era' => '1940']));
        $panel->assertSet('category', 'figures')->assertSet('era', '');
        $this->assertSame(['Dante', 'Schipper'], $this->titles($panel));
    }

    public function test_the_teachers_last_tab_is_remembered_for_this_lesson_only(): void
    {
        $lesson = $this->lesson();
        $this->panel($lesson)->call('selectCollection', 'arrows');
        $this->panel($lesson)->assertSet('collection', 'arrows');
        $this->panel($this->lesson())->assertSet('collection', 'history-line')->assertSet('category', 'figures');
    }

    /** One derivation: an explicit year, then the linked tijdvakken, then dated scenes, then the backdrops. */
    public function test_the_lessons_era_comes_from_its_linked_tijdvak_after_an_explicit_year_and_before_dated_scenes(): void
    {
        $tijdvak = \App\Models\CurriculumGoal::create(['type' => 'tijdvak', 'code' => '6', 'slug' => 'tijdvak-6', 'title' => 'Tijd van regenten en vorsten', 'sort' => 6]);
        $aspect = \App\Models\CurriculumGoal::create(['type' => 'kenmerkend_aspect', 'code' => '6.2', 'slug' => 'ka-6-2', 'title' => 'handelskapitalisme', 'parent_id' => $tijdvak->id, 'sort' => 62]);

        $linked = $this->lesson(null);
        $linked->curriculumGoals()->attach($aspect->id, ['fit' => 'core']);
        $this->assertSame('regents-rulers', LibraryEra::forLesson($linked), 'a kenmerkend aspect counts as its tijdvak');

        $dated = $this->lesson(null);
        $dated->scenes()->first()->update(['year' => '1302']);
        $dated->curriculumGoals()->attach($tijdvak->id, ['fit' => 'core']);
        $this->assertSame('regents-rulers', LibraryEra::forLesson($dated), 'the tijdvak before a dated scene');

        $explicit = $this->lesson(null, ['era' => '1302']);
        $explicit->curriculumGoals()->attach($tijdvak->id, ['fit' => 'core']);
        $this->assertSame('cities-states', LibraryEra::forLesson($explicit), 'an explicit year first');

        $this->assertNull(LibraryEra::forLesson($this->lesson(null)), 'nothing known: unknown, every era shown');
    }
}
