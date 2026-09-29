<?php

declare(strict_types=1);

return [

    'max_generation_attempts' => (int) env('MAX_LESSON_GENERATION_ATTEMPTS', 3),

    /*
    |--------------------------------------------------------------------------
    | Scene shots (multi-image scenes)
    |--------------------------------------------------------------------------
    | Each scene gets a storyboard of shots generated as ONE image (a grid) that
    | is cropped into cells and upscaled — one image-gen call per scene, many
    | images on screen. '3x3' = 9 shots; '2x2' = 4 larger, higher-fidelity cells.
    | Set shot_grid to null/'' to fall back to the single-image pipeline.
    */
    'shot_grid' => env('LESSON_SHOT_GRID', '3x3'),

    /*
    |--------------------------------------------------------------------------
    | Phase 0 experiment: narrative shots (candidate condition)
    |--------------------------------------------------------------------------
    | narrative_shots=false  → BASELINE: the pipeline exactly as before (fixed
    |   grid, environment/object storyboard prompt, people/faces excluded).
    | narrative_shots=true   → CANDIDATE: storyboard prompt asks for visible
    |   ACTION by the script's people, the people/faces negatives are lifted for
    |   narrative shots, and the grid is sized dynamically from the script
    |   (shot ≈ every `shot_seconds` of narration, clamped to dynamic_shot_range).
    |
    | Both conditions are recorded on the lesson's generation run so scored
    | results can never be attributed to the wrong condition.
    | See docs/experiment/phase0-protocol.md.
    */
    'narrative_shots' => (bool) env('LESSON_NARRATIVE_SHOTS', false),
    'dynamic_shot_range' => [3, 8],
    'shot_seconds' => 6.5,      // target seconds of narration per shot
    'words_per_second' => 2.55, // measured narration speed

    // Free-text label stamped on every generation run while set — e.g. "phase0-baseline",
    // "phase0-candidate-2x3". Lets the scoring sheets join runs to conditions.
    'experiment_label' => env('LESSON_EXPERIMENT_LABEL'),

    /*
    |--------------------------------------------------------------------------
    | Sensitive-topic visual policy (zero-tolerance gate with fallback)
    |--------------------------------------------------------------------------
    | Lessons matching any keyword (topic/title/subject/details/outline) take the
    | DOCUMENTARY path: real sourced imagery first, restrained no-people
    | environments as fallback — never synthetic human reenactment. A teacher/
    | admin override lives in lesson.game_config.visual_policy. Keep this list
    | broad: a false positive costs style, a false negative costs trust.
    | See App\Services\SensitiveTopicPolicy.
    */
    'sensitive_topics' => [
        'holocaust', 'shoah', 'auschwitz', 'concentration camp', 'extermination',
        'anne frank', 'jodenvervolging',
        'slavery', 'enslaved', 'slave trade', 'slavenhandel', 'slavernij',
        'genocide', 'volkerenmoord', 'armenian genocide', 'rwanda',
        'massacre', 'mass killing', 'ethnic cleansing',
        'sexual violence', 'rape',
        'persecution', 'pogrom', 'lynching',
    ],

    /*
    |--------------------------------------------------------------------------
    | Generation cost rates (USD) — for the run cost estimate, not billing
    |--------------------------------------------------------------------------
    | Update these when providers/models change; the estimate is computed from
    | the counters on generation_runs, so historical rows re-price automatically.
    */
    'cost_rates' => [
        'llm_input_per_mtok' => (float) env('COST_LLM_INPUT_PER_MTOK', 0.15),
        'llm_cached_per_mtok' => (float) env('COST_LLM_CACHED_PER_MTOK', 0.075),
        'llm_output_per_mtok' => (float) env('COST_LLM_OUTPUT_PER_MTOK', 0.60),
        'image_per_call' => (float) env('COST_IMAGE_PER_CALL', 0.19),
        'vision_per_call' => (float) env('COST_VISION_PER_CALL', 0.01),
    ],

    /*
    |--------------------------------------------------------------------------
    | Player telemetry (anonymous, minimal retention)
    |--------------------------------------------------------------------------
    | Events carry an anonymous per-page-load session UUID only — no user id, no
    | IP, no cross-session identifier. Prune via lessons:prune-telemetry.
    */
    'telemetry_enabled' => (bool) env('LESSON_TELEMETRY', true),
    'telemetry_retention_days' => (int) env('LESSON_TELEMETRY_RETENTION_DAYS', 90),

    /*
    |--------------------------------------------------------------------------
    | Lesson picture compression
    |--------------------------------------------------------------------------
    | AVIF quality Cloudinary delivers lesson pictures at (f_auto: AVIF, WebP for
    | browsers without it; transparency kept). 20 is Bart's pick after comparing
    | 60/40/30/20/10/5 on the history-line art: the artefacts read as watercolour,
    | 10 starts breaking thin lines. Cheaper bandwidth matters more than the
    | faintest hatching. Changing it only affects pictures uploaded afterwards.
    */
    'image_quality' => (int) env('LESSON_IMAGE_QUALITY', 20),

];
