<?php

declare(strict_types=1);

namespace App\Services\StoryVideo;

use App\Enums\StoryMediaKind;
use App\Enums\StoryMediaStatus;
use App\Jobs\AssembleSceneFilm;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\StoryMediaItem;
use App\Services\Art\HistoryLineStyle;
use App\Services\OpenAiLlmService;
use App\Services\StoryVideo\Clips\ClipDrivers;
use App\Services\StoryVideo\Pictures\PictureDrivers;
use RuntimeException;

/**
 * Story to video for one lesson: start a step, approve what came back, redo one item. The steps run in order
 * (characters, places, video) and each waits until the teacher approved everything in the step before it, so
 * credits only go on video once the pictures are right (bart, 2026-11-23).
 *
 * Approving a world shot makes it the scene's picture. When every clip of a scene is approved, its clips are
 * joined into the scene's film (AssembleSceneFilm), which plays over that picture.
 */
final class StoryVideoRun
{
    public function __construct(private readonly Lesson $lesson) {}

    public static function for(Lesson $lesson): self
    {
        return new self($lesson);
    }

    /** May this step start? Its previous step must be fully approved (an empty step counts as done). */
    public function canStart(StoryMediaKind $kind): bool
    {
        $previous = $kind->previous();

        return $previous === null || ! $this->lesson->storyMedia()->where('kind', $previous->value)
            ->where('status', '!=', StoryMediaStatus::Approved->value)->exists();
    }

    /** Queue every item of the step that is not made yet (or failed). Returns how many were queued. */
    public function start(StoryMediaKind $kind): int
    {
        if (! $this->canStart($kind)) {
            throw new RuntimeException("Approve every {$kind->previous()?->value} first.");
        }
        $items = $this->lesson->storyMedia()->where('kind', $kind->value)
            ->whereIn('status', [StoryMediaStatus::Planned->value, StoryMediaStatus::Failed->value])->get();
        foreach ($items as $item) {
            $this->queue($item);
        }

        return $items->count();
    }

    /** Make one item again, optionally with the teacher's instruction ("make him older", "more sea"). */
    public function redo(StoryMediaItem $item, string $note = ''): void
    {
        if ($item->status->isBusy() || ! $this->canStart($item->kind)) {
            return;
        }
        $item->update(['note' => trim($note) !== '' ? mb_substr(trim($note), 0, 500) : null, 'prompt' => null]);
        $this->queue($item);
    }

    public function approve(StoryMediaItem $item): void
    {
        if ($item->status !== StoryMediaStatus::Ready || $item->path === null) {
            return;
        }
        $item->update(['status' => StoryMediaStatus::Approved]);

        if ($item->kind === StoryMediaKind::WorldShot && $item->scene !== null) {
            $item->scene->update(['image_path' => $item->path, 'shots' => null]);
        }
        if ($item->kind === StoryMediaKind::Clip && $item->scene_id !== null && $this->sceneClipsApproved($item->scene_id)) {
            AssembleSceneFilm::dispatch($item->scene_id);
        }
    }

    /** Approve every item in the step that is ready. */
    public function approveAll(StoryMediaKind $kind): void
    {
        foreach ($this->lesson->storyMedia()->where('kind', $kind->value)->where('status', StoryMediaStatus::Ready->value)->get() as $item) {
            $this->approve($item);
        }
    }

    public function sceneClipsApproved(int $sceneId): bool
    {
        return ! $this->lesson->storyMedia()->where('kind', StoryMediaKind::Clip->value)->where('scene_id', $sceneId)
            ->where('status', '!=', StoryMediaStatus::Approved->value)->exists();
    }

    /**
     * The prompt for an item, written once and kept (a redo with a note writes it again). A clip's staging comes
     * from the script model; pictures are fixed text.
     */
    public function prompt(StoryMediaItem $item, ?OpenAiLlmService $llm = null): string
    {
        if (is_string($item->prompt) && $item->prompt !== '') {
            return $item->prompt;
        }
        $input = $item->input ?? [];
        $cast = StoryVideoPlanner::cast(is_array($this->lesson->outline) ? $this->lesson->outline : []);
        $era = trim((string) ($this->lesson->era ?? '')) ?: 'the past';
        $place = trim((string) ($this->lesson->region ?? ''));
        $note = trim((string) $item->note) !== '' ? ' The teacher asks: '.trim((string) $item->note).'.' : '';

        $prompt = match ($item->kind) {
            StoryMediaKind::CharacterSheet => StoryVideoPrompts::characterSheet($input, $era, $place, StoryVideoPlanner::whiteOwners($cast)).$note,
            StoryMediaKind::WorldShot => StoryVideoPrompts::worldShot((array) ($input['brief'] ?? []), $era, (string) ($input['fallback'] ?? '')).$note,
            StoryMediaKind::Clip => $this->clipPrompt($item, $note, $llm ?? app(OpenAiLlmService::class)),
        };
        $item->update(['prompt' => $prompt]);

        return $prompt;
    }

    /**
     * The request body for ElevenLabs. Pictures carry the History Lines anchors; a clip carries the scene's
     * approved world shot as image 1 and the approved sheets of the people in the beat after it. Seedance
     * cannot take a start frame together with reference pictures, and the references are what keep the
     * comic look (empty world + character sheets), so clips never use a start frame.
     *
     * @return array<string, mixed>
     */
    public function body(StoryMediaItem $item, string $prompt): array
    {
        if ($item->kind->isVideo()) {
            return [
                'model_id' => (string) config('story_video.video_model'),
                'prompt' => $prompt,
                'aspect_ratio' => '16:9',
                'duration_secs' => (int) (($item->input ?? [])['seconds'] ?? 5),
                'resolution' => (string) config('story_video.video_resolution', '720p'),
                'generate_audio' => false,   // narration and sound come from the lesson
                'images' => $this->clipReferences($item),
            ];
        }

        $anchors = $item->kind === StoryMediaKind::CharacterSheet ? StoryVideoPrompts::SHEET_ANCHORS : StoryVideoPrompts::IMAGE_ANCHORS;
        $images = [];
        foreach ($anchors as $file) {
            $path = HistoryLineStyle::anchorPath($file);
            if (is_file($path)) {
                $images[] = ElevenLabsMedia::inline((string) file_get_contents($path), $path);
            }
        }

        return [
            'model_id' => (string) config('story_video.image_model'),
            'prompt' => $prompt,
            'aspect_ratio' => '16:9',
            'resolution' => (string) config('story_video.image_resolution', '2K'),
            'images' => $images,
        ];
    }

    /** @return list<array<string, string>> */
    private function clipReferences(StoryMediaItem $item): array
    {
        $disk = \Illuminate\Support\Facades\Storage::disk('public');
        $world = $this->lesson->storyMedia()->where('kind', StoryMediaKind::WorldShot->value)->where('scene_id', $item->scene_id)
            ->where('status', StoryMediaStatus::Approved->value)->value('path')
            ?? Scene::whereKey($item->scene_id)->value('image_path');
        $refs = [];
        if (is_string($world) && $disk->exists($world)) {
            $refs[] = ElevenLabsMedia::inline($disk->get($world), $world);
        }
        foreach ($this->sheetsFor($item) as $path) {
            if (count($refs) >= (int) config('story_video.video_max_references', 9)) {
                break;
            }
            if ($disk->exists($path)) {
                $refs[] = ElevenLabsMedia::inline($disk->get($path), $path);
            }
        }

        return $refs;
    }

    /**
     * Approved sheet paths of the people in a clip's beat: the same people, in the same order, as the prompt's
     * image 2, image 3, ...
     *
     * @return list<string>
     */
    private function sheetsFor(StoryMediaItem $item): array
    {
        return array_values(array_filter(array_column($this->clipPeople($item), 'path')));
    }

    /**
     * The cast members of a clip's beat whose sheet is approved, in cast order, capped so the world shot still fits.
     *
     * @return list<array{name: string, colour: string, look: string, path: string}>
     */
    private function clipPeople(StoryMediaItem $item): array
    {
        $names = array_map('strval', (array) (($item->input ?? [])['people'] ?? []));
        $sheets = $this->lesson->storyMedia()->where('kind', StoryMediaKind::CharacterSheet->value)
            ->where('status', StoryMediaStatus::Approved->value)->whereNotNull('path')->pluck('path', 'label')->all();
        $people = [];
        foreach (StoryVideoPlanner::cast(is_array($this->lesson->outline) ? $this->lesson->outline : []) as $c) {
            if (in_array($c['name'], $names, true) && isset($sheets[$c['name']])) {
                $people[] = [...$c, 'path' => (string) $sheets[$c['name']]];
            }
        }

        return array_slice($people, 0, max(0, (int) config('story_video.video_max_references', 9) - 1));
    }

    private function clipPrompt(StoryMediaItem $item, string $note, OpenAiLlmService $llm): string
    {
        $input = $item->input ?? [];
        $people = $this->clipPeople($item);
        $brief = $item->scene ? StoryVideoPlanner::brief(is_array($this->lesson->outline) ? $this->lesson->outline : [], $item->scene) : [];
        $place = trim(implode(', ', array_filter([(string) ($brief['location'] ?? ''), (string) ($brief['viewerPosition'] ?? '')])));
        $seconds = (int) ($input['seconds'] ?? 5);

        $plan = $llm->json(
            StoryVideoPrompts::shotPlanSystem(),
            StoryVideoPrompts::shotPlanUser((string) ($input['text'] ?? ''), $seconds, $place, $people).$note,
            maxTokens: 900,
        );
        $staging = trim((string) ($plan['staging'] ?? ''));
        if ($staging === '') {
            throw new RuntimeException('The shot plan came back empty.');
        }

        return StoryVideoPrompts::clip($staging, $seconds, $people);
    }

    /** A clip driver delivers a finished clip (already stored on the public disk): it waits for the teacher. */
    public function clipFinished(StoryMediaItem $clip, string $path): void
    {
        if ($clip->status->isBusy()) {
            $clip->update(['path' => $path, 'status' => StoryMediaStatus::Ready, 'generation_id' => null, 'error' => null]);
        }
    }

    public function clipFailed(StoryMediaItem $clip, string $why): void
    {
        if ($clip->status->isBusy()) {
            $clip->update(['status' => StoryMediaStatus::Failed, 'generation_id' => null, 'error' => mb_substr($why, 0, 500)]);
        }
    }

    private function queue(StoryMediaItem $item): void
    {
        $item->update(['status' => StoryMediaStatus::Queued, 'generation_id' => null, 'error' => null, 'attempts' => 0, 'started_at' => now()]);
        if ($item->kind->isVideo()) {
            $driver = ClipDrivers::make();
            $item->update(['model' => $driver->name() === 'elevenlabs' ? (string) config('story_video.video_model') : $driver->name()]);
            $driver->start($item);

            return;
        }
        $driver = PictureDrivers::make();
        $item->update(['model' => $driver->name() === 'elevenlabs' ? (string) config('story_video.image_model') : $driver->name()]);
        $driver->start($item);
    }
}
