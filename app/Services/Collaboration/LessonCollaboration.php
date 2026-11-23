<?php

declare(strict_types=1);

namespace App\Services\Collaboration;

use App\Exceptions\SceneClaimTaken;
use App\Models\Lesson;
use App\Models\LessonClaim;
use App\Models\LessonPresence;
use App\Models\Scene;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Several accounts in one lesson's editor (Bart, 2026-11-23): who is here, who is on which scene, and
 * only one account editing a scene at a time.
 *
 * It runs on the editor's ping (every PING_SECONDS, LessonPresenceController) because SiteGround cannot
 * keep a socket server running. A realtime relay can be added on top for cursors and instant notices,
 * but this class stays the authority: every Livewire edit asks authorizeEdit() first
 * (GuardsLessonClaims), so a dropped socket can never let two people write over each other.
 *
 * A "target" is the part of the lesson somebody holds: "scene:12", or "title" for the title screen.
 * Claims and presence are refreshed by the ping and simply lapse when a tab closes, so nothing ever
 * needs unlocking by hand.
 */
final class LessonCollaboration
{
    /** How often the editor pings (resources/js/editor/collab.js reads it from the page). */
    public const PING_SECONDS = 3;

    /** Somebody whose ping is older than this has left. */
    public const PRESENCE_SECONDS = 15;

    /** A claim whose holder stopped pinging for this long is free again. */
    public const CLAIM_SECONDS = 20;

    public const TITLE = 'title';

    public static function sceneTarget(int $sceneId): string
    {
        return 'scene:'.$sceneId;
    }

    /** The scene id inside a target, or null for the title screen. */
    public static function sceneIdOf(?string $target): ?int
    {
        return $target !== null && str_starts_with($target, 'scene:') ? (int) substr($target, 6) : null;
    }

    /** A target the editor may name: the title screen, or a scene of THIS lesson. */
    public function isValidTarget(Lesson $lesson, string $target): bool
    {
        if ($target === self::TITLE) {
            return true;
        }
        $sceneId = self::sceneIdOf($target);

        return $sceneId !== null && $lesson->scenes()->whereKey($sceneId)->exists();
    }

    /**
     * Hold the target if it is free, already ours, or its holder went quiet; with $force, take it from
     * whoever has it (Take over). Returns the holder's id afterwards: ours when it worked.
     */
    public function claim(Lesson $lesson, User $user, string $target, bool $force = false): int
    {
        $now = now();

        $existing = LessonClaim::query()->where('lesson_id', $lesson->id)->where('target', $target);
        if (! $force) {
            $existing->where(fn ($q) => $q->where('user_id', $user->id)
                ->orWhere('seen_at', '<', $now->copy()->subSeconds(self::CLAIM_SECONDS)));
        }

        // One conditional UPDATE, then an INSERT the unique index can refuse: two people clicking the same
        // scene in the same second end with exactly one holder, on Postgres and MySQL alike.
        if ($existing->update(['user_id' => $user->id, 'seen_at' => $now]) === 0) {
            LessonClaim::query()->insertOrIgnore([
                'lesson_id' => $lesson->id, 'user_id' => $user->id, 'target' => $target, 'seen_at' => $now,
            ]);
        }

        return (int) LessonClaim::query()->where('lesson_id', $lesson->id)->where('target', $target)->value('user_id');
    }

    /** Who holds the target right now, or null when nobody does. */
    public function holder(Lesson $lesson, string $target): ?User
    {
        $claim = LessonClaim::query()
            ->where('lesson_id', $lesson->id)->where('target', $target)
            ->where('seen_at', '>=', now()->subSeconds(self::CLAIM_SECONDS))
            ->with('user:id,name')
            ->first();

        return $claim?->user;
    }

    /**
     * The gate in front of every edit: claims the target when it is free, and refuses when somebody else
     * holds it. The refusal reaches the browser as a 409 that collab.js turns into "X took over".
     */
    public function authorizeEdit(Lesson $lesson, User $user, string $target): void
    {
        if ($this->claim($lesson, $user, $target) === (int) $user->id) {
            return;
        }

        throw new SceneClaimTaken($this->holder($lesson, $target)?->name ?? '', $target);
    }

    /**
     * The editor's ping: "I am here, looking at $target". Refreshes presence, holds the target when it is
     * free, lets go of anything else this account held, and reports the room.
     *
     * @return array<string, mixed>
     */
    public function ping(Lesson $lesson, User $user, ?string $target): array
    {
        $now = now();

        LessonPresence::query()->upsert(
            [['lesson_id' => $lesson->id, 'user_id' => $user->id, 'target' => $target, 'seen_at' => $now]],
            ['lesson_id', 'user_id'],
            ['target', 'seen_at'],
        );

        // Moving to another scene frees the one you were on.
        LessonClaim::query()->where('lesson_id', $lesson->id)->where('user_id', $user->id)
            ->when($target !== null, fn ($q) => $q->where('target', '!=', $target))
            ->delete();

        if ($target !== null) {
            $this->claim($lesson, $user, $target);
        }

        $this->sweep($lesson, $now);

        return $this->room($lesson, $user, $target);
    }

    /** The tab closed (sendBeacon): free everything at once instead of waiting for the claim to lapse. */
    public function leave(Lesson $lesson, User $user): void
    {
        LessonClaim::query()->where('lesson_id', $lesson->id)->where('user_id', $user->id)->delete();
        LessonPresence::query()->where('lesson_id', $lesson->id)->where('user_id', $user->id)->delete();
    }

    /**
     * Who is in the lesson, who holds what, and two fingerprints the browser compares between pings:
     * the rail (scenes added, removed, reordered, repainted) and the scene on screen (edited by its holder
     * while you watch).
     *
     * @return array<string, mixed>
     */
    public function room(Lesson $lesson, User $user, ?string $target): array
    {
        $since = now()->subSeconds(self::PRESENCE_SECONDS);

        $people = LessonPresence::query()
            ->where('lesson_id', $lesson->id)->where('seen_at', '>=', $since)
            ->with('user:id,name')
            ->get()
            ->filter(fn (LessonPresence $p) => $p->user !== null)
            ->map(fn (LessonPresence $p) => [
                ...self::person($p->user),
                'me' => (int) $p->user_id === (int) $user->id,
                'target' => $p->target,
            ])
            ->values()
            ->all();

        $claims = LessonClaim::query()
            ->where('lesson_id', $lesson->id)
            ->where('seen_at', '>=', now()->subSeconds(self::CLAIM_SECONDS))
            ->pluck('user_id', 'target')
            ->map(fn ($id) => (int) $id)
            ->all();

        $holderId = $target !== null ? ($claims[$target] ?? null) : null;
        $holder = $holderId !== null
            ? collect($people)->firstWhere('id', $holderId) ?? self::person(User::query()->find($holderId))
            : null;

        $sceneId = self::sceneIdOf($target);
        $scene = $sceneId !== null ? $lesson->scenes()->whereKey($sceneId)->first(['id', 'updated_at', 'image_path', 'config']) : null;

        return [
            'me' => (int) $user->id,
            'people' => $people,
            'claims' => $claims,
            'target' => $target,
            'holder' => $holder,
            'mine' => $holderId === null || $holderId === (int) $user->id,
            'rail' => $this->railSignature($lesson),
            // Any change to what is on screen: the holder's edits, seen by the people watching.
            'scene_version' => $scene !== null
                ? $scene->updated_at?->getTimestampMs()
                : optional($lesson->fresh()?->updated_at)->getTimestampMs(),
            // Only the picture and its clip. Queue jobs and the video pipeline write these with nobody
            // holding a claim (they never pass authorizeEdit), so the holder's editor reloads on this.
            'media' => $scene !== null ? md5((string) json_encode([$scene->image_path, $scene->config['bg_loop'] ?? null])) : null,
        ];
    }

    /**
     * Changes when the rail would draw something different: a scene added, deleted, moved or given a new
     * picture. Text edits inside a scene leave it alone, so the holder's typing never redraws the
     * watchers' rail (a 163-scene rail is heavy, see SceneRail).
     */
    public function railSignature(Lesson $lesson): string
    {
        return md5((string) json_encode(
            $lesson->scenes()->ordered()->get(['id', 'order', 'kind', 'game_type', 'status', 'image_path', 'chapter_name'])
                ->map(fn (Scene $s) => [$s->id, $s->order, $s->kind, $s->game_type, $s->status, $s->image_path, $s->chapter_name])
                ->all()
        ));
    }

    /**
     * Name, initials and a colour that stays the same for that account in every lesson.
     *
     * @return array{id: int, name: string, initials: string, color: string}|null
     */
    public static function person(?User $user): ?array
    {
        if ($user === null) {
            return null;
        }
        $words = preg_split('/\s+/', trim((string) $user->name)) ?: [];
        $initials = mb_strtoupper(mb_substr($words[0] ?? '?', 0, 1).(count($words) > 1 ? mb_substr((string) end($words), 0, 1) : ''));
        // The golden angle spreads consecutive ids around the wheel, so two editors rarely look alike.
        $hue = ((int) $user->id * 137) % 360;

        return [
            'id' => (int) $user->id,
            'name' => (string) $user->name,
            'initials' => $initials,
            'color' => "hsl({$hue} 70% 62%)",
        ];
    }

    /**
     * What resources/js/editor/collab.js needs from the page: where to ping, how often, and its words.
     *
     * @return array<string, mixed>
     */
    public static function editorConfig(Lesson $lesson): array
    {
        return [
            'pingUrl' => route('teacher.lessons.presence', $lesson),
            'takeOverUrl' => route('teacher.lessons.presence.take-over', $lesson),
            'leaveUrl' => route('teacher.lessons.presence.leave', $lesson),
            'csrf' => csrf_token(),
            'intervalMs' => self::PING_SECONDS * 1000,
            'labels' => [
                'took_over' => __(':name took over this scene'),
                'new_media' => __('A new picture or clip arrived'),
                'someone' => __('Someone'),
            ],
        ];
    }

    /** Old rows from tabs that never said goodbye. Cheap: a lesson has a handful of rows at most. */
    private function sweep(Lesson $lesson, Carbon $now): void
    {
        $stale = $now->copy()->subHour();
        LessonPresence::query()->where('lesson_id', $lesson->id)->where('seen_at', '<', $stale)->delete();
        LessonClaim::query()->where('lesson_id', $lesson->id)->where('seen_at', '<', $stale)->delete();
    }
}
