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
