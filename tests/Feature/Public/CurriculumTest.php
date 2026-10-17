<?php

declare(strict_types=1);

namespace Tests\Feature\Public;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\CurriculumPicker;
use App\Models\CurriculumGoal;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Support\Seo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * The Dutch curriculum as data (Bart, 2026-10-17): every kerndoel, tijdvak, kenmerkend aspect and
 * Canon window is a row with its own page, linked to the lessons that cover it.
 */
class CurriculumTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->artisan('curriculum:import')->assertSuccessful();
    }

    private function lesson(LessonStatus $status = LessonStatus::Published, ?User $teacher = null): Lesson
    {
        $lesson = Lesson::factory()->for($teacher ?? User::factory()->teacher(), 'teacher')->create([
            'title' => 'De reis van Abel Tasman', 'topic' => 'Abel Tasman', 'language' => 'nl', 'status' => $status,
        ]);
        Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'audio_path' => "lessons/{$lesson->id}/scenes/1/audio.mp3", 'config' => [],
        ]);

        return $lesson->refresh();
    }

    public function test_the_import_holds_the_official_set(): void
    {
        $this->assertSame(12, CurriculumGoal::where('type', 'kerndoel')->count());
        $this->assertSame(10, CurriculumGoal::where('type', 'tijdvak')->count());
        $this->assertSame(49, CurriculumGoal::where('type', 'kenmerkend_aspect')->count());
        $this->assertSame(50, CurriculumGoal::where('type', 'canonvenster')->count());

        $aspect = CurriculumGoal::findByKey('ka:6.3');
        $this->assertSame('wereldwijde handelscontacten, handelskapitalisme en het begin van een wereldeconomie', $aspect->title);
        $this->assertSame('Tijd van regenten en vorsten', $aspect->parent->title);
    }

    public function test_importing_again_keeps_the_lesson_links(): void
    {
        $lesson = $this->lesson();
        $lesson->curriculumGoals()->attach(CurriculumGoal::findByKey('kerndoel:37'), ['fit' => 'direct']);

        $this->artisan('curriculum:import')->assertSuccessful();

        $this->assertSame(121, CurriculumGoal::count());
        $this->assertSame(1, $lesson->curriculumGoals()->count());
    }

    public function test_every_goal_has_a_page_listing_its_public_lessons(): void
    {
        $published = $this->lesson();
        $draft = $this->lesson(LessonStatus::Draft);
        $draft->update(['title' => 'Nog niet af']);
        $goal = CurriculumGoal::findByKey('canon:14');
        $goal->lessons()->attach([$published->id => ['fit' => 'direct'], $draft->id => ['fit' => 'direct']]);

        $this->get(route('public.curriculum.goal', $goal->slug))
            ->assertOk()
            ->assertSee('Canonvenster 14')
            ->assertSee('VOC en WIC')
            ->assertSee('De reis van Abel Tasman')
            ->assertDontSee('Nog niet af')
            ->assertSee('<link rel="canonical" href="'.route('public.curriculum.goal', $goal->slug).'"', false);

        $this->get(route('public.curriculum.goal', 'kerndoel-99'))->assertNotFound();
    }

    public function test_the_overview_shows_which_goals_still_have_no_lesson(): void
    {
        $lesson = $this->lesson();
        $lesson->curriculumGoals()->attach(CurriculumGoal::findByKey('kerndoel:37'), ['fit' => 'direct']);

        $this->get(route('public.curriculum'))
            ->assertOk()
            ->assertSee('Kerndoel 37')
            ->assertSee('Trijntje');
    }

    public function test_the_sitemap_lists_every_goal_page(): void
    {
        $xml = $this->get(route('sitemap'))->assertOk()->getContent();

        $this->assertInstanceOf(\SimpleXMLElement::class, simplexml_load_string($xml));
        $this->assertStringContainsString('<loc>'.route('public.curriculum.goal', 'kerndoel-37').'</loc>', $xml);
        $this->assertStringContainsString('<loc>'.route('public.curriculum.goal', 'kenmerkend-aspect-6-3').'</loc>', $xml);
    }

    public function test_the_lesson_page_shows_its_curriculum_as_a_linked_table(): void
    {
        $lesson = $this->lesson();
        $goal = CurriculumGoal::findByKey('kerndoel:40');
        $lesson->curriculumGoals()->attach($goal, ['fit' => 'partial']);
        app()->setLocale('nl');

        $this->get(Seo::url('lesson', ['slug' => Seo::lessonSlug($lesson)], 'nl'))
            ->assertOk()
            ->assertSee('data-curriculum-table', false)
            ->assertSee(route('public.curriculum.goal', $goal->slug), false)
            ->assertSee('Historische bronnen gebruiken');
    }

    public function test_the_guide_command_links_the_tasman_curriculum(): void
    {
        $lesson = $this->lesson();
        $lesson->update(['lesson_code' => 'W24VRI']);

        $this->artisan('lessons:guide', ['code' => 'W24VRI'])->assertSuccessful();

        $keys = $lesson->curriculumGoals()->get()->map(fn ($g) => $g->type.':'.$g->code)->sort()->values()->all();
        $this->assertSame(['canonvenster:14', 'kenmerkend_aspect:6.3', 'kerndoel:36', 'kerndoel:37', 'kerndoel:40', 'tijdvak:6'], $keys);
        $this->assertArrayNotHasKey('curriculum', $lesson->refresh()->teacher_guide);
    }

    public function test_the_teacher_links_goals_in_settings(): void
    {
        $teacher = User::factory()->teacher()->create();
        $lesson = $this->lesson(teacher: $teacher);
        $goal = CurriculumGoal::findByKey('canon:14');

        Livewire::actingAs($teacher)->test(CurriculumPicker::class, ['lesson' => $lesson])
            ->set('search', 'tijdvak 6')
            ->assertSee('Tijd van regenten en vorsten')
            ->assertDontSee('Tijd van jagers en boeren')
            ->set('search', 'VOC')
            ->assertSee('VOC en WIC')
            ->call('attach', $goal->id)
            ->call('setFit', $goal->id, 'partial')
            ->assertSee('VOC en WIC');

        $this->assertSame('partial', $lesson->curriculumGoals()->first()->pivot->fit);

        Livewire::actingAs($teacher)->test(CurriculumPicker::class, ['lesson' => $lesson])
            ->call('detach', $goal->id);

        $this->assertSame(0, $lesson->curriculumGoals()->count());
    }

    public function test_another_teacher_cannot_change_the_links(): void
    {
        $lesson = $this->lesson();

        Livewire::actingAs(User::factory()->teacher()->create())
            ->test(CurriculumPicker::class, ['lesson' => $lesson])
            ->assertForbidden();
    }
}
