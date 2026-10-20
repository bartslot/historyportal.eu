<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Lesson;
use App\Models\Scene;
use Illuminate\Support\Facades\Storage;

/**
 * What is wrong with a lesson, scene by scene, in a teacher's words: the ONE checker that the
 * editor's thumbnail dots, the scene's error row, the Problems view, "fix all" and the publish
 * gate read (Bart, 2026-10-17: "how do I see the error? ... auto fix all problems button").
 *
 * A problem is {scene_id, order, kind, step, message, severity, fix}: the step that is wrong
 * (audio, image, script, or null when unknown), a sentence for the teacher (never the raw
 * exception, which stays in scenes.error_message for us), how bad it is, and the step that fixes
 * it automatically (the editor's regenerate()), or null when the teacher has to.
 */
final class LessonProblems
{
    /** The class will notice: a failed step, a missing picture, voice or file. Red. */
    public const BLOCKS = 'blocks';

    /** Plays, but not as the teacher left it: a voice older than its text, a stand-in voice. Amber. */
    public const OUTDATED = 'outdated';

    /** Steps "fix all" can do by itself: the editor's regenerate() for that asset. */
    public const FIXABLE = ['audio', 'image', 'script'];

    /** @return list<array{scene_id: int, order: int, kind: string, step: ?string, message: string, severity: string, fix: ?string}> */
    public static function for(Lesson $lesson): array
    {
        $out = [];
        foreach ($lesson->scenes()->ordered()->get() as $scene) {
            array_push($out, ...self::forScene($scene));
        }

        return $out;
    }

    /** @return list<array{scene_id: int, order: int, kind: string, step: ?string, message: string, severity: string, fix: ?string}> */
    public static function forScene(Scene $scene): array
    {
        $problem = fn (?string $step, string $message, string $severity, ?string $fix): array => [
            'scene_id' => $scene->id, 'order' => (int) $scene->order, 'kind' => (string) $scene->kind,
            'step' => $step, 'message' => $message, 'severity' => $severity, 'fix' => $fix,
        ];

        if ($scene->status === 'failed') {
            $step = self::failedStep($scene->error_message);

            return [$problem($step, self::failedMessage($step, $scene), self::BLOCKS, $step)];
        }
        if ($scene->status === 'generating') {
            return [];   // being made right now: not a problem yet
        }

        $out = [];
        $narrated = $scene->kind === 'narration';
        $spoken = $narrated && empty($scene->config['lines'] ?? null);
        if ($narrated && trim((string) $scene->script_segment) === '') {
            $out[] = $problem('script', __('This scene has no script yet.'), self::BLOCKS, null);
        }
        // As the publish gate has always read it: the default black background_color is no picture.
        if ($narrated && $scene->image_path === null && empty($scene->shots) && ! $scene->drawsOwnBackdrop()) {
            $out[] = $problem('image', __('This scene has no picture yet.'), self::BLOCKS, 'image');
        } elseif (self::missingFile($scene->image_path)) {
            $out[] = $problem('image', __('The picture file is missing.'), self::BLOCKS, 'image');
        }
        if ($spoken && $scene->audio_path === null && trim((string) $scene->script_segment) !== '') {
            $out[] = $problem('audio', __('This scene has no voice yet.'), self::BLOCKS, 'audio');
        } elseif (self::missingFile($scene->audio_path)) {
            $out[] = $problem('audio', __('The voice file is missing.'), self::BLOCKS, 'audio');
        } elseif ($spoken && $scene->error_message && self::failedStep($scene->error_message) === 'audio'
            && $scene->hasFreshAudio() && ! $scene->narrationWasDowngraded()) {
            // A re-narration of this same text failed; the scene still plays its own recording.
            $out[] = $problem('audio', __('Re-narrating failed: this scene still plays its earlier recording.'), self::OUTDATED, 'audio');
        } elseif ($spoken && $scene->audio_path !== null && ! $scene->hasFreshAudio()) {
            $out[] = $problem('audio', __('The voice belongs to an older text.'), self::OUTDATED, 'audio');
        } elseif ($scene->audio_provider !== null && $scene->narrationWasDowngraded()) {
            $out[] = $problem('audio', __('Read by a stand-in voice, not the lesson\'s narrator.'), self::OUTDATED, 'audio');
        }

        return $out;
    }

    /** The worst severity in a list, or null for none. */
    public static function worst(array $problems): ?string
    {
        $severities = array_column($problems, 'severity');

        return in_array(self::BLOCKS, $severities, true) ? self::BLOCKS : ($severities === [] ? null : self::OUTDATED);
    }

    /** Which step a stored error came from, read from the job's own message; null when unknown. */
    public static function failedStep(?string $error): ?string
    {
        $error = (string) $error;

        return match (true) {
            (bool) preg_match('/\b(tts|audio|narrat\w*|voice|speech|elevenlabs|azure)\b/i', $error) => 'audio',
            (bool) preg_match('/\b(image|picture|shots?|comfy\w*|render\w*|flux|fal)\b/i', $error) => 'image',
            (bool) preg_match('/\b(script|llm|ollama|claude|openai|gpt)\b/i', $error) => 'script',
            default => null,
        };
    }

    private static function failedMessage(?string $step, Scene $scene): string
    {
        return match ($step) {
            'audio' => $scene->audio_path !== null
                ? __('Narration failed: this scene still plays the old voice.')
                : __('Narration failed: this scene has no voice yet.'),
            'image' => __('The picture could not be made.'),
            'script' => __('The script could not be written.'),
            default => __('Something went wrong while making this scene.'),
        };
    }

    /** A stored file of ours (a storage path, not a URL) that is not on the disk. */
    private static function missingFile(?string $path): bool
    {
        $path = trim((string) $path);
        if ($path === '' || preg_match('#^(https?:)?//#i', $path) === 1) {
            return false;
        }
        $path = preg_replace('#^/?storage/#', '', $path);

        return ! Storage::disk('public')->exists($path);
    }
}
