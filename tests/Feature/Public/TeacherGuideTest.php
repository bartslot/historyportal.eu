<?php

declare(strict_types=1);

namespace Tests\Feature\Public;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Support\Seo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A lesson's teacher guide: what the class should learn and how it fits the curriculum, on the
 * lesson's public page. Bart, 2026-10-13: "super important for teachers to get", but "not in the
 * way of the experience", so it lives on the page a teacher reads before playing, never in the player.
 */
class TeacherGuideTest extends TestCase
{
    use RefreshDatabase;

    private const GOAL = 'Leerlingen begrijpen waarom Nederlanders in de 17e eeuw de wereld verkenden.';

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
    }

    private function lesson(?array $guide): Lesson
    {
        $lesson = Lesson::factory()->for(User::factory()->teacher(), 'teacher')->create([
            'title' => 'De reis van Abel Tasman',
            'topic' => 'Abel Tasman',
            'language' => 'nl',
            'status' => LessonStatus::Published,
            'teacher_guide' => $guide,
        ]);
        Scene::create([
            'lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'audio_path' => "lessons/{$lesson->id}/scenes/1/audio.mp3", 'config' => [],
        ]);

        return $lesson->refresh();
    }

    private function guide(): array
    {
        return [
            'goal' => self::GOAL,
            'audience' => '12 jaar · Brugklas vmbo, havo en vwo',
            'objectives' => [['question' => 'Wat was de VOC?', 'learn' => 'Uitleggen dat de VOC een machtige handelsorganisatie was.']],
            'outcomes' => [['heading' => 'Kennis', 'items' => ['De VOC herkennen.']]],
            'curriculum' => [['part' => 'Canonvenster: VOC en WIC', 'link' => 'Directe aansluiting']],
            'guiding_questions' => ['Kun je een land ontdekken als daar al mensen wonen?'],
            'faq' => [['q' => 'Moeten leerlingen alle plaatsnamen onthouden?', 'a' => 'Nee. Die vormen het avontuur.']],
        ];
    }

    private function page(Lesson $lesson): \Illuminate\Testing\TestResponse
    {
        app()->setLocale('nl');

        return $this->get(Seo::url('lesson', ['slug' => Seo::lessonSlug($lesson)], 'nl'))->assertOk();
    }

    public function test_the_guide_shows_on_the_lesson_page(): void
    {
        $this->page($this->lesson($this->guide()))
            ->assertSee(self::GOAL)
            ->assertSee('Wat was de VOC?')
            ->assertSee('Canonvenster: VOC en WIC')
            ->assertSee('Kun je een land ontdekken als daar al mensen wonen?')
            ->assertSee('Moeten leerlingen alle plaatsnamen onthouden?');
    }

    public function test_the_main_goal_is_the_lesson_description(): void
    {
        $this->assertSame(self::GOAL, Seo::lessonDescription($this->lesson($this->guide())));
    }

    public function test_the_faq_is_machine_readable_and_matches_the_page(): void
    {
        $graph = Seo::lessonGraph($this->lesson($this->guide()));
        $faq = collect($graph['@graph'])->firstWhere('@type', 'FAQPage');
        $resource = collect($graph['@graph'])->firstWhere('@type', 'LearningResource');

        $this->assertSame('Moeten leerlingen alle plaatsnamen onthouden?', $faq['mainEntity'][0]['name']);
        $this->assertSame('Nee. Die vormen het avontuur.', $faq['mainEntity'][0]['acceptedAnswer']['text']);
        $this->assertSame(self::GOAL, $resource['teaches']);
    }

    public function test_the_guide_command_writes_the_tasman_guide_onto_its_lesson(): void
    {
        $lesson = $this->lesson(null);
        $lesson->update(['lesson_code' => 'W24VRI']);

        $this->artisan('lessons:guide', ['code' => 'w24vri'])->assertSuccessful();

        $this->page($lesson->refresh())
            ->assertSee('Het belangrijkste leerdoel')
            ->assertSee('Kun je een land ontdekken als daar al mensen wonen?')
            ->assertSee('Kerndoel 40');
    }

    public function test_the_guide_command_refuses_an_unknown_code(): void
    {
        $this->artisan('lessons:guide', ['code' => '../env'])->assertFailed();
        $this->artisan('lessons:guide', ['code' => 'ZZZZZZ'])->assertFailed();
    }

    public function test_a_lesson_without_a_guide_shows_no_guide(): void
    {
        $this->page($this->lesson(null))
            ->assertDontSee('teacher-guide', false);
    }
}
