<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Imaging\ImageRoute;
use App\Services\Local\LocalChatGpt;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;
use Throwable;

/**
 * Bart's Mac serves the AI pictures the server asks for (App\Services\Imaging\ImageRelay): claim a request, make it
 * with ChatGPT on this Mac (the logged-in subscription, no API credits), post it back. Leave it running in a terminal;
 * while it is not running, the editor's Generate and Restyle say the Mac is off.
 */
class ChatGptRelay extends Command
{
    protected $signature = 'chatgpt:relay
        {--url= : The server to serve (IMAGE_RELAY_URL, default https://historyportal.eu)}
        {--once : Serve at most one request and stop}';

    protected $description = 'Make the AI pictures the server asks for with ChatGPT on this Mac';

    private const IDLE_SECONDS = 3;

    public function handle(LocalChatGpt $chatgpt): int
    {
        $url = rtrim((string) ($this->option('url') ?: config('services.image_generation.relay_url')), '/');
        $token = (string) config('services.image_generation.relay_token');
        if ($token === '') {
            $this->error('Set IMAGE_RELAY_TOKEN in .env, the same value as on the server.');

            return self::FAILURE;
        }
        if (! LocalChatGpt::available()) {
            $this->error('ChatGPT is not available here (APP_ENV=local and the ChatGPT app with its Codex CLI are needed).');

            return self::FAILURE;
        }
        $api = fn () => Http::withToken($token)->acceptJson()->timeout(60);
        $this->info("Serving AI pictures for {$url}. Ctrl-C stops.");

        while (true) {
            try {
                $request = $api()->post("{$url}/api/image-relay/next")->throw()->json('request');
            } catch (Throwable $e) {
                $this->warn('Server not reachable: '.$e->getMessage());
                $request = null;
            }
            if ($request === null) {
                if ($this->option('once')) {
                    return self::SUCCESS;
                }
                Sleep::for(self::IDLE_SECONDS)->seconds();

                continue;
            }

            $id = (int) $request['id'];
            $this->line("#{$id} ".mb_substr((string) $request['prompt'], 0, 80).'…');
            $finish = "{$url}/api/image-relay/{$id}/finish";
            try {
                $images = [];
                foreach ($request['inputs'] as $i => $input) {
                    $images[] = ['bytes' => $api()->get($input)->throw()->body(), 'name' => (string) ($request['names'][$i] ?? "in-{$i}.png")];
                }
                // The same local route the editor uses on this Mac, whatever the driver says here.
                config()->set('services.image_generation.driver', ImageRoute::LOCAL);
                $png = app(ImageRoute::class)->make((string) $request['prompt'], (string) $request['size'], (bool) $request['transparent'], $images);
                $api()->attach('picture', $png, 'result.png', ['Content-Type' => 'image/png'])->post($finish)->throw();
                $this->info("#{$id} sent.");
            } catch (Throwable $e) {
                report($e);
                $this->error("#{$id} failed: ".$e->getMessage());
                rescue(fn () => $api()->post($finish, ['error' => mb_substr($e->getMessage(), 0, 2000)]), report: false);
            }
            if ($this->option('once')) {
                return self::SUCCESS;
            }
        }
    }
}
