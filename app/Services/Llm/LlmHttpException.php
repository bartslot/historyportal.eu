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
    /** OpenAI's 429 when the account has no credit left: waiting never helps, someone has to pay. */
    public const QUOTA_EXHAUSTED = 'insufficient_quota';

    public function __construct(
        public readonly int $status,
        public readonly ?int $retryAfter = null,
        public readonly ?string $errorCode = null,
    ) {
        parent::__construct("OpenAI API returned {$status}".($errorCode !== null ? " ({$errorCode})" : ''));
    }

    public static function fromResponse(Response $response): self
    {
        return new self($response->status(), self::retryAfter($response), self::errorCode($response));
    }

    /** Rate limited or a server hiccup: worth trying again later. An empty quota is not. */
    public function retryable(): bool
    {
        return ($this->status === 429 || $this->status >= 500) && ! $this->quotaExhausted();
    }

    public function quotaExhausted(): bool
    {
        return $this->errorCode === self::QUOTA_EXHAUSTED;
    }

    /** OpenAI: {"error":{"code":"rate_limit_exceeded"|"insufficient_quota","type":...}}; Gemini: [{"error":{"status":"RESOURCE_EXHAUSTED"}}]. */
    private static function errorCode(Response $response): ?string
    {
        $body = $response->json();
        $error = is_array($body) ? ($body['error'] ?? $body[0]['error'] ?? null) : null;
        if (! is_array($error)) {
            return null;
        }
        foreach (['code', 'type', 'status'] as $field) {
            if (is_string($error[$field] ?? null) && $error[$field] !== '') {
                // OpenAI sometimes leaves code null and puts insufficient_quota in type only
                if ($field === 'code' && ($error['type'] ?? null) === self::QUOTA_EXHAUSTED) {
                    return self::QUOTA_EXHAUSTED;
                }

                return $error[$field];
            }
        }

        return null;
    }

    private static function retryAfter(Response $response): ?int
    {
        $header = $response->header('Retry-After');
        if (is_numeric($header)) {
            return (int) ceil((float) $header);
        }

        // Gemini (and Google APIs generally) put it in the body: [{"error":{"details":[{"retryDelay":"56s"}]}}]
        $body = $response->json();
        $error = is_array($body) ? ($body['error'] ?? $body[0]['error'] ?? null) : null;
        foreach ((array) ($error['details'] ?? []) as $detail) {
            if (preg_match('/^(\d+(?:\.\d+)?)s$/', (string) ($detail['retryDelay'] ?? ''), $m)) {
                return (int) ceil((float) $m[1]);
            }
        }

        return null;
    }
}
