<?php

declare(strict_types=1);

namespace Tests\Feature\Art;

use App\Models\FalLedgerEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ArtBakeoffCommandTest extends TestCase
{
    use RefreshDatabase;

    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();

        $this->dir = sys_get_temp_dir().'/bakeoff-test-'.uniqid();
        mkdir($this->dir);
        $png = $this->png();
        foreach (['source', 'people', 'environment'] as $name) {
            file_put_contents("{$this->dir}/{$name}.png", $png);
        }

        config([
            'services.falai.api_key' => 'test',
            'art.poll_seconds' => 0,
            'art.budget_usd' => 17.0,
            'art.anchors' => ['people' => "{$this->dir}/people.png", 'environment' => "{$this->dir}/environment.png"],
            'art.bakeoff_models' => ['fal-ai/bytedance/seedream/v4.5/edit', 'fal-ai/flux-pro/kontext/max/multi', 'fal-ai/nano-banana-pro/edit'],
        ]);
    }

    protected function tearDown(): void
    {
        array_map('unlink', glob("{$this->dir}/*") ?: []);
        rmdir($this->dir);
        parent::tearDown();
    }

    private function png(): string
    {
        $img = imagecreatetruecolor(2, 2);
        ob_start();
        imagepng($img);

        return (string) ob_get_clean();
    }

    public function test_dry_run_prints_nine_rows_and_sends_nothing(): void
    {
        Http::fake();

        $this->artisan('art:bakeoff', ['--dry-run' => true, '--source' => "{$this->dir}/source.png"])
            ->expectsOutputToContain('no price: skipped')
            ->expectsOutputToContain('Total: $1.02')
            ->assertSuccessful();

        Http::assertNothingSent();
        $this->assertSame(0, FalLedgerEntry::count());
    }

    public function test_a_real_run_refuses_without_style_anchors(): void
    {
        Http::fake();
        config(['art.anchors' => ['people' => '/nope/people.png', 'environment' => '/nope/env.png']]);

        $this->artisan('art:bakeoff', ['--source' => "{$this->dir}/source.png"])->assertFailed();

        Http::assertNothingSent();
    }

    public function test_a_run_saves_each_image_and_skips_unpriced_models(): void
    {
        Http::fake([
            'queue.fal.run/*/status' => Http::response(['status' => 'COMPLETED']),
            'queue.fal.run/*/requests/r1' => Http::response(['images' => [['url' => 'https://x.test/img.png']]]),
            'queue.fal.run/*' => Http::response([
                'request_id' => 'r1',
                'status_url' => 'https://queue.fal.run/m/requests/r1/status',
                'response_url' => 'https://queue.fal.run/m/requests/r1',
            ]),
            'x.test/*' => Http::response($this->png()),
        ]);

        $this->artisan('art:bakeoff', ['--source' => "{$this->dir}/source.png", '--tests' => 'A', '--max-usd' => 1])
            ->assertSuccessful();

        $this->assertSame(2, FalLedgerEntry::where('status', 'completed')->count());
        Http::assertNotSent(fn ($r) => str_contains($r->url(), 'kontext'));

        $run = collect(glob(storage_path('app/bakeoff/*')))->sort()->last();
        $this->assertFileExists("{$run}/A_fal-ai_bytedance_seedream_v4-5_edit.png");
        $this->assertStringContainsString('composition preservation', (string) file_get_contents("{$run}/index.html"));
        array_map('unlink', glob("{$run}/*") ?: []);
        rmdir($run);
    }
}
