<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Enums\LessonStatus;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\User;
use App\Services\LessonComposer;
use App\Services\LessonExporter;
use App\Support\TitlePoster;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * The title screen's join QR and "what you can expect" lines: the keep-clear boxes a candidate
 * declares (faces first), its strip slot and badge style, the teacher's QR place and lines in the
 * editor, and both through the spec round trip.
 */
class TitleQrAndExpectTest extends TestCase
{
    use RefreshDatabase;

    private const SCRATCH = 'titleqr-test';

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        $this->teacher = User::factory()->create();
    }

    protected function tearDown(): void
    {
        File::deleteDirectory(public_path('lesson-titles/'.self::SCRATCH));
        parent::tearDown();
    }

    private function lesson(array $extra = []): Lesson
    {
        $lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'title' => 'Abel Tasman: De reis naar het onbekende',
            'topic' => 'X', 'subject' => 'history', 'grade_level' => '9th', 'language' => 'nl',
            'image_style' => 'cinematic', 'status' => LessonStatus::Published, 'translation_group' => 'tasman-standard',
        ] + $extra);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 1, 'kind' => 'narration', 'script_segment' => 'Eens.', 'status' => 'ready']);

        return $lesson;
    }

    public function test_every_tasman_candidate_keeps_tasmans_face_and_its_letters_clear(): void
    {
        foreach (['poster', 'cover', 'banner'] as $candidate) {
            $keep = TitlePoster::for('tasman-standard', $candidate)['keep_clear'];
            $kinds = array_count_values(array_column($keep, 'kind'));
            $this->assertGreaterThanOrEqual(1, $kinds['face'] ?? 0, "{$candidate}: a face");
            $this->assertGreaterThanOrEqual(1, $kinds['letters'] ?? 0, "{$candidate}: the letters");
            foreach ($keep as $entry) {
                $this->assertSame(['x', 'y', 'w', 'h'], array_keys($entry['box']));
                $this->assertGreaterThan(0, $entry['box']['w']);
            }
        }
        // The painted cover: Tasman, Visscher, the pointing sailor and the crew, all measured.
        $faces = array_filter(TitlePoster::for('tasman-standard', 'cover')['keep_clear'], fn ($k) => $k['kind'] === 'face');
        $this->assertGreaterThanOrEqual(5, count($faces));
    }

    public function test_unusable_keep_clear_entries_are_dropped_and_a_list_box_is_read(): void
    {
        File::ensureDirectoryExists(public_path('lesson-titles/'.self::SCRATCH.'/poster'));
        file_put_contents(public_path('lesson-titles/'.self::SCRATCH.'/poster/poster.json'), json_encode([
            'frame' => ['w' => 100, 'h' => 50], 'layers' => [['src' => 'a.svg', 'box' => ['x' => 0, 'y' => 0, 'w' => 1, 'h' => 1]]],
            'keep_clear' => [
                ['box' => [10, 20, 5, 6], 'kind' => 'face'],
                ['box' => [1, 2, 3], 'kind' => 'face'],
                ['box' => [1, 2, 3, 4], 'kind' => 'hat'],
                ['box' => ['x' => 1, 'y' => 2, 'w' => 3, 'h' => 4], 'kind' => 'figure', 'weight' => 4],
            ],
            'expect' => ['box' => [0, 0, 100, 5], 'style' => 'banner'],
        ]));

        $poster = TitlePoster::for(self::SCRATCH, 'poster');
        $this->assertSame([
            ['box' => ['x' => 10.0, 'y' => 20.0, 'w' => 5.0, 'h' => 6.0], 'kind' => 'face', 'weight' => null],
            ['box' => ['x' => 1.0, 'y' => 2.0, 'w' => 3.0, 'h' => 4.0], 'kind' => 'figure', 'weight' => 4.0],
        ], $poster['keep_clear']);
        $this->assertNull($poster['expect'], 'only a style the player draws');
        $this->assertSame('colour', $poster['badge_style']);
    }

    public function test_the_banner_has_the_expect_strip_and_the_flat_posters_dark_badges(): void
    {
        $this->assertSame(['box' => ['x' => 0.0, 'y' => 0.0, 'w' => 100.0, 'h' => 5.7], 'style' => 'strip'], TitlePoster::for('tasman-standard', 'banner')['expect']);
        $this->assertNull(TitlePoster::for('tasman-standard', 'cover')['expect']);

        $this->assertSame('dark', TitlePoster::for('tasman-standard', 'poster')['badge_style']);
        $this->assertSame('dark', TitlePoster::for('dante', 'poster')['badge_style']);
        $this->assertSame('colour', TitlePoster::for('tasman-standard', 'cover')['badge_style']);
        $this->assertSame('colour', TitlePoster::for('tasman-standard', 'banner')['badge_style']);

        // The red poster draws its badges in ink; the banner keeps the coloured ones.
        $lesson = $this->lesson(['title_style' => 'poster']);
        Scene::create(['lesson_id' => $lesson->id, 'order' => 2, 'kind' => 'game', 'status' => 'ready']);
        $html = $this->get(route('lesson.play', $lesson->lesson_code))->assertOk()->getContent();
        $this->assertStringContainsString('data-badge-style="dark"', $html);
        $this->assertStringContainsString('bg-brand-ink', $html);
        $this->assertStringNotContainsString('bg-type-interactive', $html);
        $lesson->update(['title_style' => 'banner']);
        $html = $this->get(route('lesson.play', $lesson->lesson_code))->getContent();
        $this->assertStringContainsString('data-badge-style="colour"', $html);
        $this->assertStringContainsString('bg-type-interactive', $html);
    }

    public function test_the_player_receives_the_qr_place_the_lines_and_the_measured_elements(): void
    {
        $lesson = $this->lesson(['title_style' => 'banner', 'expect' => ['Aan boord', 'Wie woonden er al?'], 'qr_position' => 'top-left']);

        $html = $this->get(route('lesson.play', $lesson->lesson_code))->assertOk()->getContent();
        $this->assertStringContainsString('"qr_position":"top-left"', $html);
        $this->assertStringContainsString('"expect":["Aan boord","Wie woonden er al?"]', $html);
        $this->assertStringContainsString('data-title-expect="strip"', $html);
        $this->assertStringContainsString('data-title-qr', $html);
        $this->assertStringContainsString('data-title-code', $html);
        $this->assertGreaterThanOrEqual(6, substr_count($html, 'data-title-avoid'));

        $lesson->update(['show_qr' => false]);
        $html = $this->get(route('lesson.play', $lesson->lesson_code))->getContent();
        $this->assertStringContainsString('"qr_position":"hidden"', $html);
        $this->assertStringNotContainsString('data-title-qr ', $html);
    }

    public function test_the_teacher_sets_the_qr_place_and_resets_it(): void
    {
        $lesson = $this->lesson();
        $component = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->assertSeeText('QR position')
            ->assertSee('data-qr-position="auto"', false);
        $before = $component->get('titleFrameSrc');

        $component->call('setQrPosition', 'top-right');
        $this->assertSame(['top-right', true], [$lesson->fresh()->qr_position, $lesson->fresh()->show_qr]);
        $this->assertNotSame($before, $component->get('titleFrameSrc'));
        $component->assertSee('data-qr-reset', false);

        $component->call('setQrPosition', 'hidden');
        $this->assertSame('hidden', $lesson->fresh()->qrPosition());
        $this->assertNull($lesson->fresh()->qr_position);

        $component->call('setQrPosition', 'over-the-face');
        $this->assertSame('hidden', $lesson->fresh()->qrPosition());

        $component->call('resetQrPosition');
        $this->assertSame('auto', $lesson->fresh()->qrPosition());
        $component->assertDontSee('data-qr-reset', false);
    }

    public function test_the_teacher_writes_the_expect_lines_and_resets_them(): void
    {
        $lesson = $this->lesson();
        $component = Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->assertSeeText('What to expect');

        $component->call('setExpectLine', 0, '  Hoe was het aan boord?  ')
            ->call('setExpectLine', 2, 'De gevaren en de gevolgen')
            ->call('setExpectLine', 7, 'Nowhere');
        $this->assertSame(['Hoe was het aan boord?', 'De gevaren en de gevolgen'], $lesson->fresh()->expect);

        // Emptying a line closes the gap; a long line is cut, never the screen.
        $component->call('setExpectLine', 0, '')->call('setExpectLine', 1, str_repeat('a', 90));
        $this->assertSame(['De gevaren en de gevolgen', str_repeat('a', Lesson::EXPECT_MAX_CHARS)], $lesson->fresh()->expect);

        $component->assertSee('data-expect-reset', false)->call('resetExpect');
        $this->assertNull($lesson->fresh()->expect);
    }

    public function test_reset_puts_back_the_spec_lines_of_a_composed_lesson(): void
    {
        $spec = [
            'key' => 'Expect reset', 'title' => 'Abel Tasman: Test', 'translation_group' => 'tasman-standard',
            'expect' => ['Hoe was het aan boord?', 'De gevaren'],
            'scenes' => [['type' => 'story', 'chapter' => 'Begin', 'script' => 'Eens.']],
        ];
        $lesson = app(LessonComposer::class)->build($spec, $this->teacher, false)->fresh();
        $this->assertSame(['Hoe was het aan boord?', 'De gevaren'], $lesson->expect_default);

        $component = Livewire::actingAs($this->teacher)->test(Step3SceneConfigurator::class, ['lesson' => $lesson]);
        // The spec's own lines are the default: nothing to reset yet.
        $component->assertDontSee('data-expect-reset', false);

        $component->call('setExpectLine', 1, 'Mijn eigen regel')->assertSee('data-expect-reset', false);
        $component->call('resetExpect');
        $this->assertSame(['Hoe was het aan boord?', 'De gevaren'], $lesson->fresh()->expect);
        $component->assertDontSee('data-expect-reset', false);

        // Emptied by the teacher, the lines still come back.
        $component->call('setExpectLine', 0, '')->call('setExpectLine', 0, '')->call('resetExpect');
        $this->assertSame(['Hoe was het aan boord?', 'De gevaren'], $lesson->fresh()->expect);
    }

    public function test_compose_and_export_round_trip_the_qr_place_the_lines_and_the_picture_boxes(): void
    {
        Storage::fake('public');
        $spec = [
            'key' => 'QR round trip', 'title' => 'Abel Tasman: Test', 'translation_group' => 'tasman-standard',
            'qr_position' => 'bottom-left',
            'expect' => ['Hoe was het aan boord?', '', 'Een', 'Twee', 'Drie'],
            'title_keep_clear' => [['box' => [40, 10, 10, 12], 'kind' => 'face'], ['box' => [1, 2], 'kind' => 'face']],
            'scenes' => [['type' => 'story', 'chapter' => 'Begin', 'script' => 'Eens.']],
        ];
        $composer = app(LessonComposer::class);

        $lesson = $composer->build($spec, $this->teacher, false)->fresh();
        $this->assertSame('bottom-left', $lesson->qrPosition());
        $this->assertSame(['Hoe was het aan boord?', 'Een', 'Twee'], $lesson->expect);
        $this->assertCount(1, $lesson->title_keep_clear);

        $exported = app(LessonExporter::class)->toSpec($lesson);
        $this->assertSame('bottom-left', $exported['qr_position']);
        $this->assertSame(['Hoe was het aan boord?', 'Een', 'Twee'], $exported['expect']);
        $this->assertSame('face', $exported['title_keep_clear'][0]['kind']);

        // Through the exporter and back: the same lesson.
        $composer->build($exported + ['scenes' => $spec['scenes']], $this->teacher, false);
        $this->assertSame(['bottom-left', ['Hoe was het aan boord?', 'Een', 'Twee']], [$lesson->fresh()->qrPosition(), $lesson->fresh()->expect]);

        // Hidden is show_qr off; a spec without the keys leaves the teacher's choice alone.
        $composer->build(['qr_position' => 'hidden'] + $spec, $this->teacher, false);
        $this->assertFalse($lesson->fresh()->show_qr);
        $lesson->refresh()->update(['show_qr' => true, 'qr_position' => 'top-right']);
        unset($spec['qr_position'], $spec['expect']);
        $composer->build($spec, $this->teacher, false);
        $this->assertSame(['top-right', ['Hoe was het aan boord?', 'Een', 'Twee']], [$lesson->fresh()->qrPosition(), $lesson->fresh()->expect]);

        // The defaults export as nothing.
        $lesson->refresh()->update(['qr_position' => null, 'expect' => null, 'title_keep_clear' => null]);
        $exported = app(LessonExporter::class)->toSpec($lesson->fresh());
        foreach (['qr_position', 'expect', 'title_keep_clear'] as $key) {
            $this->assertArrayNotHasKey($key, $exported);
        }

        $this->expectException(\InvalidArgumentException::class);
        $composer->build($spec + ['qr_position' => 'middle'], $this->teacher, false);
    }
}
