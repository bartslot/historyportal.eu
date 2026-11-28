<?php

declare(strict_types=1);

namespace App\Services\Llm;

use RuntimeException;

/**
 * The model answered, but not with JSON we could read, nearly always because the answer hit the
 * output-token cap (thinking models spend part of it on reasoning). A caller that can split its
 * request (CaptionTranslator) asks again in smaller pieces. Still a RuntimeException.
 */
final class LlmBadJsonException extends RuntimeException {}
