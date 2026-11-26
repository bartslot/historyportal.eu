<?php

declare(strict_types=1);

use App\Models\Lesson;
use App\Models\User;
use App\Services\Collaboration\LessonCollaboration;
use Illuminate\Support\Facades\Broadcast;

// The editor of one lesson: everyone who may edit it (owner, admins, added editors) and nobody else.
// A presence channel, so the relay knows who is in it; the answer is what the others see of you.
Broadcast::channel('lesson.{lesson}', function (User $user, Lesson $lesson) {
    return $user->canEdit($lesson) ? LessonCollaboration::person($user) : false;
});
