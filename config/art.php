<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| History Portal art pipeline (history-line style, fal.ai)
|--------------------------------------------------------------------------
| Separate from services.falai on purpose: FAL_IMAGE_MODEL drives the skybox
| model, so art models get their own keys.
|
| Model ids contain dots (v4.5). Never read them with config("art.prices.$model")
| — dots split keys. Always config('art.prices')[$model] ?? null.
*/

return [
    'style_version' => 'history-line@1',

    // Approved style references (T0.5). Both are sent with every art generation.
    'anchors' => [
        'people' => resource_path('art/style-anchors/history-line@1/people-equipment.png'),
        'environment' => resource_path('art/style-anchors/history-line@1/environment-architecture.png'),
    ],

    'models' => [
        'generate' => env('FAL_ART_GENERATE_MODEL', 'fal-ai/bytedance/seedream/v4.5/text-to-image'),
        // Bake-off 2026-09-26 (storage/app/bakeoff/20260926_122253): Nano Banana Pro kept the source
        // composition, drew period-correct helmets and kept sheet cells isolated; Seedream broke the
        // grid and lost the composition. Pro has no text-to-image twin: every art call is edit()
        // with the two style anchors as references.
        'edit' => env('FAL_ART_EDIT_MODEL', 'fal-ai/nano-banana-pro/edit'),
    ],

    // Candidates for the bake-off (T0.6). Ids verified against fal's OpenAPI schemas 2026-09-25.
    'bakeoff_models' => [
        'fal-ai/bytedance/seedream/v4.5/edit',
        'fal-ai/flux-pro/kontext/max/multi',
        // Pro, not plain nano-banana: the plain one outputs ~1K whatever size is asked for.
        'fal-ai/nano-banana-pro/edit',
    ],

    // USD per output image, from each model's fal page (2026-09-25). A model without a
    // price is REFUSED — no silent spending. Kontext Max Multi shows no price on its page yet.
    'prices' => [
        'fal-ai/bytedance/seedream/v4.5/text-to-image' => 0.04,
        'fal-ai/bytedance/seedream/v4.5/edit' => 0.04,
        'fal-ai/nano-banana/edit' => 0.039,
        // $0.15 base, billed double at 4K — and model_input below always asks for 4K.
        'fal-ai/nano-banana-pro/edit' => 0.30,
    ],

    // How each model takes its output size. Default 'image_size' = {width,height}.
    'size_param' => [
        'fal-ai/flux-pro/kontext/max/multi' => 'aspect_ratio',
        'fal-ai/nano-banana/edit' => 'aspect_ratio',
        'fal-ai/nano-banana-pro/edit' => 'aspect_ratio',
    ],

    // Fixed extra input per model, sent with every call (the caller's $extra still wins).
    'model_input' => [
        'fal-ai/nano-banana-pro/edit' => ['resolution' => '4K'],
    ],

    // Global ceiling across ALL fal art calls ever recorded in fal_ledger.
    'budget_usd' => (float) env('FAL_IMAGE_BUDGET_USD', 17.0),
    'timeout' => (int) env('FAL_ART_TIMEOUT', 300),
    'poll_seconds' => (int) env('FAL_ART_POLL_SECONDS', 2),
    // Seconds to wait before each retry of a failed status/response GET (network blip, 5xx).
    'poll_retry_backoff' => [1, 2, 4, 8, 15],

    // Grid + pixel size per sheet type. Seedream 4.5: each side 1920–4096 px,
    // or total pixels between 2560×1440 and 4096×4096.
    'sheets' => [
        'people' => ['grid' => '2x2', 'w' => 4096, 'h' => 4096],
        'objects' => ['grid' => '3x3', 'w' => 4096, 'h' => 4096],
        'wide' => ['grid' => '1x1', 'w' => 4096, 'h' => 2048],
        'scene' => ['grid' => '3x3', 'w' => 4096, 'h' => 2304],
    ],

    'source_filter' => env('ART_SOURCE_FILTER', 'pd_cc0'), // 'pd_cc0' | 'off'

    // art:make (asset packs). python3 with Pillow runs tools/artkit/lineclean.py.
    'python' => env('ART_PYTHON', 'python3'),
    'manifests_path' => resource_path('art/manifests'),
    // The shared library, committed to git: <collection>/<category>/<subcategory>/<slug>.webp.
    'library_path' => resource_path('icons'),
    // Raw fal output kept for audit (gitignored storage).
    'raw_path' => storage_path('app/art-raw'),
];
