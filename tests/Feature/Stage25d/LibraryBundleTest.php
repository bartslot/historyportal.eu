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

    public function test_url_and_names(): void
    {
        $this->assertSame('/storage/library/nl-prehistory/library.json', LibraryBundle::url('nl-prehistory'));
        $this->expectException(InvalidArgumentException::class);
        LibraryBundle::url('Bad Name');
    }
}
