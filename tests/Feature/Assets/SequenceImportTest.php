<?php

declare(strict_types=1);

namespace Tests\Feature\Assets;

use App\Livewire\Wizard\IconPanel;
use App\Models\User;
use App\Services\Assets\SequenceImporter;
use App\Services\Diorama\LibraryAssets;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

class SequenceImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        config(['services.jev.key' => 'test-key', 'services.jev.url' => 'https://jev.test/v1/systemone']);
        Http::fake(['jev.test/*' => Http::response(['answers' => ['height' => ['choice' => '1.75', 'probabilities' => ['1.75' => 0.9], 'confidence' => 0.8]]])]);
    }

    /** A 200 × 400 frame, transparent except a figure in rows 100..399 whose x-offset is $shift. */
    private function frame(string $name, int $shift = 0): UploadedFile
    {
        $img = imagecreatetruecolor(200, 400);
        imagesavealpha($img, true);
        imagealphablending($img, false);
        imagefill($img, 0, 0, imagecolorallocatealpha($img, 0, 0, 0, 127));
        imagefilledrectangle($img, 60 + $shift, 100, 139 + $shift, 399, imagecolorallocatealpha($img, 40, 60, 120, 0));
        ob_start();
        imagepng($img);

        return UploadedFile::fake()->createWithContent($name, (string) ob_get_clean());
    }

    public function test_a_sequence_becomes_one_animated_library_asset(): void
    {
        $files = [
            $this->frame('sailor_walk_0002.png', 10), $this->frame('sailor_walk_0001.png'),
            $this->frame('sailor_idle_0001.png'), $this->frame('sailor_idle_0002.png', -10),
        ];

        $asset = app(SequenceImporter::class)->import($files, 'A sailor in a short jacket.', 'figures');

        $this->assertSame('Sailor', $asset->title);
        $this->assertSame(1.75, $asset->height_m);
        $this->assertSame(['frames' => 4, 'anims' => [
            'idle' => ['frames' => [0, 1], 'fps' => SequenceImporter::DEFAULT_FPS],
            'walk' => ['frames' => [2, 3], 'stride_m' => 1.45],     // 0.83 × 1.75
        ]], $asset->sheet);
        Storage::disk('public')->assertExists($asset->svg_path);

        // One shared crop: the drawn union (x 50..150, y 100..400) plus a little margin, every frame.
        $this->assertSame($asset->height, imagesy(imagecreatefromstring(Storage::disk('public')->get($asset->svg_path))));
        $this->assertLessThanOrEqual(310, $asset->height);
        $this->assertGreaterThanOrEqual(300, $asset->height);
        $this->assertSame(0, $asset->width % 4);

        Http::assertSent(fn ($r) => str_contains($r->body(), 'A sailor in a short jacket.'));
    }

    public function test_the_stage_gets_one_frame_s_size_and_the_clips(): void
    {
        $asset = app(SequenceImporter::class)->import([$this->frame('boy_wave_1.png'), $this->frame('boy_wave_2.png')], 'A boy waving.', 'figures');

        $stage = LibraryAssets::forSpec(['items' => [['asset' => 'library:'.$asset->id]]])['library:'.$asset->id];

        $this->assertEqualsWithDelta($asset->width / 2 / $stage['px_per_m'], $stage['frame_m'][0], 0.001);
        $this->assertSame($asset->sheet, $stage['sheet']);
    }

    public function test_importing_again_updates_the_same_asset(): void
    {
        $first = app(SequenceImporter::class)->import([$this->frame('sailor_walk_1.png')], 'A sailor.', 'figures');
        $again = app(SequenceImporter::class)->import([$this->frame('sailor_walk_1.png'), $this->frame('sailor_walk_2.png')], 'A sailor.', 'figures');

        $this->assertSame($first->id, $again->id);
        $this->assertSame(2, $again->fresh()->sheet['frames']);
    }

    public function test_an_admin_imports_from_the_assets_panel_and_lands_on_it(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Livewire::actingAs($admin)->test(IconPanel::class)
            ->set('sequenceFiles', [$this->frame('fante_walk_0001.png'), $this->frame('fante_walk_0002.png', 8)])
            ->set('sequenceWhat', 'A foot soldier with a spear, walking.')
            ->set('sequenceCategory', 'figures')
            ->call('importSequence')
            ->assertHasNoErrors()
            ->assertDispatched('sequence-imported')
            ->assertSet('collection', 'history-line')
            ->assertSet('category', 'figures');
    }

    public function test_a_bad_sequence_shows_why_in_the_dialog_and_stores_nothing(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Livewire::actingAs($admin)->test(IconPanel::class)
            ->set('sequenceFiles', [$this->frame('fante_walk_0001.png'), $this->frame('fante_walk_0003.png')])
            ->set('sequenceWhat', 'A foot soldier.')
            ->call('importSequence')
            ->assertHasErrors(['sequenceFiles' => 'walk is missing frame 2.']);

        $this->assertSame(0, \App\Models\SvgAsset::where('source', 'sequence')->count());
    }

    public function test_a_teacher_cannot_import_into_the_shared_library(): void
    {
        $teacher = User::factory()->create(['role' => 'teacher']);

        Livewire::actingAs($teacher)->test(IconPanel::class)
            ->set('sequenceFiles', [$this->frame('fante_walk_0001.png')])
            ->set('sequenceWhat', 'A foot soldier.')
            ->call('importSequence')
            ->assertForbidden();
    }
}
