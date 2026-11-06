<?php

declare(strict_types=1);

namespace Tests\Feature\Public;

use App\Models\CurriculumGoal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The page on the move from ten to six tijdvakken in primary school. It is what teachers will link
 * to, so the claim it must never overstate is the status: on 2026-11-04 the six are a draft decree
 * with a target date, not law.
 */
class NewTijdvakkenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        $this->artisan('curriculum:import')->assertSuccessful();
    }

    public function test_the_page_names_the_six_tijdvakken_and_their_sixteen_developments(): void
    {
        $response = $this->get(route('public.new-tijdvakken'))->assertOk();

        $response->assertSee('<html lang="nl', false)
            ->assertSee('<link rel="canonical" href="'.route('public.new-tijdvakken').'"', false);

        foreach ([
            'Tijd van jagers en boeren',
            'Tijd van oude rijken',
            'Tijd van standen en steden',
            'Tijd van pakhuizen en plantages',
            'Tijd van burgers en stoommachines',
            'Tijd van wereldoorlogen en mensenrechten',
        ] as $name) {
            $response->assertSee($name);
        }

        $this->assertSame(16, substr_count($response->getContent(), 'data-development'));
        $response->assertSee('Ontstaan van landbouw en landbouwsamenlevingen')
            ->assertSee('Ontstaan van een informatiesamenleving');
    }

    public function test_every_old_tijdvak_links_to_its_page_from_exactly_one_new_tijdvak(): void
    {
        $html = $this->get(route('public.new-tijdvakken'))->assertOk()->getContent();

        foreach (CurriculumGoal::where('type', 'tijdvak')->get() as $goal) {
            $this->assertSame(
                1,
                substr_count($html, 'data-old-tijdvak href="'.route('public.curriculum.goal', $goal->slug).'"'),
                "Tijdvak {$goal->code} must sit under one new tijdvak",
            );
        }
    }

    public function test_the_page_says_the_six_are_not_yet_law_and_cites_its_sources(): void
    {
        $this->get(route('public.new-tijdvakken'))
            ->assertOk()
            ->assertSee('nog niet in de wet')
            ->assertSee('streefdatum')
            ->assertSee('https://zoek.officielebekendmakingen.nl/kst-1273745', false)
            ->assertSee('https://www.slo.nl/publish/pages/18734/ontwikkelingen-in-de-tijd.pdf', false);
    }

    public function test_the_sitemap_and_the_curriculum_overview_lead_to_the_page(): void
    {
        $url = route('public.new-tijdvakken');

        $this->assertStringContainsString("<loc>{$url}</loc>", $this->get(route('sitemap'))->getContent());
        $this->get(route('public.curriculum'))->assertSee('href="'.$url.'"', false);
    }
}
