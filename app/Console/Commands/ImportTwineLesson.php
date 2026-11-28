<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Livewire\Teacher\LessonChat;
use App\Models\User;
use App\Services\Import\TwineImporter;
use App\Services\Stage25d\StageWorlds;
use Illuminate\Console\Command;
use InvalidArgumentException;

/**
 * "Import from Twine" from the command line, for a story in several languages: each file becomes a lesson of the
 * teacher's, and --group joins them in one translation group, so the player's language switch links them.
 */
class ImportTwineLesson extends Command
{
    protected $signature = 'lessons:import-twine {files* : Twine story .html files, one per language}
        {--teacher= : Teacher email}
        {--world= : World for the 3D scenes (a config/worlds key, or a teacher world key)}
        {--age= : Age of the class (one of the ages quick lesson creation offers); never assumed}
        {--group= : Translation group that joins the languages (e.g. dante-story)}';

    protected $description = 'Import Twine stories as lessons, one per language, joined in one translation group';

    public function handle(TwineImporter $importer): int
    {
        $teacher = User::where('email', (string) $this->option('teacher'))->first();
        $age = (int) $this->option('age');
        $world = (string) $this->option('world');
        if (! $teacher) {
            $this->error('Name the teacher with --teacher=<email>.');

            return self::FAILURE;
        }
        if (! in_array($age, LessonChat::GRADE_CHIP_AGES, true)) {
            $this->error('Give the age of the class with --age, one of: '.implode(', ', LessonChat::GRADE_CHIP_AGES).'.');

            return self::FAILURE;
        }
        if (StageWorlds::preset($world, $teacher->id) === null) {
            $this->error("No world called \"{$world}\".");

            return self::FAILURE;
        }

        $group = trim((string) $this->option('group')) ?: null;
        foreach ((array) $this->argument('files') as $file) {
            if (! is_file($file)) {
                $this->error("{$file} is not a file.");

                return self::FAILURE;
            }
            try {
                $lesson = $importer->import((string) file_get_contents($file), $teacher, $world, 'Age '.$age);
            } catch (InvalidArgumentException $e) {
                $this->error("{$file}: {$e->getMessage()}");

                return self::FAILURE;
            }
            if ($group !== null) {
                $lesson->update(['translation_group' => $group]);
            }
            $report = (array) $lesson->import_report;
            $this->info("{$file}: lesson {$lesson->id} \"{$lesson->title}\" ({$lesson->language}), {$report['scenes']} scenes, {$report['choices']} choices, ".count((array) $lesson->outline['cast']).' cast');
            foreach ((array) ($report['notes'] ?? []) as $note) {
                $this->warn("  {$note}");
            }
        }

        return self::SUCCESS;
    }
}
