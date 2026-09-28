<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Support\WebpEncoder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Bart: every stored picture is WebP, never over 1920px, at 80% quality; cut-outs keep their alpha. */
class WebpEncoderTest extends TestCase
{
    public function test_an_uploaded_png_is_stored_as_capped_webp_with_its_transparency(): void
    {
        Storage::fake('public');
        $img = imagecreatetruecolor(3000, 1500);
        imagealphablending($img, false);
        imagesavealpha($img, true);
        imagefill($img, 0, 0, imagecolorallocatealpha($img, 255, 255, 255, 127));   // fully clear
        imagefilledrectangle($img, 1000, 500, 2000, 1000, imagecolorallocate($img, 200, 30, 30));
        ob_start();
        imagepng($img);
        $png = (string) ob_get_clean();
        $file = UploadedFile::fake()->createWithContent('figure.png', $png);

        $path = WebpEncoder::storeUpload($file, 'lessons/1/uploads', 'portrait');

        $this->assertSame('lessons/1/uploads/portrait.webp', $path);
        $stored = imagecreatefromstring(Storage::disk('public')->get($path));
        $this->assertSame(1920, imagesx($stored));
        $this->assertSame(960, imagesy($stored));
        $this->assertSame(127, (imagecolorat($stored, 5, 5) >> 24) & 0x7F);                // corner still clear
        $this->assertSame(0, (imagecolorat($stored, 960, 480) >> 24) & 0x7F);             // red block opaque
    }

    public function test_a_gif_is_stored_as_it_came(): void
    {
        Storage::fake('public');
        $path = WebpEncoder::storeUpload(UploadedFile::fake()->image('wave.gif', 20, 20), 'u');

        $this->assertStringEndsWith('.gif', $path);
    }
}
