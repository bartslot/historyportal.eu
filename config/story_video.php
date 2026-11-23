<?php

declare(strict_types=1);

/*
|--------------------------------------------------------------------------
| Story to video (ElevenLabs image + video flows)
|--------------------------------------------------------------------------
| After the teacher approves the script: character sheets, then empty world shots, then one clip per
| narration beat. Each step waits for the teacher, so credits go on video only once the pictures are right.
| Key: services.elevenlabs.media_api_key (ELEVENLABS_IMAGE_API_KEY), with image AND video permission.
*/

return [
    // Who makes character sheets and world shots (App\Services\StoryVideo\Pictures\PictureDrivers): chatgpt (the
    // ChatGPT route of ImageRoute, never paid credits) or elevenlabs (needs the ElevenLabs Pro plan; bart stayed on
    // Creator, 2026-11-23).
    'picture_driver' => env('STORY_VIDEO_PICTURE_DRIVER', 'chatgpt'),

    // Nano Banana 2 (elevenlabs driver): takes up to 14 reference pictures, which carry the History Lines look.
    'image_model' => env('STORY_VIDEO_IMAGE_MODEL', 'gemini-3.1-flash-image'),
    'image_resolution' => env('STORY_VIDEO_IMAGE_RESOLUTION', '2K'),

    // Who makes clips (App\Services\StoryVideo\Clips\ClipDrivers): elevenlabs now, render_pc later.
    'clip_driver' => env('STORY_VIDEO_CLIP_DRIVER', 'elevenlabs'),

    // Seedance 2 Fast: 480p / 720p, 4-15 s, up to 9 reference pictures (never together with a start frame).
    'video_model' => env('STORY_VIDEO_VIDEO_MODEL', 'bytedance-seedance-v2-fast'),
    'video_resolution' => '720p',
    'clip_min_seconds' => 4,
    'clip_max_seconds' => 15,
    // The model's reference cap; the world shot takes one slot, the rest go to the cast in the beat.
    'video_max_references' => 9,

    // Style check (docs/history-lines-style.md §2): an off-style picture is redone this many times with a correction.
    'style_redos' => 1,

    // Polling: images every 5 s, video no more than every 10 s (ElevenLabs guidance); give up after this long.
    'poll_image_seconds' => 5,
    'poll_video_seconds' => 15,
    'give_up_after_minutes' => 30,

    // The render PC route (App\Services\StoryVideo\RenderPcQueue): the PC asks for clips with this token and sends
    // them back. No token: the route does not exist. A clip the PC claimed but never returned goes back in the
    // queue after `stale_minutes` (one MiniMax clip takes about 28 minutes).
    'render_pc' => [
        'token' => env('RENDER_PC_TOKEN'),
        'stale_minutes' => (int) env('RENDER_PC_STALE_MINUTES', 90),
        'max_upload_mb' => 200,
    ],

    // A safety cap on one lesson's run, so a runaway script never empties the credit balance.
    'max_clips_per_lesson' => (int) env('STORY_VIDEO_MAX_CLIPS', 80),
];
