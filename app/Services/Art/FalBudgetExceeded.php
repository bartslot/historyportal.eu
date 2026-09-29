<?php

declare(strict_types=1);

namespace App\Services\Art;

/** Thrown BEFORE a fal request is sent when it would break the global budget or the run cap. */
final class FalBudgetExceeded extends \RuntimeException {}
