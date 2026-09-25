<?php

declare(strict_types=1);

namespace App\Services\Art;

use App\Models\FalLedgerEntry;

/** The single budget for every fal art call: ceiling (config art.budget_usd) minus recorded spend. */
final class FalLedger
{
    /** Spend that counts against the budget: completed, pending, and failed after fal accepted it. */
    public function spentUsd(): float
    {
        return (float) FalLedgerEntry::query()
            ->where(fn ($q) => $q->whereIn('status', ['completed', 'pending'])
                ->orWhere(fn ($q) => $q->where('status', 'failed')->whereNotNull('request_id')))
            ->sum('estimated_usd');
    }

    public function remainingUsd(): float
    {
        return round((float) config('art.budget_usd') - $this->spentUsd(), 4);
    }

    public function priceFor(string $model): float
    {
        // Never config("art.prices.$model"): model ids contain dots.
        $price = (config('art.prices') ?? [])[$model] ?? null;
        if ($price === null) {
            throw new FalBudgetExceeded("No price configured for {$model} in config/art.php 'prices'. Refusing to call it.");
        }

        return (float) $price;
    }

    /** @param  float|null  $runCap  --max-usd for the current command, if any */
    public function assertAffordable(float $usd, ?float $runCap = null, float $runSpent = 0.0): void
    {
        if ($usd > $this->remainingUsd()) {
            throw new FalBudgetExceeded(sprintf('fal budget: need $%.2f, $%.2f left of $%.2f.',
                $usd, $this->remainingUsd(), (float) config('art.budget_usd')));
        }
        if ($runCap !== null && $runSpent + $usd > $runCap) {
            throw new FalBudgetExceeded(sprintf('Run cap $%.2f would be exceeded ($%.2f spent + $%.2f).', $runCap, $runSpent, $usd));
        }
    }

    public function open(string $model, string $purpose, float $usd, array $meta = []): FalLedgerEntry
    {
        return FalLedgerEntry::create([
            'model' => $model,
            'purpose' => $purpose,
            'estimated_usd' => $usd,
            'status' => 'pending',
            'command' => $meta['command'] ?? null,
            'lesson_id' => $meta['lesson_id'] ?? null,
            'meta' => array_diff_key($meta, array_flip(['command', 'lesson_id'])),
        ]);
    }

    public function complete(FalLedgerEntry $entry, array $meta = []): void
    {
        $entry->update(['status' => 'completed', 'meta' => array_merge($entry->meta ?? [], $meta)]);
    }

    public function fail(FalLedgerEntry $entry, string $error): void
    {
        $entry->update(['status' => 'failed', 'error' => mb_substr($error, 0, 2000)]);
    }
}
