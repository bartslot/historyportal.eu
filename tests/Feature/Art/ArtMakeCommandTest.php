<?php

declare(strict_types=1);

namespace Tests\Feature\Art;

use App\Console\Commands\ArtMake;
use App\Models\FalLedgerEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ArtMakeCommandTest extends TestCase
{
    use RefreshDatabase;

    private string $dir;

    private const ITEMS = ['nord' => 'a circle', 'est' => 'a circle', 'sud' => 'a circle', 'ovest' => 'a circle'];

    protected function setUp(): void
    {
        parent::setUp();

        $this->dir = sys_get_temp_dir().'/art-make-test-'.uniqid();
        File::ensureDirectoryExists("{$this->dir}/manifests");
        foreach (['people', 'environment'] as $name) {
            file_put_contents("{$this->dir}/{$name}.png", $this->sheetPng());
        }

        config([
            'services.falai.api_key' => 'test',
            'art.poll_seconds' => 0,
            'art.budget_usd' => 17.0,
            'art.source_filter' => 'pd_cc0',
            'art.anchors' => ['people' => "{$this->dir}/people.png", 'environment' => "{$this->dir}/environment.png"],
            'art.manifests_path' => "{$this->dir}/manifests",
            'art.library_path' => "{$this->dir}/library",
            'art.raw_path' => "{$this->dir}/raw",
        ]);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->dir);
        parent::tearDown();
    }

    public function test_dry_run_prints_the_plan_and_sends_nothing(): void
    {
        Http::fake();
        $this->manifest(sheets: [$this->sheet()], conversions: [$this->conversion()]);

        $this->artisan('art:make', ['manifest' => 'pack', '--dry-run' => true])
            ->expectsOutputToContain('Total: $0.60')
            ->assertSuccessful();

        Http::assertNothingSent();
        $this->assertSame(0, FalLedgerEntry::count());
    }

    public function test_a_2x2_sheet_writes_four_transparent_webps_and_skips_them_next_time(): void
    {
        $this->requirePillow();
        $this->fakeFal();
        $this->manifest(sheets: [$this->sheet()]);

        $this->artisan('art:make', ['manifest' => 'pack', '--max-usd' => 1])
            ->expectsOutputToContain('test-sheet: cut per detected figure')
            ->assertSuccessful();

        foreach (array_keys(self::ITEMS) as $slug) {
            $path = "{$this->dir}/library/history-line/figures/test/{$slug}.webp";
            $this->assertFileExists($path);
            $img = imagecreatefromwebp($path);
            $this->assertSame(127, imagecolorat($img, 0, 0) >> 24 & 0x7F, "{$slug}: corner is transparent");
            $this->assertSame(0, imagecolorat($img, intdiv(imagesx($img), 2), intdiv(imagesy($img), 2)) >> 24 & 0x7F,
                "{$slug}: the enclosed interior stays opaque");
        }
        $this->assertFileExists("{$this->dir}/raw/pack/test-sheet.png");
        $this->assertSame(1, FalLedgerEntry::count());

        $this->artisan('art:make', ['manifest' => 'pack', '--max-usd' => 1])
            ->expectsOutputToContain('Total: $0.00')
            ->assertSuccessful();
        $this->assertSame(1, FalLedgerEntry::count(), 'existing outputs are skipped');
    }

    public function test_a_source_that_is_not_public_domain_is_refused_and_never_sent(): void
    {
        $this->fakeFal(license: 'CC BY-SA 4.0');
        $this->manifest(conversions: [$this->conversion()]);

        $this->artisan('art:make', ['manifest' => 'pack'])
            ->expectsOutputToContain('not public domain / CC0')
            ->assertSuccessful();

        Http::assertNotSent(fn (Request $r) => str_contains($r->url(), 'queue.fal.run') || str_contains($r->url(), 'Special:FilePath'));
        $this->assertFileDoesNotExist("{$this->dir}/library/history-line/backdrops/test/converted.webp");
    }

    public function test_a_public_domain_conversion_is_written_and_credited(): void
    {
        $this->requirePillow();
        $this->fakeFal(license: 'Public domain');
        $this->manifest(conversions: [$this->conversion()]);

        $this->artisan('art:make', ['manifest' => 'pack'])->assertSuccessful();

        $this->assertFileExists("{$this->dir}/library/history-line/backdrops/test/converted.webp");
        $credits = json_decode((string) file_get_contents("{$this->dir}/library/history-line/credits.json"), true);
        $this->assertSame([['source' => 'Old master.jpg', 'credit' => 'Gustave Doré, via Wikimedia Commons', 'license' => 'Public domain']],
            $credits['converted']);
    }

    public function test_a_kept_raw_image_is_cleaned_again_without_calling_fal(): void
    {
        $this->requirePillow();
        Http::fake();
        $this->manifest(sheets: [$this->sheet()], conversions: [$this->conversion()]);
        File::ensureDirectoryExists("{$this->dir}/raw/pack");
        file_put_contents("{$this->dir}/raw/pack/test-sheet.png", $this->sheetPng());
        file_put_contents("{$this->dir}/raw/pack/converted.png", $this->sheetPng());

        $this->artisan('art:make', ['manifest' => 'pack'])
            ->expectsOutputToContain('reuse raw')
            ->expectsOutputToContain('Total: $0.00')
            ->assertSuccessful();

        Http::assertNothingSent();
        $this->assertSame(0, FalLedgerEntry::count());
        foreach ([...array_map(fn ($s) => "figures/test/{$s}", array_keys(self::ITEMS)), 'backdrops/test/converted'] as $out) {
            $this->assertFileExists("{$this->dir}/library/history-line/{$out}.webp");
        }
    }

    public function test_regenerate_calls_fal_even_with_a_kept_raw(): void
    {
        $this->manifest(sheets: [$this->sheet()]);
        File::ensureDirectoryExists("{$this->dir}/raw/pack");
        file_put_contents("{$this->dir}/raw/pack/test-sheet.png", $this->sheetPng());

        $this->artisan('art:make', ['manifest' => 'pack', '--regenerate' => true, '--dry-run' => true])
            ->expectsOutputToContain('Total: $0.30')
            ->assertSuccessful();
    }

    #[DataProvider('licenses')]
    public function test_only_licences_that_start_public_domain_or_cc0_pass(string $license, bool $allowed): void
    {
        $this->assertSame($allowed, ArtMake::isPublicDomain($license));
    }

    public static function licenses(): array
    {
        return [
            'not public domain' => ['not public domain', false],
            'CC BY-SA 4.0' => ['CC BY-SA 4.0', false],
            'Public domain' => ['Public domain', true],
            'PD-old-100' => ['PD-old-100', true],
            'CC0' => ['CC0', true],
        ];
    }

    private function requirePillow(): void
    {
        if (! Process::run(['python3', '-c', 'import PIL'])->successful()) {
            $this->markTestSkipped('python3 with Pillow is not installed.');
        }
    }

    private function fakeFal(string $license = 'Public domain'): void
    {
        Http::fake([
            'commons.wikimedia.org/w/api.php*' => Http::response(['query' => ['pages' => [[
                'title' => 'File:Old master.jpg',
                'imageinfo' => [['width' => 2000, 'height' => 1200, 'extmetadata' => [
                    'LicenseShortName' => ['value' => $license], 'Artist' => ['value' => 'Gustave Doré'],
                ]]],
            ]]]]),
            'commons.wikimedia.org/wiki/Special:FilePath/*' => Http::response($this->sheetPng()),
            'queue.fal.run/*/status' => Http::response(['status' => 'COMPLETED']),
            'queue.fal.run/*/requests/r1' => Http::response(['images' => [['url' => 'https://x.test/img.png']]]),
            'queue.fal.run/*' => Http::response([
                'request_id' => 'r1',
                'status_url' => 'https://queue.fal.run/m/requests/r1/status',
                'response_url' => 'https://queue.fal.run/m/requests/r1',
            ]),
            'x.test/*' => Http::response($this->sheetPng()),
        ]);
    }

    /** 400x400 white with one outlined circle per 2x2 cell. */
    private function sheetPng(): string
    {
        $img = imagecreatetruecolor(400, 400);
        imagefill($img, 0, 0, imagecolorallocate($img, 255, 255, 255));
        imagesetthickness($img, 3);
        $black = imagecolorallocate($img, 0, 0, 0);
        foreach ([[100, 100], [300, 100], [100, 300], [300, 300]] as [$x, $y]) {
            imageellipse($img, $x, $y, 120, 120, $black);
        }
        ob_start();
        imagepng($img);

        return (string) ob_get_clean();
    }

    private function sheet(): array
    {
        return ['name' => 'test-sheet', 'category' => 'figures', 'subcategory' => 'test', 'grid' => '2x2',
            'figures' => false, 'era' => 'c. 1300', 'place' => 'Florence', 'items' => self::ITEMS];
    }

    private function conversion(): array
    {
        return ['slug' => 'converted', 'category' => 'backdrops', 'subcategory' => 'test',
            'source' => 'commons:Old master.jpg', 'constraints' => ''];
    }

    private function manifest(array $sheets = [], array $plates = [], array $conversions = []): void
    {
        $manifest = ['collection' => 'history-line', 'sheets' => $sheets, 'plates' => $plates, 'conversions' => $conversions];
        file_put_contents("{$this->dir}/manifests/pack.php", '<?php return '.var_export($manifest, true).';');
    }
}
