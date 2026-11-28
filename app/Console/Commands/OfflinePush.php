<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\OfflineCopy;
use App\Services\OfflineSync\LocalCopy;
use App\Services\OfflineSync\RemoteSite;
use Illuminate\Console\Command;
use RuntimeException;

/**
 * On the laptop: bring a lesson edited offline back to the live site, scene by scene, and free its scenes.
 * When a scene changed on both sides, nothing is written and the scenes are listed: answer per scene.
 *
 *   php artisan lessons:push 7KQ2ZD
 *   php artisan lessons:push 7KQ2ZD --mine=412 --theirs=418 --both=420   # laptop scene ids
 *   php artisan lessons:push 7KQ2ZD --mine=lesson                         # the lesson's own settings and order
 */
class OfflinePush extends Command
{
    protected $signature = 'lessons:push {lesson : The lesson code on the live site, or the local lesson id}
        {--mine=* : Scenes (laptop ids) where this laptop\'s version wins}
        {--theirs=* : Scenes where the live version wins}
        {--both=* : Scenes kept both ways: this laptop\'s version is added right after the live one}
        {--keep : Keep holding the scenes on the live site}
        {--user= : Local account (default: the same email as the live sign-in)}';

    protected $description = 'Send a lesson edited offline back to the live site';

    public function handle(LocalCopy $copies, RemoteSite $remote): int
    {
        $key = (string) $this->argument('lesson');
        $copy = OfflineCopy::query()->where(ctype_digit($key) ? 'lesson_id' : 'remote_code', ctype_digit($key) ? (int) $key : strtoupper($key))->first();
        if ($copy === null) {
            $this->error("No offline copy matches {$key}.");

            return self::FAILURE;
        }
        $answers = [];
        foreach (['mine', 'theirs', 'both'] as $answer) {
            foreach ((array) $this->option($answer) as $id) {
                $answers[$id] = $answer;
            }
        }

        try {
            $result = $copies->reporting(fn (string $line) => $this->line($line))
                ->push($copy, OfflinePull::owner($remote, $this->option('user')), $answers, (bool) $this->option('keep'));
        } catch (RuntimeException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        if (isset($result['conflicts'])) {
            $this->warn('Nothing was sent: these changed on the live site too. Answer each with --mine, --theirs or --both.');
            $this->table(['Laptop id', 'What happened', 'Scene'], array_map(fn (array $c) => [
                $c['key'], match ($c['reason']) {
                    'changed' => 'edited on the live site too',
                    'changed-deleted' => 'deleted here, edited on the live site',
                    'gone' => 'deleted on the live site',
                    'busy' => ($c['holder'] ?? 'Someone').' is editing it now',
                    default => $c['reason'],
                }, $c['title'] ?? ($c['key'] === 'lesson' ? 'lesson settings and scene order' : ''),
            ], $result['conflicts']));

            return self::FAILURE;
        }
        $this->info($result['pushed'] === 0 ? 'Nothing had changed here.' : "{$result['pushed']} changes are on the live site.");

        return self::SUCCESS;
    }
}
