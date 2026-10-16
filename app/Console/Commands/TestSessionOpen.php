<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\TestSession;
use Illuminate\Console\Command;

/**
 * Opens a test session and prints the link to send the tester. The account menu's "Start test
 * session" does the same from the browser.
 *
 *   php artisan test:open --label="Leonie, Tasman"
 *   php artisan test:open DEMO1 --path=/lesson/E3R2OK
 */
class TestSessionOpen extends Command
{
    protected $signature = 'test:open
        {code? : A code of your own (letters and digits); default a random one}
        {--label= : Who or what is tested}
        {--path=/teacher : The page the tester starts on}';

    protected $description = 'Open a live test session and print the link for the tester';

    public function handle(): int
    {
        $code = strtoupper((string) ($this->argument('code') ?: TestSession::newCode()));

        if (! preg_match('/^[A-Z0-9]{3,32}$/', $code)) {
            $this->error('A code is 3 to 32 letters and digits.');

            return self::FAILURE;
        }

        if (TestSession::where('code', $code)->exists()) {
            $this->error("Test session {$code} already exists.");

            return self::FAILURE;
        }

        TestSession::create(['code' => $code, 'label' => $this->option('label')]);

        $path = '/'.ltrim((string) $this->option('path'), '/');
        $this->line(rtrim((string) config('app.url'), '/').$path.(str_contains($path, '?') ? '&' : '?').'test='.$code);

        return self::SUCCESS;
    }
}
