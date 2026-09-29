<?php

declare(strict_types=1);

namespace App\Services\Jev;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * JEV (TypeSafe System One): grades and chooses, it does not write. Given a description (the
 * "state") and choice questions with their options, it returns the option it holds most plausible,
 * with probabilities and a confidence. Same API as tools/artkit/jev/jev.py.
 */
final class JevClient
{
    /**
     * @param  array<string, array{instructions: string, criteria: array<string, string>}>  $questions
     * @return array<string, array{choice: string, probabilities: array<string, float>, confidence: float}>
     */
    public function choose(string $state, array $questions): array
    {
        $key = (string) config('services.jev.key');
        if ($key === '') {
            throw new RuntimeException('JEV is not configured (JEV_AI).');
        }

        $body = [
            'model' => 'jev-latest',
            'state' => $state,
            'questions' => array_map(fn (array $q) => ['type' => 'choice', ...$q], $questions),
        ];
        $response = Http::withToken($key)->timeout(90)->retry(3, 2000, throw: false)
            ->post((string) config('services.jev.url'), $body);
        if (! $response->successful()) {
            throw new RuntimeException('JEV answered HTTP '.$response->status().'.');
        }

        return (array) $response->json('answers', []);
    }
}
