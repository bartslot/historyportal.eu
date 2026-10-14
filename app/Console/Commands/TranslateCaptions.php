<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Lesson;
use App\Services\Captions\CaptionTranslator;
use App\Services\Captions\FakeTextTranslator;
use Illuminate\Console\Command;

/**
 * Pre-generate a lesson's subtitles in other languages, the same as the editor's button does.
 *
 *     php artisan captions:translate E3R2OK es ar zh --dry-run
 *     php artisan captions:translate 42 --all --fake
 */
class TranslateCaptions extends Command
{
    protected $signature = 'captions:translate
        {lesson : lesson id or lesson code}
        {languages?* : target languages (nl en de fr it es ar zh ja)}
        {--all : every subtitle language}
        {--fake : use the offline fake translator (no API call)}
        {--dry-run : only count the lines and characters that would be sent}';

    protected $description = 'Translate a lesson\'s subtitle lines into other languages and cache them';

    public function handle(): int
    {
        $key = (string) $this->argument('lesson');
        $lesson = Lesson::where('lesson_code', strtoupper($key))->first() ?? (ctype_digit($key) ? Lesson::find((int) $key) : null);
        if (! $lesson) {
            $this->error("No lesson {$key}.");

            return self::FAILURE;
        }

        $languages = $this->option('all') ? array_keys(CaptionTranslator::LANGUAGES) : (array) $this->argument('languages');
        $unknown = array_diff($languages, array_keys(CaptionTranslator::LANGUAGES));
        if ($languages === [] || $unknown !== []) {
            $this->error('Name languages from: '.implode(' ', array_keys(CaptionTranslator::LANGUAGES)));

            return self::FAILURE;
        }

        $captions = $this->option('fake') ? new CaptionTranslator(new FakeTextTranslator) : app(CaptionTranslator::class);
        $sources = $captions->sources($lesson);
        $chars = array_sum(array_map('mb_strlen', $sources));
        $this->line(sprintf('%s: %d lines, %d characters per language.', $lesson->title, count($sources), $chars));

        foreach ($languages as $language) {
            if ($this->option('dry-run')) {
                $this->line(sprintf('  %s: %d lines missing', $language, $captions->cached($lesson, $language)['missing']));

                continue;
            }
            $made = $captions->translateMissing($lesson, $language);
            $left = $captions->cached($lesson, $language)['missing'];
            $this->line(sprintf('  %s: %d translated, %d still missing', $language, $made, $left));
        }

        return self::SUCCESS;
    }
}
