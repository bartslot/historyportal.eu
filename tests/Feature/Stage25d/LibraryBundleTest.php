<?php

declare(strict_types=1);

namespace Tests\Feature\Stage25d;

use App\Services\Stage25d\LibraryBundle;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use Tests\TestCase;

class LibraryBundleTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->dir = sys_get_temp_dir().'/s25d-lib-'.uniqid();
        mkdir($this->dir);
        file_put_contents("{$this->dir}/a.webp", 'AAA');
        file_put_contents("{$this->dir}/library.json", json_encode(['bundle' => 'demo-bundle', 'assets' => [['id' => 'a', 'file' => 'a.webp']]]));
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob($this->dir.'/*') ?: []);
        @rmdir($this->dir);
        parent::tearDown();
    }

    public function test_sync_copies_then_skips_unchanged_files(): void
    {
        $b = new LibraryBundle;
        $this->assertSame(['bundle' => 'demo-bundle', 'copied' => 2, 'skipped' => 0], $b->sync($this->dir));
        Storage::disk('public')->assertExists('library/demo-bundle/a.webp');
        $this->assertSame(['bundle' => 'demo-bundle', 'copied' => 0, 'skipped' => 2], $b->sync($this->dir));

        file_put_contents("{$this->dir}/a.webp", 'BBBB');
        $this->assertSame(1, $b->sync($this->dir)['copied']);
    }

    public function test_a_missing_file_fails_before_anything_is_copied(): void
    {
        unlink("{$this->dir}/a.webp");
        $this->expectException(InvalidArgumentException::class);
        try {
            (new LibraryBundle)->sync($this->dir);
        } finally {
            Storage::disk('public')->assertMissing('library/demo-bundle/library.json');
        }
    }

    public function test_thumbs_are_small_copies_of_still_pictures_made_once(): void
    {
        $big = imagecreatetruecolor(1200, 600);
        imagewebp($big, "{$this->dir}/a.webp");
        file_put_contents("{$this->dir}/fire.webp", 'SHEET');
        file_put_contents("{$this->dir}/library.json", json_encode(['bundle' => 'demo-bundle', 'assets' => [
            ['id' => 'a', 'file' => 'a.webp'],
            ['id' => 'fire', 'file' => 'fire.webp', 'kind' => 'animation'],   // a sheet plays in its tile: no thumb
        ]]));
        $b = new LibraryBundle;
        $b->sync($this->dir);

        $this->assertSame(['made' => 1, 'kept' => 0, 'failed' => []], $b->thumbs('demo-bundle'));
        [$w, $h] = getimagesizefromstring(Storage::disk('public')->get('library/demo-bundle/thumbs/a.webp'));
        $this->assertSame([LibraryBundle::THUMB_PX, LibraryBundle::THUMB_PX / 2], [$w, $h]);
        Storage::disk('public')->assertMissing('library/demo-bundle/thumbs/fire.webp');
        $this->assertSame(['made' => 0, 'kept' => 1, 'failed' => []], $b->thumbs('demo-bundle'));
    }

    public function test_a_picture_that_does_not_decode_is_reported_not_thumbed(): void
    {
        (new LibraryBundle)->sync($this->dir);   // a.webp holds 'AAA'
        $this->assertSame(['made' => 0, 'kept' => 0, 'failed' => ['a.webp']], (new LibraryBundle)->thumbs('demo-bundle'));
    }

    public function test_the_version_stamp_changes_when_a_library_is_synced_again(): void
    {
        $b = new LibraryBundle;
        $b->sync($this->dir);
        $before = LibraryBundle::version();
        file_put_contents("{$this->dir}/library.json", json_encode(['bundle' => 'demo-bundle', 'version' => 2, 'assets' => [['id' => 'a', 'file' => 'a.webp']]]));
        $b->sync($this->dir);
        touch(Storage::disk('public')->path('library/demo-bundle/library.json'), time() + 60);   // a later sync, a later file time
        $this->assertNotSame($before, LibraryBundle::version());
    }

    public function test_url_and_names(): void
    {
        $this->assertSame('/storage/library/nl-prehistory/library.json', LibraryBundle::url('nl-prehistory'));
        $this->expectException(InvalidArgumentException::class);
        LibraryBundle::url('Bad Name');
    }
}
