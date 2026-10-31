<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Stage25d\LessonImporter;
use Illuminate\Console\Command;
use InvalidArgumentException;

class ImportStage25dLesson extends Command
{
    protected $signature = 'lessons:import-25d {file : Directed lesson json (engine-mvp/tools/direct-export.mjs output)}
        {--audio= : Narration root; each scene\'s "audio" (hunebedden/sc01.mp3) is read from here}
        {--teacher= : Teacher email (default: the wizard teacher, id 2, else the first teacher)}
        {--force : Rebuild a lesson that was imported before (discards teacher edits)}
        {--dry-run : Report what would be created, write nothing}';

    protected $description = 'Import an autonomous (2.5D stage) lesson as a Lesson with stage25d scenes, narration, balloons and quizzes';

    public function handle(LessonImporter $importer): int
    {
        $file = (string) $this->argument('file');
        $lesson = is_file($file) ? json_decode((string) file_get_contents($file), true) : null;
        if (! is_array($lesson)) {
            $this->error("{$file} is not a readable lesson json.");

            return self::FAILURE;
        }
        $teacher = $this->option('teacher')
            ? User::where('email', $this->option('teacher'))->first()
            : (User::find(2) ?? User::where('role', 'teacher')->orderBy('id')->first());
        if (! $teacher) {
            $this->error('No teacher account found.');

            return self::FAILURE;
        }
        try {
            $r = $importer->import($lesson, $teacher, $this->option('audio') ?: null, (bool) $this->option('force'), (bool) $this->option('dry-run'));
        } catch (InvalidArgumentException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }
        $this->info(($this->option('dry-run') ? '[dry run] ' : '')."{$r['topic']}: lesson ".($r['lesson_id'] ?? '-').", {$r['scenes']} scenes, {$r['audio']} recordings, {$r['balloons']} balloons, {$r['quizzes']} quizzes");
        foreach ($r['skipped'] as $line) {
            $this->warn("  skipped {$line}");
        }
        foreach ($r['warnings'] as $line) {
            $this->warn("  {$line}");
        }

        return self::SUCCESS;
    }
}
