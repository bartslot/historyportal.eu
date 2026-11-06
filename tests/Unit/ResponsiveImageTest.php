<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\ResponsiveImage;
use Illuminate\Support\Facades\File;
use Tests\TestCase;

class ResponsiveImageTest extends TestCase
{
    private string $directory;

    protected function setUp(): void
    {
        parent::setUp();
        $this->directory = public_path('responsive-image-test');
        File::ensureDirectoryExists($this->directory);
        $this->writeImage('picture.webp', 1000);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->directory);
        parent::tearDown();
    }

    private function writeImage(string $name, int $width): void
    {
        $canvas = imagecreatetruecolor($width, 10);
        imagewebp($canvas, $this->directory.'/'.$name);
        imagedestroy($canvas);
    }

    public function test_it_lists_the_smaller_copies_and_the_original_by_width(): void
    {
        $this->writeImage('picture-480.webp', 480);

        $this->assertSame(
            'https://site.test/responsive-image-test/picture-480.webp 480w, https://site.test/responsive-image-test/picture.webp 1000w',
            ResponsiveImage::srcset('https://site.test/responsive-image-test/picture.webp'),
        );
    }

    public function test_a_picture_without_smaller_copies_has_no_srcset(): void
    {
        $this->assertNull(ResponsiveImage::srcset('https://site.test/responsive-image-test/picture.webp'));
    }

    public function test_a_picture_that_is_not_on_our_disk_has_no_srcset(): void
    {
        $this->assertNull(ResponsiveImage::srcset('https://res.cloudinary.com/demo/image/upload/nothing-here.webp'));
        $this->assertNull(ResponsiveImage::srcset('/storage/../../etc/passwd'));
    }

    public function test_it_writes_a_copy_at_the_asked_width(): void
    {
        ResponsiveImage::writeCopies($this->directory.'/picture.webp', [480]);

        $this->assertSame(480, getimagesize($this->directory.'/picture-480.webp')[0]);
    }

    public function test_the_real_home_page_pictures_have_their_copies(): void
    {
        foreach (['en', 'nl', 'de', 'fr', 'it'] as $language) {
            $this->assertStringContainsString('-828.webp 828w', (string) ResponsiveImage::srcset("/help-media/{$language}/tour-scene.jpg"));
        }

        $this->assertStringContainsString('-480.webp 480w', (string) ResponsiveImage::srcset('/lesson-titles/tasman-standard/poster/portrait-still.webp'));
    }
}
