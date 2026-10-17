<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\CurriculumGoal;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Seed curriculum_goals from resources/curriculum/nl-vo.php. Safe to run again: goals are matched on
 * (type, code) and existing rows keep their text, because curriculum:sync may have updated it from
 * the official source since. --force rewrites the text from the file (lesson links survive either way).
 */
class ImportCurriculum extends Command
{
    protected $signature = 'curriculum:import {--force : Overwrite existing texts with the file}';

    protected $description = 'Import the Dutch curriculum (kerndoelen, tijdvakken, kenmerkende aspecten, Canon)';

    public function handle(): int
    {
        $goals = require resource_path('curriculum/nl-vo.php');

        DB::transaction(function () use ($goals): void {
            $ids = [];

            foreach ($goals as $sort => $goal) {
                $key = $goal['type'].':'.$goal['code'];
                $parentId = $goal['parent'] !== null ? ($ids[$goal['parent']] ?? null) : null;

                $text = [
                    'title' => $goal['title'],
                    'body' => $goal['body'],
                    'period' => $goal['period'],
                    'source_url' => $goal['source_url'],
                ];
                $model = CurriculumGoal::query()->firstOrNew(['type' => $goal['type'], 'code' => $goal['code']]);
                $model->fill([
                    'slug' => CurriculumGoal::slugFor($goal['type'], $goal['code']),
                    'parent_id' => $parentId,
                    'sort' => $sort,
                ] + ($model->exists && ! $this->option('force') ? [] : $text))->save();

                $ids[$key] = $model->id;
            }
        });

        $this->info(count($goals).' curriculum goals imported.');

        return self::SUCCESS;
    }
}
