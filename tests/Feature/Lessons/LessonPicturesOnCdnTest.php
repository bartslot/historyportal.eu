<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use App\Services\CloudinaryService;
use App\Services\LessonComposer;
use App\Services\Lessons\LibraryCdn;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A composed lesson points at Cloudinary for every library picture it uses: uploaded once, on first
 * use, delivered as AVIF at the configured quality, and recorded in the collection's cdn.json so the
 * picture file itself can stay out of git.
 */
class LessonPicturesOnCdnTest extends TestCase
{
    use RefreshDatabase;

    private const CLOUD = 'https://res.cloudinary.com/democloud/image/upload/v1/';

    private User $teacher;

    private string $iconRoot;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');
        $this->teacher = User::factory()->create();
        $this->iconRoot = sys_get_temp_dir().'/lesson-cdn-'.uniqid();
        File::ensureDirectoryExists($this->iconRoot);

        config(['services.cloudinary.url' => 'cloudinary://key:secret@democloud']);
        // The service reads its URL in the constructor, and LibraryCdn must write its manifest
        // into the temp dir, never into the real resources/icons.
        $this->app->forgetInstance(CloudinaryService::class);
        $this->app->bind(LibraryCdn::class, fn ($app) => new LibraryCdn($app->make(CloudinaryService::class), $this->iconRoot));

        // Cloudinary answers with the public id it was given, so each picture gets its own URL.
        Http::fake(['api.cloudinary.com/*' => fn (Request $request) => Http::response([
            'secure_url' => self::CLOUD.$this->publicIdOf($request).'.webp',
        ])]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->iconRoot);

        parent::tearDown();
    }

    private function publicIdOf(Request $request): string
    {
        foreach ($request->data() as $part) {
            if (($part['name'] ?? null) === 'public_id') {
                return (string) $part['contents'];
            }
        }

        return 'unnamed';
    }

    private function libraryAsset(string $ref): SvgAsset
    {
        $path = "svg-assets/library/{$ref}.webp";
        Storage::disk('public')->put($path, "bytes-of-{$ref}");

        return SvgAsset::factory()->create([
            'user_id' => null, 'source' => 'bundled', 'source_ref' => "{$ref}.webp",
            'svg_path' => $path, 'title' => basename($ref), 'width' => 720, 'height' => 1600,
        ]);
    }

    private function compose(array $scene): Scene
    {
        $lesson = app(LessonComposer::class)->build(['key' => 'CDN test', 'scenes' => [$scene]], $this->teacher, narrate: false);

        return $lesson->scenes()->firstOrFail();
    }

    private function danteScene(): array
    {
        return [
            'type' => 'story',
            'script' => 'Firenze.',
            'backdrop' => 'history-line/backdrops/dante/selva',
            'layers' => [
                ['asset' => 'history-line/figures/dante/virgilio', 'x' => 40, 'y' => 60, 'height' => 50],
                ['asset' => 'history-line/figures/dante/virgilio', 'x' => 70, 'y' => 60, 'height' => 50],
            ],
        ];
    }

    public function test_backdrop_and_figures_point_at_cloudinary_as_avif_at_quality_twenty(): void
    {
        $this->libraryAsset('history-line/backdrops/dante/selva');
        $this->libraryAsset('history-line/figures/dante/virgilio');

        $scene = $this->compose($this->danteScene());

        $backdrop = 'https://res.cloudinary.com/democloud/image/upload/f_auto,q_20,c_limit,w_2880,h_2880/v1/library/history-line/backdrops/dante/selva.webp';
        $figure = 'https://res.cloudinary.com/democloud/image/upload/f_auto,q_20,c_limit,w_2880,h_2880/v1/library/history-line/figures/dante/virgilio.webp';
        $this->assertSame($backdrop, $scene->image_path);

        $layers = $scene->shots[0]['layers'];
        $this->assertSame([$backdrop, $figure, $figure], array_column($layers, 'path'));

        // Nothing copied into the lesson's own folder: the lesson lives on the CDN.
        $this->assertSame([], Storage::disk('public')->allFiles("lessons/{$scene->lesson_id}"));
    }

    public function test_a_picture_is_uploaded_once_however_many_lessons_use_it(): void
    {
        $this->libraryAsset('history-line/backdrops/dante/selva');
        $this->libraryAsset('history-line/figures/dante/virgilio');

        $this->compose($this->danteScene());
        $this->compose($this->danteScene());

        // Two distinct pictures, two lessons, one figure used twice per scene: two uploads.
        Http::assertSentCount(2);
    }

    public function test_only_pictures_a_lesson_uses_are_uploaded(): void
    {
        $this->libraryAsset('history-line/backdrops/dante/selva');
        $this->libraryAsset('history-line/figures/dante/virgilio');
        $unused = $this->libraryAsset('history-line/figures/dante/beatrice');

        $this->compose($this->danteScene());

        $this->assertNull($unused->fresh()->cdn_url);
        Http::assertNotSent(fn (Request $r) => $this->publicIdOf($r) === 'library/history-line/figures/dante/beatrice');
    }

    public function test_the_quality_comes_from_config(): void
    {
        config(['lessons.image_quality' => 35]);
        $this->libraryAsset('history-line/backdrops/dante/selva');

        $scene = $this->compose(['type' => 'story', 'script' => 'Firenze.', 'backdrop' => 'history-line/backdrops/dante/selva']);

        $this->assertStringContainsString('/f_auto,q_35,', $scene->image_path);
    }

    public function test_the_manifest_records_each_uploaded_picture(): void
    {
        $this->libraryAsset('history-line/backdrops/dante/selva');
        $this->libraryAsset('history-line/figures/dante/virgilio');

        $this->compose($this->danteScene());

        $manifest = json_decode((string) file_get_contents("{$this->iconRoot}/history-line/cdn.json"), true);
        $this->assertSame(['backdrops/dante/selva.webp', 'figures/dante/virgilio.webp'], array_keys($manifest));
        $this->assertSame(['width' => 720, 'height' => 1600], array_intersect_key($manifest['figures/dante/virgilio.webp'], ['width' => 1, 'height' => 1]));
        $this->assertStringContainsString('library/history-line/figures/dante/virgilio', $manifest['figures/dante/virgilio.webp']['url']);
    }

    public function test_a_machine_without_the_files_imports_them_from_the_manifest_and_composes_without_uploading(): void
    {
        $url = self::CLOUD.'library/history-line/figures/dante/virgilio.webp';
        File::ensureDirectoryExists("{$this->iconRoot}/history-line");
        File::put("{$this->iconRoot}/history-line/cdn.json", json_encode([
            'figures/dante/virgilio.webp' => ['url' => $url, 'width' => 720, 'height' => 1600],
        ]));

        $this->artisan('icons:import', ['--path' => $this->iconRoot, '--collection' => ['history-line']])->assertSuccessful();

        $asset = SvgAsset::query()->where('source_ref', 'history-line/figures/dante/virgilio.webp')->firstOrFail();
        $this->assertSame($url, $asset->cdn_url);
        $this->assertSame(['figures', 'dante'], [$asset->category, $asset->subcategory]);
        $this->assertSame(1600, $asset->height);

        $scene = $this->compose(['type' => 'story', 'script' => 'Virgilio.', 'layers' => [['asset' => 'history-line/figures/dante/virgilio']]]);

        $this->assertSame($url, $scene->shots[0]['layers'][0]['path']);
        Http::assertNothingSent();
    }

    public function test_without_cloudinary_the_picture_is_copied_into_the_lesson_as_before(): void
    {
        config(['services.cloudinary.url' => null]);
        $this->app->forgetInstance(CloudinaryService::class);
        $this->libraryAsset('history-line/backdrops/dante/selva');

        $scene = $this->compose(['type' => 'story', 'script' => 'Firenze.', 'backdrop' => 'history-line/backdrops/dante/selva']);

        $this->assertSame("lessons/{$scene->lesson_id}/scenes/{$scene->id}/bg.webp", $scene->image_path);
        Http::assertNothingSent();
    }
}
