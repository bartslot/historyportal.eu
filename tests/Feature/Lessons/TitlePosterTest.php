<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Enums\TitleStyle;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\LessonComposer;
use App\Services\LessonExporter;
use App\Support\TitlePoster;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * The comic title poster: a series' poster.json found by translation group, the teacher's title
 * style (comic poster / logo / plain) with its default and reset, what the player receives, and the
 * spec round trip.
 */
class TitlePosterTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
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

    public function test_the_tasman_poster_is_found_with_every_file_resolved_and_present(): void
    {
        $poster = TitlePoster::for('tasman-standard');

        $this->assertNotNull($poster);
        $this->assertSame('#F03E4A', $poster['background']);
        $this->assertCount(17, $poster['layers']);
        foreach ($poster['layers'] as $layer) {
            $this->assertFileExists(public_path(parse_url($layer['url'], PHP_URL_PATH)));
        }
        $this->assertStringEndsWith('/lesson-titles/tasman-standard/mask.svg', $poster['groups']['scene']['mask_url']);
        $this->assertSame(['x' => 90.0, 'y' => 84.0, 'color' => '#000000'], $poster['groups']['tasman']['shadow']);

        $layers = collect($poster['layers'])->keyBy('id');
        // Ambient motion goes through the one whitelist the scene layers use.
        $this->assertSame('swell', $layers['swell-far']['ambient']);
        $this->assertSame('roll', $layers['voc-ships']['ambient']);
        $this->assertSame(['x', 0.88], [$layers['wave-break']['flip'], $layers['wave-break']['rotate']]);
        $this->assertNull($layers['a']['ambient']);
    }

    public function test_no_folder_or_a_climbing_group_has_no_poster(): void
    {
        $this->assertNull(TitlePoster::for(null));
        $this->assertNull(TitlePoster::for('no-such-series'));
        $this->assertNull(TitlePoster::for('../lesson-titles/tasman-standard'));
        $this->assertFalse(TitlePoster::exists('Tasman-Standard'));
    }

    public function test_the_default_style_is_the_richest_the_series_has(): void
    {
        $tasman = $this->lesson('tasman-standard');
        $this->assertSame([TitleStyle::Comic, TitleStyle::Cover, TitleStyle::Logo, TitleStyle::Plain], $tasman->availableTitleStyles());
        $this->assertSame(TitleStyle::Comic, $tasman->titleStyle());

        $plain = $this->lesson(null);
        $this->assertSame([TitleStyle::Plain], $plain->availableTitleStyles());
        $this->assertSame(TitleStyle::Plain, $plain->titleStyle());

        // A stored choice the series cannot show falls back to the default.
        $plain->update(['title_style' => TitleStyle::Comic]);
        $this->assertSame(TitleStyle::Plain, $plain->fresh()->titleStyle());
    }

    public function test_the_player_draws_the_poster_by_default_and_the_logo_or_plain_title_on_request(): void
    {
        $lesson = $this->lesson('tasman-standard');
        $play = fn () => $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))->assertOk()->getContent();

        $html = $play();
        $this->assertStringContainsString('"title_style":"comic"', $html);
        $this->assertStringContainsString('family=Coming+Soon', $html);
        $this->assertMatchesRegularExpression('#lesson-titles\\\\?/tasman-standard\\\\?/mask\.svg#', $html);
        $this->assertStringContainsString('"title_logo_url":null', $html);

        $lesson->update(['title_style' => TitleStyle::Logo]);
        $html = $play();
        $this->assertStringContainsString('"title_poster":null', $html);
        $this->assertMatchesRegularExpression('#lesson-logos\\\\?/tasman-standard\.svg#', $html);
        $this->assertStringNotContainsString('family=Coming+Soon', $html);

        $lesson->update(['title_style' => TitleStyle::Plain]);
        $html = $play();
        $this->assertStringContainsString('"title_poster":null', $html);
        $this->assertStringContainsString('"title_logo_url":null', $html);
    }

    public function test_the_teacher_sets_and_resets_the_style_in_the_title_screen_format(): void
    {
        $lesson = $this->lesson('tasman-standard');
        $component = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->assertSeeText('Title style')
            ->assertSeeText('Comic poster');
        $before = $component->get('titleFrameSrc');

        $component->call('setTitleStyle', 'logo');
        $this->assertSame(TitleStyle::Logo, $lesson->fresh()->title_style);
        $this->assertNotSame($before, $component->get('titleFrameSrc'));
        $component->assertSeeText('Reset to default');

        $component->call('setTitleStyle', 'nonsense');
        $this->assertSame(TitleStyle::Logo, $lesson->fresh()->title_style);

        $component->call('resetTitleStyle');
        $this->assertNull($lesson->fresh()->title_style);
        $this->assertSame(TitleStyle::Comic, $lesson->fresh()->titleStyle());
    }

    public function test_a_style_the_series_cannot_show_is_refused(): void
    {
        $lesson = $this->lesson(null);

        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->assertDontSeeText('Title style')
            ->call('setTitleStyle', 'comic');

        $this->assertNull($lesson->fresh()->title_style);
    }

    public function test_compose_and_export_round_trip_the_style_and_leave_it_alone_when_unset(): void
    {
        Storage::fake('public');
        $spec = [
            'key' => 'Poster round trip', 'title' => 'Abel Tasman: Test', 'translation_group' => 'tasman-standard',
            'title_style' => 'plain',
            'scenes' => [['type' => 'story', 'chapter' => 'Begin', 'script' => 'Eens.']],
        ];
        $composer = app(LessonComposer::class);

        $lesson = $composer->build($spec, $this->teacher, false);
        $this->assertSame(TitleStyle::Plain, $lesson->fresh()->title_style);
        $this->assertSame('plain', app(LessonExporter::class)->toSpec($lesson->fresh())['title_style']);

        // A spec without the key keeps whatever the teacher chose.
        $lesson->update(['title_style' => TitleStyle::Logo]);
        unset($spec['title_style']);
        $composer->build($spec, $this->teacher, false);
        $this->assertSame(TitleStyle::Logo, $lesson->fresh()->title_style);

        // The default exports as nothing, so a rebuilt lesson keeps the default too.
        $lesson->update(['title_style' => null]);
        $this->assertArrayNotHasKey('title_style', app(LessonExporter::class)->toSpec($lesson->fresh()));
    }
}
