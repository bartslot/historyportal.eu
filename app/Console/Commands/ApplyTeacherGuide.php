<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Lesson;
use Illuminate\Console\Command;

/**
 * Write a teacher guide from resources/lessons/guides/{CODE}.php onto that lesson. For lessons
 * built in the editor; a composed lesson carries its guide in its spec instead.
 */
class ApplyTeacherGuide extends Command
{
    protected $signature = 'lessons:guide {code : The lesson code, e.g. W24VRI}';

    protected $description = 'Write a lesson\'s teacher guide from resources/lessons/guides';

    public function handle(): int
    {
        $code = strtoupper((string) $this->argument('code'));
        $path = resource_path("lessons/guides/{$code}.php");

        if (! preg_match('/^[A-Z0-9]{6}$/', $code) || ! is_file($path)) {
            $this->error("No guide at resources/lessons/guides/{$code}.php");

            return self::FAILURE;
        }

        $guide = require $path;
        if (! is_array($guide) || trim((string) ($guide['goal'] ?? '')) === '') {
            $this->error('A guide needs at least a goal.');

            return self::FAILURE;
        }

        $lesson = Lesson::query()->where('lesson_code', $code)->first();
        if ($lesson === null) {
            $this->error("No lesson with code {$code}.");

            return self::FAILURE;
        }

        $lesson->update(['teacher_guide' => $guide]);
        $this->info("Guide written to lesson {$lesson->id} ({$lesson->title}).");

        return self::SUCCESS;
    }
}
