<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\CaptionTranslations;
use App\Models\CaptionTranslation;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\Captions\CaptionTranslator;
use App\Services\Captions\FakeTextTranslator;
use App\Services\Captions\TextTranslator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * Subtitles in another language: narration lines (and balloon lines) translated once per lesson +
 * language + line, cached for every class, correctable by the teacher.
 */
class CaptionTranslationTest extends TestCase
{
    use RefreshDatabase;

    private FakeTextTranslator $fake;

    protected function setUp(): void
    {
        parent::setUp();
        $this->fake = new FakeTextTranslator;
        $this->app->instance(TextTranslator::class, $this->fake);
    }

    private function lesson(User $teacher, LessonStatus $status = LessonStatus::Published): Lesson
    {
        $lesson = Lesson::factory()->create(['teacher_id' => $teacher->id, 'status' => $status->value, 'language' => 'nl']);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration',
            'script_segment' => '[position:left] Tasman vaart met de Heemskerck naar het oosten.']);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 2, 'kind' => 'narration', 'config' => ['lines' => [
            ['speaker' => 'narrator', 'text' => 'De Zeehaen wacht in de Moordenaarsbaai.', 'start' => 0, 'end' => 3],
            ['speaker' => 'tasman', 'text' => 'Houd {crew:heemskerck} klaar!', 'start' => 3, 'end' => 4],
        ]]]);

        return $lesson->refresh();
    }

    private function captions(): CaptionTranslator
    {
        return app(CaptionTranslator::class);
    }

    public function test_missing_lines_are_translated_in_one_batch_and_then_read_from_the_cache(): void
    {
        $lesson = $this->lesson(User::factory()->create());

        $this->assertSame(3, $this->captions()->cached($lesson, 'es')['missing']);
        $this->assertSame(3, $this->captions()->translateMissing($lesson, 'es'));
        $this->assertCount(1, $this->fake->calls, 'one batch for the whole lesson');
        $this->assertCount(3, $this->fake->calls[0]);

        $set = $this->captions()->cached($lesson, 'es');
        $this->assertSame(0, $set['missing']);
        $this->assertSame('[es] Tasman vaart met de Heemskerck naar het oosten.', $set['texts']['Tasman vaart met de Heemskerck naar het oosten.']);

        $this->assertSame(0, $this->captions()->translateMissing($lesson, 'es'));
        $this->assertCount(1, $this->fake->calls, 'a cached language never reaches the translator again');
    }

    public function test_names_and_placeholders_reach_the_translator_masked_and_come_back_intact(): void
    {
        $lesson = $this->lesson(User::factory()->create());
        $this->captions()->translateMissing($lesson, 'ar');

        $sent = implode(' | ', $this->fake->calls[0]);
        foreach (['Tasman', 'Heemskerck', 'Zeehaen', 'Moordenaarsbaai', '{crew:heemskerck}'] as $kept) {
            $this->assertStringNotContainsString($kept, $sent, "{$kept} is masked before translation");
        }
        $this->assertStringContainsString('⟦0⟧', $sent);

        $texts = $this->captions()->cached($lesson, 'ar')['texts'];
        $this->assertSame('[ar] De Zeehaen wacht in de Moordenaarsbaai.', $texts['De Zeehaen wacht in de Moordenaarsbaai.']);
        $this->assertSame('[ar] Houd {crew:heemskerck} klaar!', $texts['Houd {crew:heemskerck} klaar!']);
    }

    public function test_a_line_whose_name_was_lost_is_not_cached(): void
    {
        $this->app->instance(TextTranslator::class, new class implements TextTranslator
        {
            public function translate(array $lines, string $from, string $to): array
            {
                return array_map(fn (string $l) => str_contains($l, '⟦') ? 'name dropped' : "[{$to}] {$l}", $lines);
            }
        });
        $lesson = $this->lesson(User::factory()->create());

        $this->assertSame(0, app(CaptionTranslator::class)->translateMissing($lesson, 'de'));
        $this->assertSame(0, CaptionTranslation::count());
    }

    public function test_a_line_already_translated_for_another_lesson_is_reused_without_paying(): void
    {
        $teacher = User::factory()->create();
        $this->captions()->translateMissing($this->lesson($teacher), 'fr');
        $copy = $this->lesson($teacher);

        $this->assertSame(3, $this->captions()->translateMissing($copy, 'fr'));
        $this->assertCount(1, $this->fake->calls);
    }

    public function test_the_teacher_corrects_a_line_and_can_reset_it(): void
    {
        $teacher = User::factory()->create();
        $lesson = $this->lesson($teacher);
        $hash = CaptionTranslator::hash('Tasman vaart met de Heemskerck naar het oosten.');

        $editor = Livewire::actingAs($teacher)->test(CaptionTranslations::class, ['lesson' => $lesson])
            ->set('language', 'en')
            ->call('translate')
            ->assertSee('[en] Tasman vaart');

        $editor->call('saveLine', $hash, 'Tasman sails the Heemskerck east.');
        $this->assertSame('Tasman sails the Heemskerck east.', $this->captions()->cached($lesson, 'en')['texts']['Tasman vaart met de Heemskerck naar het oosten.']);

        $editor->call('resetLine', $hash);
        $this->assertSame('[en] Tasman vaart met de Heemskerck naar het oosten.', $this->captions()->cached($lesson, 'en')['texts']['Tasman vaart met de Heemskerck naar het oosten.']);
    }

    public function test_another_teacher_cannot_open_the_editor(): void
    {
        $lesson = $this->lesson(User::factory()->create());

        Livewire::actingAs(User::factory()->create())->test(CaptionTranslations::class, ['lesson' => $lesson])->assertForbidden();
    }

    public function test_the_player_endpoint_returns_the_whole_set_for_a_published_lesson(): void
    {
        $lesson = $this->lesson(User::factory()->create());

        $texts = $this->getJson(route('lesson.captions', ['lessonCode' => $lesson->lesson_code, 'language' => 'ar']))
            ->assertOk()
            ->assertJsonPath('dir', 'rtl')
            ->assertJsonPath('pending', false)
            ->json('texts');

        $this->assertCount(3, $texts);
        $this->assertSame('[ar] De Zeehaen wacht in de Moordenaarsbaai.', $texts['De Zeehaen wacht in de Moordenaarsbaai.']);
    }

    public function test_peek_only_reads(): void
    {
        $lesson = $this->lesson(User::factory()->create());

        $this->getJson(route('lesson.captions', ['lessonCode' => $lesson->lesson_code, 'language' => 'ja']).'?peek=1')
            ->assertOk()->assertJsonPath('pending', true)->assertJsonPath('translating', false);
        $this->assertSame([], $this->fake->calls);
    }

    public function test_the_lesson_language_and_unknown_languages_are_never_translated(): void
    {
        $lesson = $this->lesson(User::factory()->create());

        $this->getJson(route('lesson.captions', ['lessonCode' => $lesson->lesson_code, 'language' => 'nl']))
            ->assertOk()->assertJsonPath('pending', false);
        $this->getJson(route('lesson.captions', ['lessonCode' => $lesson->lesson_code, 'language' => 'xx']))->assertNotFound();
        $this->assertSame([], $this->fake->calls);
    }

    public function test_an_unpublished_lesson_is_only_open_to_its_teacher(): void
    {
        $teacher = User::factory()->create();
        $lesson = $this->lesson($teacher, LessonStatus::Draft);
        $url = route('lesson.captions', ['lessonCode' => $lesson->lesson_code, 'language' => 'es']);

        $this->getJson($url)->assertNotFound();
        $this->actingAs(User::factory()->create())->getJson($url)->assertNotFound();
        $this->assertSame([], $this->fake->calls);

        $this->actingAs($teacher)->getJson($url)->assertOk()->assertJsonPath('pending', false);
    }

    public function test_the_player_lists_the_subtitle_and_audio_languages(): void
    {
        $lesson = $this->lesson(User::factory()->create());

        $this->get(route('lesson.play', ['lessonCode' => $lesson->lesson_code]))
            ->assertOk()
            ->assertSee('"source_language":"nl"', false)
            ->assertSee('"name":"العربية"', false)
            ->assertSee('"current":true', false)
            ->assertSee('/captions/__LANG__', false);
    }

    public function test_the_artisan_command_counts_and_translates_with_the_fake(): void
    {
        $lesson = $this->lesson(User::factory()->create());

        $this->artisan('captions:translate', ['lesson' => $lesson->lesson_code, 'languages' => ['zh'], '--dry-run' => true])
            ->expectsOutputToContain('zh: 3 lines missing')->assertSuccessful();
        $this->artisan('captions:translate', ['lesson' => $lesson->id, 'languages' => ['zh'], '--fake' => true])
            ->expectsOutputToContain('zh: 3 translated, 0 still missing')->assertSuccessful();
    }
}
