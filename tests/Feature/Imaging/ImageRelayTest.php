<?php

declare(strict_types=1);

namespace Tests\Feature\Imaging;

use App\Models\ImageRelayRequest;
use App\Services\Imaging\ImageRelay;
use App\Services\Imaging\ImageRoute;
use App\Services\OpenAiImageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Process\PendingProcess;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Sleep;
use RuntimeException;
use Tests\TestCase;

/** Bart 2026-11-21: AI pictures are made by ChatGPT on his Mac, not on paid OpenAI image credits. */
class ImageRelayTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        config()->set('services.image_generation.relay_token', 'relay-secret');
    }

    private function mac(): array
    {
        return ['Authorization' => 'Bearer relay-secret'];
    }

    public function test_with_the_relay_driver_the_paid_api_is_never_called(): void
    {
        config()->set('services.image_generation.driver', ImageRoute::RELAY);
        config()->set('services.image_generation.relay_pickup', 0);
        Http::fake();

        try {
            app(OpenAiImageService::class)->generateStillPngBytes('A Venetian galley', '1536x1024');
            $this->fail('expected the relay to report the Mac is off');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('Nobody picked up the picture', $e->getMessage());
        }

        Http::assertNothingSent();
        $this->assertSame(ImageRelayRequest::FAILED, ImageRelayRequest::sole()->status);
    }

    public function test_the_mac_claims_a_request_reads_its_inputs_and_sends_the_picture_back(): void
    {
        $row = ImageRelayRequest::create(['prompt' => 'Restyle it', 'size' => '1024x1024', 'transparent' => true]);
        Storage::disk('local')->put($row->dir().'/in-1-source.png', 'SOURCE');
        $row->update(['inputs' => [$row->dir().'/in-1-source.png']]);

        $next = $this->postJson(route('api.image-relay.next'), [], $this->mac())->assertOk()->json('request');
        $this->assertSame($row->id, $next['id']);
        $this->assertTrue($next['transparent']);
        $this->assertSame(['in-1-source.png'], $next['names']);
        $this->assertSame(ImageRelayRequest::RUNNING, $row->fresh()->status);

        $this->assertSame('SOURCE', $this->get($next['inputs'][0], $this->mac())->assertOk()->getContent());
        $this->postJson(route('api.image-relay.next'), [], $this->mac())->assertOk()->assertJson(['request' => null]);

        $this->post(route('api.image-relay.finish', $row), ['picture' => UploadedFile::fake()->image('result.png', 8, 8)], $this->mac())->assertOk();
        $this->assertSame(ImageRelayRequest::DONE, $row->fresh()->status);
        Storage::disk('local')->assertExists($row->fresh()->result_path);
    }

    public function test_a_request_whose_pictures_are_still_being_written_is_not_handed_out(): void
    {
        ImageRelayRequest::create(['prompt' => 'x', 'size' => '1024x1024', 'status' => ImageRelayRequest::PREPARING]);
        $this->postJson(route('api.image-relay.next'), [], $this->mac())->assertOk()->assertJson(['request' => null]);
    }

    public function test_a_job_that_stops_waiting_leaves_nothing_for_the_mac_to_claim(): void
    {
        Sleep::fake();
        Sleep::whenFakingSleep(fn () => throw new \RuntimeException('worker stopped'));

        try {
            app(ImageRelay::class)->make('Restyle it', '1024x1024', false, [['bytes' => 'SOURCE', 'name' => 'source.png']]);
            $this->fail('the wait should have ended in the exception');
        } catch (\RuntimeException $e) {
            $this->assertSame('worker stopped', $e->getMessage());
        }

        $row = ImageRelayRequest::query()->latest('id')->first();
        $this->assertSame(ImageRelayRequest::FAILED, $row->status);
        Storage::disk('local')->assertMissing($row->dir());
        $this->postJson(route('api.image-relay.next'), [], $this->mac())->assertOk()->assertJson(['request' => null]);
    }

    public function test_a_finished_request_is_returned_to_the_waiting_job(): void
    {
        $row = ImageRelayRequest::create(['prompt' => 'x', 'size' => '1024x1024', 'status' => ImageRelayRequest::RUNNING]);
        app(ImageRelay::class)->finish($row, 'PNGBYTES');
        $this->assertSame('PNGBYTES', Storage::disk('local')->get($row->fresh()->result_path));
    }

    public function test_only_the_mac_with_the_token_gets_in(): void
    {
        $this->postJson(route('api.image-relay.next'))->assertNotFound();
        $this->postJson(route('api.image-relay.next'), [], ['Authorization' => 'Bearer wrong'])->assertNotFound();

        config()->set('services.image_generation.relay_token', null);
        $this->postJson(route('api.image-relay.next'), [], ['Authorization' => 'Bearer '])->assertNotFound();
    }

    public function test_a_late_answer_after_the_job_gave_up_is_refused(): void
    {
        $row = ImageRelayRequest::create(['prompt' => 'x', 'size' => '1024x1024', 'status' => ImageRelayRequest::FAILED]);
        $this->post(route('api.image-relay.finish', $row), ['error' => 'too slow'], $this->mac())->assertStatus(409);
    }

    public function test_jobs_wait_long_enough_for_the_mac(): void
    {
        config()->set('services.image_generation.driver', ImageRoute::RELAY);
        config()->set('services.image_generation.relay_wait', 540);
        $this->assertSame(600, (new \App\Jobs\RestyleImage(1))->timeout);

        $this->assertSame(4 * 540 + 60, (new \App\Jobs\GenerateSkyboxCandidates(1))->timeout, 'four pictures in a row');

        config()->set('services.image_generation.driver', ImageRoute::LOCAL);
        $this->assertSame(660, (new \App\Jobs\RestyleImage(1))->timeout, 'ChatGPT on this Mac may take 600 s');

        config()->set('services.image_generation.driver', ImageRoute::OPENAI);
        $this->assertSame(240, (new \App\Jobs\RestyleImage(1))->timeout);
    }

    public function test_on_the_mac_an_edit_goes_to_chatgpt_with_its_reference_images_and_a_cutout_is_keyed_out_of_green(): void
    {
        config()->set('services.image_generation.driver', ImageRoute::LOCAL);
        config()->set(['services.chatgpt_local.enabled' => true, 'services.chatgpt_local.bin' => '/bin/echo']);
        Http::fake();
        $seen = [];
        Process::fake(function (PendingProcess $p) use (&$seen) {
            $seen = ['prompt' => $p->input, 'command' => $p->command];
            $dir = $p->command[array_search('-C', $p->command, true) + 1];
            $im = imagecreatetruecolor(4, 4);
            imagefill($im, 0, 0, imagecolorallocate($im, 0, 255, 0));
            imagesetpixel($im, 1, 1, imagecolorallocate($im, 120, 40, 30));
            imagepng($im, "{$dir}/result.png");

            return Process::result("codex\nDone.\ntokens used: 5");
        });

        $png = app(OpenAiImageService::class)->editImages(
            [['bytes' => 'SRC', 'name' => 'source.png'], ['bytes' => 'REF', 'name' => 'anchor.png']],
            'Redo it in ink', '1024x1024', true,
        );

        Http::assertNothingSent();
        $this->assertSame(2, count(array_keys($seen['command'], '-i', true)), 'the picture and its reference both go along');
        $this->assertStringContainsString('Redo it in ink', $seen['prompt']);
        $this->assertStringContainsString('#00FF00', $seen['prompt']);
        $im = imagecreatefromstring($png);
        $this->assertSame(127, (imagecolorat($im, 0, 0) >> 24) & 0x7F, 'the green is keyed out');
        $this->assertSame(0, (imagecolorat($im, 1, 1) >> 24) & 0x7F, 'the subject stays');
    }
}
