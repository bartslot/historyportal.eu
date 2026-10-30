<?php

declare(strict_types=1);

namespace Tests\Feature\Wizard;

use App\Enums\LessonStatus;
use App\Jobs\RestyleImage;
use App\Livewire\Wizard\IconPanel;
use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\ImageRestyle;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\Art\HistoryLineStyle;
use App\Services\Art\ImageRestyler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/** The Restyle button: queued job, HTTP fake (never the real API), versioning, Keep / Undo, who may press it. */
class RestyleImageTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private Lesson $lesson;

    private Scene $scene;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        config(['services.openai.image_api_key' => 'sk-test', 'services.openai.base_url' => 'https://openai.test/v1']);

        $this->teacher = User::create(['name' => 'T', 'email' => 't@example.com', 'password' => 'secret-password', 'role' => 'teacher']);
        $this->lesson = Lesson::create([
            'teacher_id' => $this->teacher->id, 'title' => 'Tasman', 'topic' => 'Tasman', 'subject' => 'history',
            'grade_level' => '7', 'status' => LessonStatus::Configuring,
        ]);
        Storage::disk('public')->put('lessons/1/orig.png', $this->png(300, 200));
        $this->scene = Scene::create([
            'lesson_id' => $this->lesson->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'script' => 'Once.', 'image_path' => 'lessons/1/orig.png',
        ]);
    }

    private function png(int $w, int $h): string
    {
        $img = imagecreatetruecolor($w, $h);
        ob_start();
        imagepng($img);

        return (string) ob_get_clean();
    }

    /** White paper with $stripes dark 3px rows out of every 100: a believable ink drawing (~12% dark by default). */
    private function ink(int $w = 301, int $stripes = 12): string
    {
        $img = imagecreatetruecolor($w, 200);
        imagefill($img, 0, 0, imagecolorallocate($img, 255, 255, 255));
        $black = imagecolorallocate($img, 10, 10, 10);
        for ($y = 0; $y < 200; $y++) {
            if (($y % 25) < (int) round($stripes / 4)) {
                imageline($img, 0, $y, $w, $y, $black);
            }
        }
        ob_start();
        imagepng($img);

        return (string) ob_get_clean();
    }

    /** Pass 1 answers with an ink drawing, pass 2 with a different (wider) picture so the two can be told apart. */
    private function fakeApi(): void
    {
        Http::fake(['openai.test/*' => Http::sequence()
            ->push(['data' => [['b64_json' => base64_encode($this->ink(301))]]])
            ->push(['data' => [['b64_json' => base64_encode($this->ink(302))]]]),
        ]);
    }

    private function editor(User $user)
    {
        return Livewire::actingAs($user)->test(Step3SceneConfigurator::class, ['lesson' => $this->lesson])->call('selectScene', $this->scene->id);
    }

    private function asset(array $attributes = []): SvgAsset
    {
        Storage::disk('public')->put('icons/man.png', $this->png(200, 400));

        return SvgAsset::create([
            'user_id' => null, 'source' => 'art', 'source_ref' => 'man', 'source_url' => '', 'collection' => 'history-line',
            'category' => 'figures', 'title' => 'Man', 'license' => 'own', 'svg_path' => 'icons/man.png', ...$attributes,
        ]);
    }

    public function test_pressing_restyle_queues_a_job_and_leaves_the_original_alone(): void
    {
        Queue::fake();

        $this->editor($this->teacher)->call('restyle', 'scene', $this->scene->id);

        Queue::assertPushed(RestyleImage::class);
        $row = ImageRestyle::firstOrFail();
        $this->assertSame(ImageRestyle::QUEUED, $row->status);
        $this->assertSame('lessons/1/orig.png', $row->before['path']);
        $this->assertStringEndsWith('/storage/lessons/1/orig.png', (string) $row->originalUrl());
        $this->assertSame('lessons/1/orig.png', $this->scene->fresh()->image_path);
    }

    public function test_the_job_sends_the_image_and_the_shared_prompt_and_stores_a_new_version(): void
    {
        $this->fakeApi();
        $this->editor($this->teacher)->call('restyle', 'scene', $this->scene->id);

        $row = ImageRestyle::firstOrFail()->refresh();
        $this->assertSame(ImageRestyle::READY, $row->status);
        $this->assertNotSame('lessons/1/orig.png', $row->result_path);
        Storage::disk('public')->assertExists('lessons/1/orig.png');
        Storage::disk('public')->assertExists($row->result_path);
        Storage::disk('public')->assertExists($row->ink_path);
        $this->assertNotSame($row->ink_path, $row->result_path, 'ink and final are two versions');
        $this->assertSame('lessons/1/orig.png', $this->scene->fresh()->image_path, 'not applied until Keep');
        Http::assertSentCount(2);
        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/images/edits') && str_contains($r->body(), 'input_fidelity'));
    }

    public function test_both_passes_attach_the_style_references_and_pass_two_edits_pass_ones_ink(): void
    {
        $this->fakeApi();
        $this->editor($this->teacher)->call('restyle', 'scene', $this->scene->id);

        $requests = Http::recorded()->map(fn ($pair) => $pair[0])->values();
        $this->assertCount(2, $requests);
        [$ink, $colour] = [$requests[0]->body(), $requests[1]->body()];

        // Pass 1: the source first, then the ink anchors, all as image[] parts, with the ink prompt.
        $this->assertSame(1 + count(HistoryLineStyle::anchors(1, false)), substr_count($ink, 'name="image[]"'));
        $this->assertStringContainsString('ink-caesar.jpg', $ink);
        $this->assertStringContainsString(HistoryLineStyle::HATCHING_RULE, $ink);
        $this->assertStringNotContainsString('Preserve all black linework', $ink);

        // Pass 2: pass 1's output first, then the colour anchors and the texture anchor, with Bart's colour prompt.
        $this->assertSame(1 + count(HistoryLineStyle::anchors(2, false)), substr_count($colour, 'name="image[]"'));
        $this->assertStringContainsString('texture-watercolour.jpg', $colour);
        $this->assertStringContainsString(HistoryLineStyle::COLOUR_PROMPT, $colour);
        $this->assertStringContainsString($this->ink(301), $colour, 'the colour pass edits the ink the first call returned');
        $this->assertStringNotContainsString(Storage::disk('public')->get('lessons/1/orig.png'), $colour, 'never coloured from the original');
    }

    public function test_an_ink_that_is_a_blank_page_is_retried_once(): void
    {
        Http::fake(['openai.test/*' => Http::sequence()
            ->push(['data' => [['b64_json' => base64_encode($this->ink(301, 0))]]])
            ->push(['data' => [['b64_json' => base64_encode($this->ink(301))]]])
            ->push(['data' => [['b64_json' => base64_encode($this->ink(302))]]]),
        ]);
        $this->editor($this->teacher)->call('restyle', 'scene', $this->scene->id);

        Http::assertSentCount(3);
        $this->assertSame(ImageRestyle::READY, ImageRestyle::firstOrFail()->status);
    }

    public function test_keep_applies_the_new_version_and_undo_or_revert_restores_the_original(): void
    {
        $this->fakeApi();
        $page = $this->editor($this->teacher)->call('restyle', 'scene', $this->scene->id);
        $row = ImageRestyle::firstOrFail()->refresh();

        $page->call('keepRestyle', $row->id);
        $this->assertSame($row->result_path, $this->scene->fresh()->image_path);
        $this->assertSame(ImageRestyle::KEPT, $row->fresh()->status);

        $page->call('revertRestyle', $row->id);
        $this->assertSame('lessons/1/orig.png', $this->scene->fresh()->image_path);
        $this->assertSame(ImageRestyle::READY, $row->fresh()->status, 'the result stays so Keep can bring it back');

        $page->call('keepRestyle', $row->id)->call('undoRestyle', $row->id);
        $this->assertSame('lessons/1/orig.png', $this->scene->fresh()->image_path);
        $this->assertSame(ImageRestyle::DISCARDED, $row->fresh()->status);
        Storage::disk('public')->assertExists('lessons/1/orig.png');
    }

    public function test_a_credits_error_becomes_a_friendly_failure_and_one_toast(): void
    {
        Http::fake(['openai.test/*' => Http::response(['error' => ['code' => 'billing_hard_limit_reached']], 400)]);
        $page = $this->editor($this->teacher)->call('restyle', 'scene', $this->scene->id);

        $row = ImageRestyle::firstOrFail()->refresh();
        $this->assertSame(ImageRestyle::FAILED, $row->status);
        $this->assertSame('credits', $row->error_code);
        $this->assertSame('lessons/1/orig.png', $this->scene->fresh()->image_path);

        $page->call('pollRestyle', $row->id)->assertDispatched('toast');
        $this->assertNotNull($row->fresh()->notified_at);
        $page->call('pollRestyle', $row->id)->assertNotDispatched('toast');
    }

    public function test_another_teacher_cannot_restyle_my_scene(): void
    {
        Queue::fake();
        $other = User::create(['name' => 'O', 'email' => 'o@example.com', 'password' => 'secret-password', 'role' => 'teacher']);

        $result = app(ImageRestyler::class)->request($other, $this->scene);

        $this->assertSame(ImageRestyler::FORBIDDEN, $result);
        Queue::assertNothingPushed();
    }

    public function test_it_is_rate_limited_per_user_and_one_at_a_time_per_picture(): void
    {
        Queue::fake();
        config(['services.openai.restyle_per_hour' => 1]);
        RateLimiter::clear('restyle:'.$this->teacher->id);

        $this->assertInstanceOf(ImageRestyle::class, app(ImageRestyler::class)->request($this->teacher, $this->scene));
        $this->assertSame(ImageRestyler::BUSY, app(ImageRestyler::class)->request($this->teacher, $this->scene));

        ImageRestyle::query()->update(['status' => ImageRestyle::DISCARDED]);
        $this->assertSame(ImageRestyler::LIMIT, app(ImageRestyler::class)->request($this->teacher, $this->scene));
    }

    public function test_library_assets_are_admin_only_and_keep_alpha(): void
    {
        Queue::fake();
        $asset = $this->asset();
        $admin = User::create(['name' => 'A', 'email' => 'a@example.com', 'password' => 'secret-password', 'role' => 'admin']);

        Livewire::actingAs($this->teacher)->test(IconPanel::class, ['lessonId' => $this->lesson->id])->call('restyle', 'asset', $asset->id);
        Queue::assertNothingPushed();

        Livewire::actingAs($admin)->test(IconPanel::class, ['lessonId' => $this->lesson->id])->call('restyle', 'asset', $asset->id);
        Queue::assertPushed(RestyleImage::class);
    }

    public function test_keeping_a_library_restyle_swaps_the_file_and_going_back_restores_it(): void
    {
        $this->fakeApi();
        $asset = $this->asset(['cdn_url' => 'https://cdn.test/man.png']);
        $admin = User::create(['name' => 'A', 'email' => 'a@example.com', 'password' => 'secret-password', 'role' => 'admin']);
        $panel = Livewire::actingAs($admin)->test(IconPanel::class, ['lessonId' => $this->lesson->id])->call('restyle', 'asset', $asset->id);
        $row = ImageRestyle::firstOrFail()->refresh();

        $this->assertSame(ImageRestyle::READY, $row->status);
        $final = imagecreatefromstring(Storage::disk('public')->get($row->result_path));
        $this->assertSame(127, imagecolorat($final, 0, 10) >> 24, 'paper white around a figure is cut to alpha');
        Http::assertSent(fn ($r) => str_contains($r->body(), 'head to feet') && str_contains($r->body(), 'ink-classroom.jpg'));

        $panel->call('keepRestyle', $row->id);
        $this->assertSame($row->result_path, $asset->fresh()->svg_path);
        $this->assertNull($asset->fresh()->cdn_url);

        $panel->call('revertRestyle', $row->id);
        $this->assertSame('icons/man.png', $asset->fresh()->svg_path);
        $this->assertSame('https://cdn.test/man.png', $asset->fresh()->cdn_url);
        Storage::disk('public')->assertExists('icons/man.png');
    }

    public function test_a_vector_or_sprite_sheet_asset_cannot_be_restyled(): void
    {
        $restyler = app(ImageRestyler::class);

        $this->assertFalse($restyler->canRestyle($this->asset(['svg_path' => 'icons/arrow.svg'])));
        $this->assertFalse($restyler->canRestyle($this->asset(['source_ref' => 'seq', 'sheet' => ['frames' => 8]])));
    }

    public function test_a_source_the_edit_api_does_not_take_is_sent_as_png(): void
    {
        $this->fakeApi();
        $bmp = tempnam(sys_get_temp_dir(), 'bmp');
        imagebmp(imagecreatetruecolor(30, 20), $bmp);
        Storage::disk('public')->put('lessons/1/orig.png', (string) file_get_contents($bmp));

        $this->editor($this->teacher)->call('restyle', 'scene', $this->scene->id);

        $this->assertSame(ImageRestyle::READY, ImageRestyle::firstOrFail()->status);
        Http::assertSent(fn ($r) => str_contains($r->body(), "\x89PNG"));
    }
}
