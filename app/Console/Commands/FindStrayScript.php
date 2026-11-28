<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\CaptionTranslation;
use App\Models\Scene;
use App\Support\StrayScript;
use Illuminate\Console\Command;

/**
 * Lists every narration line, balloon line and cached subtitle that has letters from a writing
 * system its language does not use ("Toen Marco终于 terugkeerde", lesson 129). Read-only unless
 * --fix, which deletes the machine subtitles among them (never a teacher's correction) so the
 * player translates those lines again, through the guard in LlmTextTranslator. A narration
 * script is only reported: it is the product, and a person rewrites it.
 */
class FindStrayScript extends Command
{
    protected $signature = 'lessons:stray-script
        {--lesson=* : Only these lesson ids}
        {--fix : Delete the stray machine subtitles so they are translated again}';

    protected $description = 'Find letters from another writing system in lesson scripts and subtitles';

    public function handle(): int
    {
        $ids = array_map('intval', (array) $this->option('lesson'));
        $rows = [];

        $scenes = Scene::query()->with('lesson:id,language')
            ->when($ids !== [], fn ($q) => $q->whereIn('lesson_id', $ids));
        foreach ($scenes->lazyById() as $scene) {
            $language = (string) ($scene->lesson?->language ?: 'en');
            $texts = ['script' => (string) $scene->script_segment];
            foreach ($scene->config['lines'] ?? [] as $i => $line) {
                $texts["line {$i}"] = (string) ($line['text'] ?? '');
            }
            foreach ($texts as $where => $text) {
                if ($runs = StrayScript::find($text, $language)) {
                    $rows[] = [$scene->lesson_id, "scene {$scene->id} {$where}", $language, implode(' ', $runs), $this->around($text, $runs[0])];
                }
            }
        }

        $fixable = [];
        $captions = CaptionTranslation::query()
            ->when($ids !== [], fn ($q) => $q->whereIn('lesson_id', $ids));
        foreach ($captions->lazyById() as $row) {
            foreach (['machine_text' => 'subtitle', 'teacher_text' => 'teacher subtitle'] as $column => $label) {
                $text = (string) $row->{$column};
                if ($text !== '' && ($runs = StrayScript::find($text, $row->language, (string) $row->source_text))) {
                    $rows[] = [$row->lesson_id, "{$label} #{$row->id}", $row->language, implode(' ', $runs), $this->around($text, $runs[0])];
                    if ($column === 'machine_text' && $row->teacher_text === null) {
                        $fixable[] = $row->id;
                    }
                }
            }
        }

        if ($rows === []) {
            $this->info('No stray writing systems found.');

            return self::SUCCESS;
        }

        $this->table(['lesson', 'where', 'lang', 'stray', 'context'], $rows);

        if ($fixable === []) {
            return self::SUCCESS;
        }
        if (! $this->option('fix')) {
            $this->line(count($fixable).' machine subtitle(s) can be translated again: run with --fix.');

            return self::SUCCESS;
        }

        $deleted = CaptionTranslation::query()->whereIn('id', $fixable)->delete();
        $this->info("Deleted {$deleted} machine subtitle(s); the player translates them again on the next play.");

        return self::SUCCESS;
    }

    private function around(string $text, string $run): string
    {
        $at = mb_strpos($text, $run) ?: 0;

        return '…'.mb_substr($text, max(0, $at - 30), 30 + mb_strlen($run) + 30).'…';
    }
}
