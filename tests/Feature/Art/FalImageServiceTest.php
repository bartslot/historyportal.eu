<?php

declare(strict_types=1);

namespace Tests\Feature\Art;

use App\Models\FalLedgerEntry;
use App\Services\Art\FalBudgetExceeded;
use App\Services\Art\FalImageService;
use App\Services\Art\FalLedger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FalImageServiceTest extends TestCase
{
    use RefreshDatabase;

    private const MODEL = 'fal-ai/bytedance/seedream/v4.5/edit';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.falai.api_key' => 'test',
            'art.poll_seconds' => 0,
            'art.poll_retry_backoff' => [0, 0, 0, 0, 0],
            'art.budget_usd' => 1.0,
        ]);
    }

    private function png(): string
    {
        $img = imagecreatetruecolor(2, 2);
        ob_start();
        imagepng($img);

        return (string) ob_get_clean();
    }

    private function fakeFal(): void
    {
        Http::fake([
            'queue.fal.run/*/status' => Http::response(['status' => 'COMPLETED']),
            'queue.fal.run/*/requests/r1' => Http::response(['images' => [['url' => 'https://x.test/img.png']]]),
            'queue.fal.run/*' => Http::response([
                'request_id' => 'r1',
                'status_url' => 'https://queue.fal.run/'.self::MODEL.'/requests/r1/status',
                'response_url' => 'https://queue.fal.run/'.self::MODEL.'/requests/r1',
            ]),
            'x.test/*' => Http::response($this->png()),
        ]);
    }

    public function test_polling_rides_out_network_blips_without_posting_again(): void
    {
        Http::fake([
            'queue.fal.run/*/status' => Http::sequence()
                ->pushFailedConnection()
                ->pushFailedConnection()
                ->push(['status' => 'COMPLETED']),
            'queue.fal.run/*/requests/r1' => Http::sequence()
                ->push('', 502)
                ->push(['images' => [['url' => 'https://x.test/img.png']]]),
            'queue.fal.run/*' => Http::response([
                'request_id' => 'r1',
                'status_url' => 'https://queue.fal.run/'.self::MODEL.'/requests/r1/status',
                'response_url' => 'https://queue.fal.run/'.self::MODEL.'/requests/r1',
            ]),
            'x.test/*' => Http::response($this->png()),
        ]);

        $bytes = app(FalImageService::class)->edit(self::MODEL, 'draw it', ['https://src.test/a.jpg'], 2560, 1440, 'bakeoff');

        $this->assertSame($this->png(), $bytes);
        $this->assertSame('completed', FalLedgerEntry::sole()->status);
        $this->assertCount(2, Http::recorded(fn (Request $r) => str_ends_with($r->url(), '/requests/r1')), 'the 502 was retried');
        $this->assertCount(1, Http::recorded(fn (Request $r) => $r->method() === 'POST'), 'exactly one paid POST');
    }

    public function test_polling_gives_up_after_the_retries_run_out(): void
    {
        config(['art.poll_retry_backoff' => [0, 0]]);
        $polls = 0;
        Http::fake([
            'queue.fal.run/*/status' => function () use (&$polls) {
                $polls++;
                throw new \Illuminate\Http\Client\ConnectionException('cURL error 28');
            },
            'queue.fal.run/*' => Http::response([
                'request_id' => 'r1',
                'status_url' => 'https://queue.fal.run/'.self::MODEL.'/requests/r1/status',
                'response_url' => 'https://queue.fal.run/'.self::MODEL.'/requests/r1',
            ]),
        ]);

        try {
            app(FalImageService::class)->edit(self::MODEL, 'draw it', ['https://src.test/a.jpg'], 2560, 1440, 'bakeoff');
            $this->fail('expected the blip to win in the end');
        } catch (\Illuminate\Http\Client\ConnectionException) {
        }

        $this->assertSame(3, $polls, '1 try + 2 retries');
        $this->assertCount(1, Http::recorded(fn (Request $r) => $r->method() === 'POST'));
        $this->assertSame('failed', FalLedgerEntry::sole()->status);
    }

    public function test_happy_path_returns_bytes_and_records_a_completed_row(): void
    {
        $this->fakeFal();

        $bytes = app(FalImageService::class)->edit(self::MODEL, 'draw it', ['https://src.test/a.jpg'], 2560, 1440, 'bakeoff');

        $this->assertSame($this->png(), $bytes);
        $row = FalLedgerEntry::sole();
        $this->assertSame('completed', $row->status);
        $this->assertSame('r1', $row->request_id);
        $this->assertEqualsWithDelta(0.04, $row->estimated_usd, 0.0001);
    }

    public function test_a_model_without_a_price_is_refused_before_any_request(): void
    {
        Http::fake();

        $this->expectException(FalBudgetExceeded::class);
        try {
            app(FalImageService::class)->generate('fal-ai/unpriced/model', 'x', 2048, 2048, 'bakeoff');
        } finally {
            Http::assertNothingSent();
            $this->assertSame(0, FalLedgerEntry::count());
        }
    }

    public function test_the_global_budget_blocks_a_call_that_would_overspend(): void
    {
        Http::fake();
        FalLedgerEntry::create(['model' => self::MODEL, 'purpose' => 'bakeoff', 'estimated_usd' => 0.99, 'status' => 'completed']);

        $this->expectException(FalBudgetExceeded::class);
        try {
            app(FalImageService::class)->edit(self::MODEL, 'x', ['https://src.test/a.jpg'], 2560, 1440, 'bakeoff');
        } finally {
            Http::assertNothingSent();
        }
    }

    public function test_the_run_cap_stops_the_second_call_before_sending(): void
    {
        $this->fakeFal();
        $fal = app(FalImageService::class)->capRun(0.05);

        $fal->edit(self::MODEL, 'x', ['https://src.test/a.jpg'], 2560, 1440, 'bakeoff');
        $sentAfterFirst = count(Http::recorded());

        $this->expectException(FalBudgetExceeded::class);
        try {
            $fal->edit(self::MODEL, 'x', ['https://src.test/a.jpg'], 2560, 1440, 'bakeoff');
        } finally {
            $this->assertCount($sentAfterFirst, Http::recorded());
        }
    }

    public function test_a_failed_submit_is_recorded_and_not_counted_as_spend(): void
    {
        Http::fake(['queue.fal.run/*' => Http::response(['detail' => 'boom'], 500)]);

        try {
            app(FalImageService::class)->edit(self::MODEL, 'x', ['https://src.test/a.jpg'], 2560, 1440, 'bakeoff');
            $this->fail('expected an exception');
        } catch (\Throwable) {
            // expected
        }

        $row = FalLedgerEntry::sole();
        $this->assertSame('failed', $row->status);
        $this->assertNull($row->request_id);
        $this->assertEqualsWithDelta(0.0, app(FalLedger::class)->spentUsd(), 0.0001);
    }

    public function test_file_paths_and_raw_bytes_are_sent_as_data_uris(): void
    {
        $this->fakeFal();
        $path = tempnam(sys_get_temp_dir(), 'ref');
        file_put_contents($path, $this->png());

        app(FalImageService::class)->edit(self::MODEL, 'x', [$path, $this->png()], 2560, 1440, 'bakeoff');
        unlink($path);

        Http::assertSent(function (Request $request) {
            $urls = $request->data()['image_urls'] ?? null;

            return $request->method() === 'POST'
                && is_array($urls) && count($urls) === 2
                && str_starts_with($urls[0], 'data:image/png;base64,')
                && str_starts_with($urls[1], 'data:image/png;base64,');
        });
    }

    public function test_fixed_model_input_is_sent_with_every_call(): void
    {
        $this->fakeFal();

        app(FalImageService::class)->edit('fal-ai/nano-banana-pro/edit', 'x', ['https://src.test/a.jpg'], 4096, 4096, 'bakeoff');

        Http::assertSent(fn (Request $r) => $r->method() === 'POST'
            && ($r->data()['resolution'] ?? null) === '4K'
            && ($r->data()['aspect_ratio'] ?? null) === '1:1');
    }

    public function test_aspect_ratio_models_get_the_nearest_ratio_instead_of_pixels(): void
    {
        $this->fakeFal();

        app(FalImageService::class)->edit('fal-ai/nano-banana/edit', 'x', ['https://src.test/a.jpg'], 4096, 2304, 'bakeoff');

        Http::assertSent(fn (Request $r) => $r->method() === 'POST'
            && ($r->data()['aspect_ratio'] ?? null) === '16:9'
            && ! isset($r->data()['image_size']));
    }
}
