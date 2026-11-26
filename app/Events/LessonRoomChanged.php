<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * Somebody in a lesson's editor moved to another scene, took one over, or left. Carries nothing but the
 * nudge: every editor that hears it pings at once (resources/js/editor/collab-realtime.js), and the ping
 * answer is the truth. So a missed event costs at most one ping interval, never a wrong lock.
 *
 * Sent now, not queued: SiteGround runs the queue from cron, a minute late, and a late nudge is no nudge.
 */
final class LessonRoomChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    public function __construct(public readonly int $lessonId, public readonly int $byUserId) {}

    public function broadcastOn(): PresenceChannel
    {
        return new PresenceChannel('lesson.'.$this->lessonId);
    }

    public function broadcastAs(): string
    {
        return 'room.changed';
    }

    /** @return array<string, int> */
    public function broadcastWith(): array
    {
        return ['by' => $this->byUserId];
    }
}
