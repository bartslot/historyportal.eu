<?php

declare(strict_types=1);

namespace Tests\Feature\Curriculum;

use App\Models\CurriculumGoal;
use App\Models\Lesson;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * curriculum:sync pulls kerndoelen and the Canon from the official sources (Bart, 2026-10-17). The
 * fixtures are the real documents: the law XML's Onderdeel E and the canonvannederland.nl page.
 */
class SyncCurriculumTest extends TestCase
{
    use RefreshDatabase;

    private const LAW_XML_URL = 'https://repository.officiele-overheidspublicaties.nl/bwb/BWBR0045787/2026-08-01_0/xml/BWBR0045787_2026-08-01_0.xml';

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Mail::fake();
        config(['services.alerts.email' => 'alerts@example.test']);
        $this->artisan('curriculum:import')->assertSuccessful();
    }

    private function sru(): string
    {
        return '<searchRetrieveResponse><record>'
            .'<overheidbwb:geldigheidsperiode_startdatum>2025-10-01</overheidbwb:geldigheidsperiode_startdatum>'
            .'<overheidbwb:geldigheidsperiode_einddatum>2026-07-31</overheidbwb:geldigheidsperiode_einddatum>'
            .'<overheidbwb:locatie_toestand>https://example.test/old.xml</overheidbwb:locatie_toestand>'
            .'</record><record>'
            .'<overheidbwb:geldigheidsperiode_startdatum>2026-08-01</overheidbwb:geldigheidsperiode_startdatum>'
            .'<overheidbwb:geldigheidsperiode_einddatum>9999-12-31</overheidbwb:geldigheidsperiode_einddatum>'
            .'<overheidbwb:locatie_toestand>'.self::LAW_XML_URL.'</overheidbwb:locatie_toestand>'
            .'</record></searchRetrieveResponse>';
    }

    private function fakeSources(?string $lawXml = null, ?string $canonHtml = null, string|int $syllabus = 404): void
    {
        $this->travelTo('2026-10-17');

        Http::fake([
            'zoekservice.overheid.nl/*' => Http::response($this->sru()),
            self::LAW_XML_URL => Http::response($lawXml ?? file_get_contents(base_path('tests/Fixtures/curriculum/bwb-onderdeel-e.xml'))),
            'www.canonvannederland.nl/*' => Http::response($canonHtml ?? file_get_contents(base_path('tests/Fixtures/curriculum/canon.html'))),
            'examenblad.nl/*/vwo/vakken/*' => is_int($syllabus)
                ? Http::response('', $syllabus)
                : Http::response('<a href="/2027/vwo/documenten/syllabus-geschiedenis-vwo-2027">Syllabus</a>'),
            'examenblad.nl/*/vwo/documenten/*' => is_int($syllabus) ? Http::response('', $syllabus) : Http::response($syllabus),
        ]);
    }

    public function test_it_pulls_the_law_text_into_the_kerndoelen(): void
    {
        $this->fakeSources();

        $this->artisan('curriculum:sync')->assertSuccessful();

        $kerndoel = CurriculumGoal::findByKey('kerndoel:37');
        $this->assertStringStartsWith('De leerling in het Europese deel van Nederland leert een kader van tien tijdvakken', $kerndoel->body);
        $this->assertStringContainsString("– tijd van regenten en vorsten (1600–1700);", $kerndoel->body);
        $this->assertStringContainsString('ter illustratie van de tijdvakken.', $kerndoel->body);
        $this->assertStringNotContainsString('Bonaire', CurriculumGoal::findByKey('kerndoel:45')->body);
        $this->assertSame('Gebeurtenissen en personen in hun historische tijd plaatsen', $kerndoel->title, 'our short label stays');
        Mail::assertSentCount(1);
    }

    public function test_a_second_run_with_nothing_new_is_silent(): void
    {
        $this->fakeSources();
        $this->artisan('curriculum:sync')->assertSuccessful();
        Mail::fake();

        $this->artisan('curriculum:sync')->assertSuccessful()->expectsOutput('Curriculum is up to date with the official sources.');

        Mail::assertNothingSent();
    }

    public function test_a_renumbered_set_of_kerndoelen_is_not_applied(): void
    {
        $xml = file_get_contents(base_path('tests/Fixtures/curriculum/bwb-onderdeel-e.xml'));
        $this->fakeSources(lawXml: str_replace('<li.nr>47.</li.nr>', '<li.nr>48.</li.nr>', $xml));
        $before = CurriculumGoal::findByKey('kerndoel:36')->body;

        $this->artisan('curriculum:sync')->assertFailed();

        $this->assertSame($before, CurriculumGoal::findByKey('kerndoel:36')->body);
        $this->assertNull(CurriculumGoal::findByKey('kerndoel:48'));
    }

    public function test_dry_run_writes_nothing(): void
    {
        $this->fakeSources();
        $before = CurriculumGoal::findByKey('kerndoel:37')->body;

        $this->artisan('curriculum:sync', ['--dry-run' => true])->assertSuccessful();

        $this->assertSame($before, CurriculumGoal::findByKey('kerndoel:37')->body);
        Mail::assertNothingSent();
    }

    public function test_a_renamed_canon_window_with_lessons_waits_for_a_person(): void
    {
        $lesson = Lesson::factory()->for(User::factory()->teacher(), 'teacher')->create();
        CurriculumGoal::findByKey('canon:14')->lessons()->attach($lesson, ['fit' => 'direct']);
        $html = str_replace('</span>VOC en WIC</h3>', '</span>De VOC</h3>', file_get_contents(base_path('tests/Fixtures/curriculum/canon.html')));
        $this->fakeSources(canonHtml: $html);

        $this->artisan('curriculum:sync')->assertFailed();

        $this->assertSame('VOC en WIC', CurriculumGoal::findByKey('canon:14')->title);
    }

    public function test_a_new_syllabus_raises_an_alert_once(): void
    {
        $this->fakeSources(syllabus: '%PDF-1.7 syllabus 2027');

        $this->artisan('curriculum:sync')->assertFailed();
        Mail::assertSentCount(1);

        Mail::fake();
        $this->artisan('curriculum:sync')->assertSuccessful();
        Mail::assertNothingSent();
    }

    public function test_an_unreachable_source_changes_nothing_and_says_so(): void
    {
        $this->travelTo('2026-10-17');
        Http::fake(['*' => Http::response('', 503)]);
        $before = CurriculumGoal::query()->pluck('body', 'id');

        $this->artisan('curriculum:sync')->assertFailed();

        $this->assertEquals($before, CurriculumGoal::query()->pluck('body', 'id'));
        Mail::assertSentCount(1);
    }

    public function test_reimporting_the_file_keeps_the_synced_text(): void
    {
        $this->fakeSources();
        $this->artisan('curriculum:sync')->assertSuccessful();
        $synced = CurriculumGoal::findByKey('kerndoel:37')->body;

        $this->artisan('curriculum:import')->assertSuccessful();

        $this->assertSame($synced, CurriculumGoal::findByKey('kerndoel:37')->body);
    }
}
