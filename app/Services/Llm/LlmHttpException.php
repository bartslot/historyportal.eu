<?php

declare(strict_types=1);

namespace App\Services\Llm;

use Illuminate\Http\Client\Response;
use RuntimeException;

/**
 * A provider answered with an HTTP error. Carries the status and how long the provider asked us
 * to wait (Retry-After, or Gemini's error.details[].retryDelay "56s"), so a caller can back off
 * instead of hammering a rate limit. Still a RuntimeException: existing catch blocks keep working.
 */
final class LlmHttpException extends RuntimeException
{
    public function __construct(public readonly int $status, public readonly ?int $retryAfter = null)
    {
        parent::__construct("OpenAI API returned {$status}");
    }

    public static function fromResponse(Response $response): self
    {
        return new self($response->status(), self::retryAfter($response));
    }

    /** Rate limited or a server hiccup: worth trying again later. */
    public function retryable(): bool
    {
        return $this->status === 429 || $this->status >= 500;
    }

    private static function retryAfter(Response $response): ?int
    {
        $header = $response->header('Retry-After');
        if (is_numeric($header)) {
            return (int) ceil((float) $header);
        }

        // Gemini (and Google APIs generally) put it in the body: [{"error":{"details":[{"retryDelay":"56s"}]}}]
        $body = $response->json();
        $error = $body['error'] ?? $body[0]['error'] ?? null;
        foreach ((array) ($error['details'] ?? []) as $detail) {
            if (preg_match('/^(\d+(?:\.\d+)?)s$/', (string) ($detail['retryDelay'] ?? ''), $m)) {
                return (int) ceil((float) $m[1]);
            }
        }

        return null;
    }
}
