<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\OfflineSync\RemoteSite;
use Illuminate\Console\Command;
use RuntimeException;

/** On the laptop: sign in to the live site once, so lessons can be taken offline (App\Services\OfflineSync). */
class OfflineLogin extends Command
{
    protected $signature = 'lessons:offline-login {email? : Your account on the live site} {--logout : Forget the sign-in}';

    protected $description = 'Sign this laptop in to the live site for offline editing';

    public function handle(RemoteSite $remote): int
    {
        if ($this->option('logout')) {
            $remote->logout();
            $this->info('Signed out.');

            return self::SUCCESS;
        }
        try {
            $email = (string) ($this->argument('email') ?: $this->ask('Email on '.$remote->host()));
            $name = $remote->login($email, (string) $this->secret('Password'));
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }
        $this->info("Signed in to {$remote->host()} as {$name}.");

        return self::SUCCESS;
    }
}
