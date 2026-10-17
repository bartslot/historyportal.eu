<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\CurriculumGoal;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Write resources/curriculum/nl-vo.php into curriculum_goals. Safe to run again: goals are matched
 * on (type, code) and updated in place, so lesson links survive a corrected text.
 */
class ImportCurriculum extends Command
{
    protected $signature = 'curriculum:import';

    protected $description = 'Import the Dutch curriculum (kerndoelen, tijdvakken, kenmerkende aspecten, Canon)';

    public function handle(): int
    {
        $goals = require resource_path('curriculum/nl-vo.php');

        DB::transaction(function () use ($goals): void {
            $ids = [];

            foreach ($goals as $sort => $goal) {
                $key = $goal['type'].':'.$goal['code'];
                $parentId = $goal['parent'] !== null ? ($ids[$goal['parent']] ?? null) : null;

                $model = CurriculumGoal::query()->updateOrCreate(
                    ['type' => $goal['type'], 'code' => $goal['code']],
                    [
                        'slug' => CurriculumGoal::slugFor($goal['type'], $goal['code']),
                        'title' => $goal['title'],
                        'body' => $goal['body'],
                        'period' => $goal['period'],
                        'parent_id' => $parentId,
                        'source_url' => $goal['source_url'],
                        'sort' => $sort,
                    ],
                );

                $ids[$key] = $model->id;
            }
        });

        $this->info(count($goals).' curriculum goals imported.');

        return self::SUCCESS;
    }
}
