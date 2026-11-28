<?php

declare(strict_types=1);

namespace App\Services\OfflineSync;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * The live site, as the laptop's History Portal talks to it: the teacher's API token (the same login the
 * Flutter app uses) and the /api/v1/offline routes. The token sits on the private disk, never in git.
 */
final class RemoteSite
{
    public function url(): string
    {
        $url = (string) config('offline_sync.remote');
        if ($url === '') {
            throw new RuntimeException('OFFLINE_SYNC_REMOTE is not set: name the live site in .env first.');
        }

        return $url;
    }

    public function enabled(): bool
    {
        return (string) config('offline_sync.remote') !== '';
    }

    public function host(): string
    {
        return (string) parse_url($this->url(), PHP_URL_HOST);
    }

    /** @return array{token: string, email: string, name: string}|null */
    public function account(): ?array
    {
        $disk = Storage::disk('local');
        $file = (string) config('offline_sync.token_file');
        if (! $disk->exists($file)) {
            return null;
        }
        $data = json_decode((string) $disk->get($file), true);

        return is_array($data) && ($data['remote'] ?? null) === $this->url() && filled($data['token'] ?? null) ? $data : null;
    }

    /** Sign in on the live site and keep the token. Returns the account's name. */
    public function login(string $email, string $password): string
    {
        $response = Http::acceptJson()->timeout(30)->post($this->url().'/api/v1/auth/login', [
            'email' => $email,
            'password' => $password,
            'device_name' => 'Offline copy on '.(gethostname() ?: 'a laptop'),
        ]);
        if ($response->status() === 422) {
            throw new RuntimeException(__('That email and password did not work on :site.', ['site' => $this->host()]));
        }
        $response->throw();
        $name = (string) $response->json('user.name');
        Storage::disk('local')->put((string) config('offline_sync.token_file'), (string) json_encode([
            'remote' => $this->url(),
            'token' => (string) $response->json('token'),
            'email' => $email,
            'name' => $name,
        ]));

        return $name;
    }

    public function logout(): void
    {
        Storage::disk('local')->delete((string) config('offline_sync.token_file'));
    }

    /** @return array<string, mixed> */
    public function get(string $path, array $query = []): array
    {
        return $this->send(fn (PendingRequest $r) => $r->get($path, $query))->json();
    }

    /** @return array{status: int, body: array<string, mixed>} */
    public function post(string $path, array $body): array
    {
        $response = $this->send(fn (PendingRequest $r) => $r->post($path, $body), allow: [409]);

        return ['status' => $response->status(), 'body' => (array) $response->json()];
    }

    /** Upload one file; returns the path the live site stored it at. */
    public function upload(string $path, string $absolute, string $name): string
    {
        $handle = fopen($absolute, 'r');
        try {
            return (string) $this->send(fn (PendingRequest $r) => $r->timeout(600)->attach('file', $handle, $name)->post($path))->json('path');
        } finally {
            if (is_resource($handle)) {
                fclose($handle);
            }
        }
    }

    /** Save a file of the live site's public disk to $absolute. Public files need no token. */
    public function download(string $diskPath, string $absolute): bool
    {
        @mkdir(dirname($absolute), 0775, true);
        $part = $absolute.'.part';
        $url = $this->url().'/storage/'.implode('/', array_map('rawurlencode', explode('/', $diskPath)));
        try {
            // Streamed to disk in pieces: a lesson's clips can be hundreds of MB.
            $response = Http::timeout(600)->withOptions(['stream' => true])->get($url);
            if (! $response->successful()) {
                return false;
            }
            $body = $response->toPsrResponse()->getBody();
            $out = fopen($part, 'w');
            while (! $body->eof()) {
                fwrite($out, $body->read(1 << 20));
            }
            fclose($out);
        } catch (ConnectionException) {
            @unlink($part);

            return false;
        }

        return rename($part, $absolute);
    }

    /** @param callable(PendingRequest): Response $call @param list<int> $allow */
    private function send(callable $call, array $allow = []): Response
    {
        $account = $this->account() ?? throw new RuntimeException(__('Sign in to :site first.', ['site' => $this->host()]));
        try {
            $response = $call(Http::baseUrl($this->url())->withToken($account['token'])->acceptJson()->timeout(180));
        } catch (ConnectionException) {
            throw new RuntimeException(__('Could not reach :site. Are you online?', ['site' => $this->host()]));
        }
        if ($response->status() === 401) {
            throw new RuntimeException(__('The sign-in to :site ran out. Sign in again.', ['site' => $this->host()]));
        }
        if (! in_array($response->status(), $allow, true)) {
            $response->throw();
        }

        return $response;
    }
}
