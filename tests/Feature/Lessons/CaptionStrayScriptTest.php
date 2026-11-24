<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Models\CaptionTranslation;
use App\Models\Lesson;
use App\Models\Scene;
use App\Services\Captions\LlmTextTranslator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** "Toen Marco终于 terugkeerde" (lesson 129): a subtitle that slips into another writing system is never cached. */
class CaptionStrayScriptTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('llm.providers', ['openai' => [
            'label' => 'OpenAI', 'base_url' => 'https://api.openai.test/v1',
            'api_key' => 'sk-test', 'model' => 'gpt-4o-mini', 'json_format' => 'json_object', 'timeout' => 60,
        ]]);
        config()->set('llm.roles', ['translate' => 'openai']);
    }

    private static function answer(array $json): array
    {
        return ['choices' => [['message' => ['content' => json_encode($json, JSON_UNESCAPED_UNICODE)]]]];
    }

    public function test_a_mixed_line_is_asked_again_and_the_clean_answer_kept(): void
    {
        Http::fakeSequence()
            ->push(self::answer(['1' => 'Toen Marco终于 terugkeerde.', '2' => 'Hij was moe.']))
            ->push(self::answer(['1' => 'Toen Marco eindelijk terugkeerde.']));

        $out = app(LlmTextTranslator::class)->translate(['a' => 'When Marco finally returned.', 'b' => 'He was tired.'], 'en', 'nl');

        $this->assertSame(['a' => 'Toen Marco eindelijk terugkeerde.', 'b' => 'Hij was moe.'], $out);
        Http::assertSentCount(2);
    }

    public function test_a_line_that_stays_mixed_is_left_out(): void
    {
        Http::fakeSequence()
            ->push(self::answer(['1' => 'Toen Marco终于 terugkeerde.', '2' => 'Hij was moe.']))
            ->push(self::answer(['1' => 'Toen Marco终于 terugkeerde.']));

        $out = app(LlmTextTranslator::class)->translate(['a' => 'When Marco finally returned.', 'b' => 'He was tired.'], 'en', 'nl');

        $this->assertSame(['b' => 'Hij was moe.'], $out);
    }

    public function test_the_scan_command_deletes_only_stray_machine_subtitles(): void
    {
        $lesson = Lesson::factory()->create(['language' => 'en']);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'When Marco finally returned.']);
        $row = fn (string $hash, string $machine, ?string $teacher = null) => CaptionTranslation::create([
            'lesson_id' => $lesson->id, 'source_hash' => $hash, 'language' => 'nl',
            'source_text' => 'x', 'machine_text' => $machine, 'teacher_text' => $teacher,
        ]);
        $bad = $row('a', 'Toen Marco终于 terugkeerde.');
        $corrected = $row('b', 'Toen Marco终于 terugkeerde.', 'Toen Marco eindelijk terugkeerde.');
        $clean = $row('c', 'Hij was moe.');

        $this->artisan('lessons:stray-script')->expectsOutputToContain('终于')->assertSuccessful();
        $this->assertSame(3, CaptionTranslation::count());

        $this->artisan('lessons:stray-script', ['--fix' => true])->assertSuccessful();
        $this->assertNull(CaptionTranslation::find($bad->id));
        $this->assertNotNull(CaptionTranslation::find($corrected->id));
        $this->assertNotNull(CaptionTranslation::find($clean->id));
    }
}
