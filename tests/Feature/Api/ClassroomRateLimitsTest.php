<?php

declare(strict_types=1);

namespace Tests\Feature\Api;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A whole class shares one school IP. Infra audit 2026-10-17: the Flutter catalogue sat on the
 * login limiter (5/min per IP), so the sixth tablet in a classroom got a 429.
 */
class ClassroomRateLimitsTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_class_of_tablets_can_all_sync_the_catalogue(): void
    {
        for ($tablet = 1; $tablet <= 30; $tablet++) {
            $this->getJson(route('api.v1.catalog.manifest'))->assertOk();
        }
    }

    public function test_the_catalogue_is_still_throttled_against_a_scraper(): void
    {
        for ($i = 1; $i <= 120; $i++) {
            $this->getJson(route('api.v1.catalog.manifest'));
        }

        $this->getJson(route('api.v1.catalog.manifest'))->assertStatus(429);
    }
}
