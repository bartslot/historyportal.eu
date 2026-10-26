<?php

declare(strict_types=1);

/*
| The predict moment (scene game_type=predict): grading of a typed WHY answer. JEV grades, the
| `feedback` LLM role (config/llm.php) writes 1-2 sentences. See App\Jobs\GradePredictionAnswer.
*/
return [
    // Below this JEV confidence the child gets neutral feedback and the answer is flagged for the
    // teacher. To be set from the calibration (php artisan predict:calibrate).
    'min_confidence' => (float) env('PREDICT_MIN_CONFIDENCE', 0.6),
];
