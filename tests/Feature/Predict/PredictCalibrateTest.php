<?php

declare(strict_types=1);

namespace Tests\Feature\Predict;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class PredictCalibrateTest extends TestCase
{
    use BuildsPredictLesson, RefreshDatabase;

    public function test_the_gold_set_is_graded_by_jev_and_the_agreement_printed(): void
    {
        config()->set('services.jev', ['key' => 'jev-test', 'url' => 'https://jev.test/v1/systemone']);
        $scene = $this->predictScene($this->predictLesson());
        $gold = tempnam(sys_get_temp_dir(), 'gold');
        file_put_contents($gold, json_encode([
            ['text' => 'Salt stays in the soil when the water dries up.', 'level' => 3],
            ['text' => 'Tim says the gods were angry.', 'level' => 0],
            ['text' => 'Because of the water.', 'level' => 1],
        ]));
        // JEV says 3, 0, 2: two exact, all three within one level.
        $levels = ['3', '0', '2'];
        Http::fake(['jev.test/*' => function () use (&$levels) {
            $level = array_shift($levels);

            return Http::response(['answers' => ['level' => ['choice' => $level, 'probabilities' => [], 'confidence' => 0.9]]]);
        }]);

        $this->artisan('predict:calibrate', ['scene' => $scene->id, '--gold' => $gold])
            ->expectsOutputToContain('Graded 3 of 3. Exact agreement: 67%. Within one level: 100%.')
            ->assertSuccessful();

        Http::assertSentCount(3);
        Http::assertNotSent(fn (Request $r) => str_contains($r->body(), 'Tim'));
        unlink($gold);
    }

    public function test_a_missing_gold_set_fails_with_its_path(): void
    {
        $scene = $this->predictScene($this->predictLesson());

        $this->artisan('predict:calibrate', ['scene' => $scene->id, '--gold' => '/nope.json'])
            ->expectsOutputToContain('No gold set at /nope.json')
            ->assertFailed();
    }
}
