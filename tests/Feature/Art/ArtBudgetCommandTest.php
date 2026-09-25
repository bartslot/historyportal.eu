<?php

declare(strict_types=1);

namespace Tests\Feature\Art;

use App\Models\FalLedgerEntry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ArtBudgetCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_reports_spend_against_the_budget_without_calling_fal(): void
    {
        Http::fake();
        config(['art.budget_usd' => 17.0]);
        FalLedgerEntry::create(['model' => 'm', 'purpose' => 'bakeoff', 'estimated_usd' => 0.08, 'status' => 'completed']);
        FalLedgerEntry::create(['model' => 'm', 'purpose' => 'bakeoff', 'estimated_usd' => 0.04, 'status' => 'failed']);

        $this->artisan('art:budget')
            ->expectsOutputToContain('Spent: $0.08   Remaining: $16.92')
            ->assertSuccessful();

        Http::assertNothingSent();
    }
}
