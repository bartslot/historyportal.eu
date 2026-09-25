<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\FalLedgerEntry;
use App\Services\Art\FalLedger;
use Illuminate\Console\Command;

/** Where the fal art budget stands. Reads the ledger only; never calls fal. */
class ArtBudget extends Command
{
    protected $signature = 'art:budget';

    protected $description = 'Show the fal art budget, spend so far and the last 20 ledger rows';

    public function handle(FalLedger $ledger): int
    {
        $this->line(sprintf('Budget: $%.2f   Spent: $%.2f   Remaining: $%.2f',
            (float) config('art.budget_usd'), $ledger->spentUsd(), $ledger->remainingUsd()));

        $rows = FalLedgerEntry::query()->latest('id')->limit(20)->get()
            ->map(fn (FalLedgerEntry $e) => [
                $e->model, $e->purpose, sprintf('$%.3f', $e->estimated_usd), $e->status, (string) $e->created_at,
            ]);

        $this->table(['model', 'purpose', 'usd', 'status', 'created_at'], $rows->all());

        return self::SUCCESS;
    }
}
