<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Symfony\Component\Process\Process;

/**
 * pg_dump the app database into storage/app/snapshots/ (infra audit 2026-10-17, opus.4: a deploy left
 * no rollback point). deploy-prod.sh takes one before every migration. The password goes to pg_dump
 * through its environment, never on a command line another account on the host could read.
 */
class DbSnapshot extends Command
{
    protected $signature = 'db:snapshot {label=manual : Becomes part of the file name}';

    protected $description = 'Dump the database (pg_dump custom format) into storage/app/snapshots';

    public function handle(): int
    {
        $connection = config('database.connections.'.config('database.default'));
        if (($connection['driver'] ?? null) !== 'pgsql') {
            $this->error('db:snapshot supports PostgreSQL only.');

            return self::FAILURE;
        }

        // DB_URL wins in Laravel when set, so read the parts from it the same way; the password still
        // travels in the environment only.
        if (! empty($connection['url'])) {
            $url = parse_url((string) $connection['url']);
            $connection = [
                'host' => $url['host'] ?? '127.0.0.1', 'port' => $url['port'] ?? 5432,
                'username' => urldecode($url['user'] ?? ''), 'password' => urldecode($url['pass'] ?? ''),
                'database' => ltrim($url['path'] ?? '', '/'),
            ];
        }

        $label = preg_replace('/[^A-Za-z0-9_-]+/', '-', (string) $this->argument('label'));
        $dir = storage_path('app/snapshots');
        if (! is_dir($dir) && ! mkdir($dir, 0700, true) && ! is_dir($dir)) {
            $this->error("Cannot create {$dir}.");

            return self::FAILURE;
        }
        $file = $dir.'/db-'.now()->format('Ymd-His').'-'.$label.'.dump';

        $process = new Process(
            ['pg_dump', '--format=custom', '--no-owner', '--file='.$file,
                '--host='.$connection['host'], '--port='.$connection['port'],
                '--username='.$connection['username'], $connection['database']],
            env: ['PGPASSWORD' => (string) $connection['password']],
            timeout: 600,
        );
        $process->run();

        if (! $process->isSuccessful() || ! is_file($file) || filesize($file) === 0) {
            $this->error('pg_dump failed: '.trim($process->getErrorOutput()));

            return self::FAILURE;
        }

        chmod($file, 0600);
        $this->info($file.' ('.round(filesize($file) / 1024).' KB)');

        return self::SUCCESS;
    }
}
