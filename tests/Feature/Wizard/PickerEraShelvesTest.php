<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Jobs\DeriveSceneMatchTarget;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Support\LibraryEra;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Bart 2026-11-02: "the year is prehistoric so we can only show known assets in prehistory."
 * The picker's shelves follow the lesson's tijdvak, and our own collection only offers pictures
 * of that tijdvak.
 */
class PickerEraShelvesTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.cloudinary.url' => 'cloudinary://key:secret@democloud']);
        Storage::fake('public');
        $this->teacher = User::factory()->create();
    }

    private function lesson(string $title): Lesson
    {
        return Lesson::create([
            'teacher_id' => $this->teacher->id, 'title' => $title, 'topic' => $title, 'subject' => 'history',
            'grade_level' => '6th', 'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
    }

    /** A hunebedden-style lesson: one stage25d scene on a bundle whose assets are dated BCE. */
    private function prehistoryLesson(): Lesson
    {
        $lesson = $this->lesson('De steen die niet wilde bewegen');
        Scene::create([
            'lesson_id' => $lesson->id, 'order' => 0, 'kind' => 'stage25d', 'status' => 'ready',
            'config' => ['stage25d' => ['bundle' => 'nl-prehistory', 'set' => ['layers' => []]]],
        ]);
        Storage::disk('public')->put('library/nl-prehistory/library.json', json_encode(['assets' => [
            ['id' => 'stone-chamber-01', 'file' => 'stone-chamber-01.webp', 'era' => 'c. 3400-2850 BCE', 'tags' => ['stone']],
            ['id' => 'tree-birch-01', 'file' => 'tree-birch-01.webp', 'era' => 'c. 3400-2850 BCE', 'tags' => ['tree']],
            ['id' => 'roman-road-01', 'file' => 'roman-road-01.webp', 'era' => '150 BCE', 'tags' => ['road']],
            ['id' => 'fig-meisje-01', 'file' => 'fig-meisje-01.webp', 'era' => 'figure-v1', 'tags' => ['girl']],
            ['id' => 'fig-moeder-01', 'file' => 'fig-moeder-01.webp', 'era' => 'figure-v1', 'tags' => ['woman']],
        ]]));

        return $lesson;
    }

    private function picker(Lesson $lesson): \Livewire\Features\SupportTesting\Testable
    {
        return Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('openImageLibrary')
            ->call('preparePaintings');
    }

    public function test_a_date_label_names_its_tijdvak(): void
    {
        $this->assertSame('hunters-farmers', LibraryEra::forLabel('c. 3400-2850 BCE'));
        $this->assertSame('greeks-romans', LibraryEra::forLabel('v. Chr. 50'));
        $this->assertSame('regents-rulers', LibraryEra::forLabel('1642'));
        $this->assertSame('hunters-farmers', LibraryEra::forLabel('c. 150,000 years ago'));
        $this->assertSame('hunters-farmers', LibraryEra::forLabel('12 000 BCE'));
        $this->assertNull(LibraryEra::forLabel('undated'));
        $this->assertNull(LibraryEra::forLabel('figure-v1'), 'a version tag is not a year');
    }

    public function test_a_prehistory_lesson_offers_only_our_pictures_and_its_stage_art(): void
    {
        Http::fake();
        $picker = $this->picker($this->prehistoryLesson());

        $this->assertSame('hunters-farmers', $picker->instance()->pickerEra);
        $this->assertSame(['library', 'stage'], array_column($picker->instance()->pickerShelves, 0));

        // A shelf the era does not offer cannot be opened by hand either.
        $picker->set('paintingKind', 'painting')->assertSet('paintingKind', 'library');
    }

    public function test_the_stage_art_shelf_holds_only_the_lessons_era(): void
    {
        Http::fake();
        $tiles = $this->picker($this->prehistoryLesson())
            ->set('paintingKind', 'stage')
            ->instance()
            ->paintingResults;

        $this->assertSame(
            ['/storage/library/nl-prehistory/stone-chamber-01.webp', '/storage/library/nl-prehistory/tree-birch-01.webp'],
            $tiles->pluck('key')->all(),
        );
        $this->assertSame('Stone chamber', $tiles[0]['title']);
    }

    public function test_our_collection_offers_only_folders_of_the_lessons_era(): void
    {
        $url = fn (string $id) => ['public_id' => $id, 'secure_url' => "https://res.cloudinary.com/democloud/image/upload/v1/{$id}.webp"];
        Http::fake(['api.cloudinary.com/*' => Http::response(['resources' => [
            $url('library/history-line/backdrops/tasman/golden_bay_1642'),
            $url('library/history-line/backdrops/dante/inferno_gate'),
            $url('storia/pantheon/front'),
        ]])]);

        $tiles = $this->picker($this->lesson('Abel Tasman 1642'))
            ->call('loadLibraryCollection')
            ->instance()
            ->paintingResults;

        $this->assertSame(['golden_bay_1642'], $tiles->pluck('title')->all());
    }

    public function test_opening_paintings_never_waits_on_the_llm(): void
    {
        Queue::fake();
        Http::fake();
        $lesson = $this->lesson('Abel Tasman 1642');
        $scene = Scene::create(['lesson_id' => $lesson->id, 'order' => 0, 'kind' => 'narration', 'status' => 'ready', 'script_segment' => 'Golden Bay.']);

        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $scene->id)
            ->call('openImageLibrary')
            ->call('preparePaintings')
            ->set('paintingKind', 'painting')
            ->call('openImageLibrary')
            ->call('preparePaintings')
            ->set('paintingKind', 'painting');

        Queue::assertPushed(DeriveSceneMatchTarget::class, 1);
        Queue::assertPushed(DeriveSceneMatchTarget::class, fn ($job) => $job->sceneId === $scene->id);
        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'openai') || str_contains($request->url(), 'generativelanguage'));
    }

    public function test_a_painting_shelf_adopts_the_tagging_once_it_lands(): void
    {
        Queue::fake();
        Http::fake();
        $lesson = $this->lesson('Abel Tasman 1642');
        $scene = Scene::create(['lesson_id' => $lesson->id, 'order' => 0, 'kind' => 'narration', 'status' => 'ready', 'script_segment' => 'Golden Bay.']);

        $picker = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $scene->id)
            ->call('openImageLibrary')
            ->call('preparePaintings')
            ->set('paintingKind', 'painting');
        $this->assertSame([], $picker->get('matchTarget')['core']);

        // The queued job lands: a target with a core subject, signed for this scene.
        $landed = app(\App\Services\Corpus\SceneMatchTargetService::class)->fallback($scene, $lesson);
        $landed['core'] = ['ship'];
        $scene->update(['config' => ['match_target' => $landed]]);

        $picker->call('poll');
        $this->assertSame(['ship'], $picker->get('matchTarget')['core']);
    }
}
