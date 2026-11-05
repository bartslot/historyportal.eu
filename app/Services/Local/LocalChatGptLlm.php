<?php

declare(strict_types=1);

namespace App\Services\Local;

use App\Services\OpenAiLlmService;
use RuntimeException;

/** A text role answered by ChatGPT on this machine (config/llm.php provider `chatgpt_local`): same calls, other route. */
class LocalChatGptLlm extends OpenAiLlmService
{
    protected function call(string $system, string $user, ?string $model, bool $jsonMode, ?int $maxTokens = null): string
    {
        if (! LocalChatGpt::available()) {
            throw new RuntimeException('ChatGPT on this machine is not available here.');
        }

        return app(LocalChatGpt::class)->text($system, $user.($jsonMode ? "\n\nReply with one JSON object only, nothing else." : ''));
    }
}
