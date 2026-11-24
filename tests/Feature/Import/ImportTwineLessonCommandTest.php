<?php

declare(strict_types=1);

namespace Tests\Feature\Import;

use App\Models\Lesson;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** lessons:import-twine: the Dante story in four languages becomes four lessons in one translation group. */
class ImportTwineLessonCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        config(['worlds' => ['test-port' => [
            'label' => 'Port', 'continent' => 'Europe', 'region' => 'Italy', 'bundle' => 'nl-prehistory', 'thumb' => 'worlds/port.webp',
            'set' => ['sky' => 'sky-summer-01', 'groundSlots' => [['asset' => 'meadow-01', 'from_m' => 0]], 'layers' => [['asset' => 'bg-farmland-01', 'depth' => 'bg', 'x' => 0.5]]],
        ]]]);
    }

    public function test_the_dante_story_imports_in_four_languages_as_one_series(): void
    {
        $teacher = User::factory()->teacher()->create(['email' => 'teacher@example.test']);
        $files = array_map(fn ($l) => base_path("resources/twine/dante/{$l}.html"), ['nl', 'en', 'de', 'it']);

        $this->artisan('lessons:import-twine', ['files' => $files, '--teacher' => 'teacher@example.test', '--world' => 'test-port', '--age' => 12, '--group' => 'dante-story'])
            ->assertSuccessful();

        $lessons = Lesson::where('teacher_id', $teacher->id)->orderBy('id')->get();
        $this->assertSame(['nl', 'en', 'de', 'it'], $lessons->pluck('language')->all());
        $this->assertSame(['dante-story'], $lessons->pluck('translation_group')->unique()->values()->all());
        $this->assertSame(['Age 12'], $lessons->pluck('grade_level')->unique()->values()->all());
        foreach ($lessons as $lesson) {
            $this->assertSame(19, $lesson->scenes()->count());
            $cast = collect($lesson->outline['cast'])->pluck('colour', 'name');
            $this->assertSame('white', $cast['Beatrice']);
            $this->assertSame('red', $cast['Dante Alighieri']);
            $this->assertSame(1, $cast->filter(fn ($c) => $c === 'white')->count());   // only Beatrice wears white
            $this->assertSame('Ravenna', $lesson->scenes()->where('order', 1)->value('location'));
        }
    }

    public function test_the_age_is_never_assumed(): void
    {
        User::factory()->teacher()->create(['email' => 'teacher@example.test']);

        $this->artisan('lessons:import-twine', ['files' => [base_path('resources/twine/dante/en.html')], '--teacher' => 'teacher@example.test', '--world' => 'test-port'])
            ->assertFailed();
        $this->assertSame(0, Lesson::count());
    }
}
