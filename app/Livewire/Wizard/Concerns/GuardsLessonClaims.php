<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Lesson;
use App\Services\Collaboration\LessonCollaboration;
use Livewire\Features\SupportEvents\SupportEvents;
use ReflectionMethod;
use ReflectionNamedType;

/**
 * Only one account edits a scene at a time (Bart, 2026-11-23). Every Livewire call and every property
 * update of the component passes through here BEFORE it runs, and is refused with a 409 when somebody
 * else holds the scene it would change (LessonCollaboration::authorizeEdit, SceneClaimTaken).
 *
 * Which scene a call changes:
 *  - a method whose first parameter is $sceneId / $sourceSceneId changes that scene (deleteScene(12));
 *  - anything else changes what is on screen: the selected scene, or the title screen;
 *  - claimFreeMethods() change nothing anybody holds (picking a scene, opening a picker, adding a scene);
 *  - an event (__dispatch) is judged by the #[On] method it lands on, with the event's own parameters.
 *
 * Refusing too much only ever bites somebody looking at a scene another person holds, whose editor is
 * read-only anyway. Refusing too little is how two people write over each other, so the default is to
 * guard.
 *
 * AppServiceProvider runs the two guards from Livewire's `before` hooks, ahead of every feature: the
 * trait hooks (call{Trait}) come too late for events, whose listener SupportEvents has already run by
 * then. They are protected so the browser cannot call them as actions.
 */
trait GuardsLessonClaims
{
    abstract protected function claimLesson(): ?Lesson;

    /** The part of the lesson on screen: "scene:12", "title", or null when nothing is open. */
    abstract protected function claimTarget(): ?string;

    /** @return list<string> methods that never change a held scene */
    protected function claimFreeMethods(): array
    {
        return [];
    }

    /** @return list<string> properties that only drive the interface (an open picker, a search box) */
    protected function claimFreeProperties(): array
    {
        return [];
    }

    /** @return list<string> methods only the lesson's owner may call (publishing, sharing) */
    protected function claimOwnerOnlyMethods(): array
    {
        return [];
    }

    protected function guardLessonClaimCall(string $methodName, array $params): void
    {
        if ($methodName === '__dispatch') {
            $methodName = $this->claimMethodForEvent((string) ($params[0] ?? ''));
            if ($methodName === null) {
                return;
            }
            $params = (array) ($params[1] ?? []);
        }

        $lesson = $this->claimLesson();
        $user = auth()->user();
        if ($lesson === null || $user === null) {
            return;
        }

        // Access is checked at mount only; an editor the owner removed while their tab was open stops here.
        abort_unless($user->canEdit($lesson), 403);

        if (in_array($methodName, $this->claimOwnerOnlyMethods(), true)) {
            abort_unless($user->canManage($lesson), 403);
        }

        if (in_array($methodName, $this->claimFreeMethods(), true)) {
            return;
        }

        $target = $this->claimTargetForCall($methodName, $params) ?? $this->claimTarget();
        if ($target !== null) {
            app(LessonCollaboration::class)->authorizeEdit($lesson, $user, $target);
        }
    }

    protected function guardLessonClaimUpdate(string $fullPath): void
    {
        $property = explode('.', $fullPath)[0];
        if (in_array($property, $this->claimFreeProperties(), true)) {
            return;
        }

        $lesson = $this->claimLesson();
        $user = auth()->user();
        if ($lesson === null || $user === null) {
            return;
        }

        abort_unless($user->canEdit($lesson), 403);
        $target = $this->claimTarget();
        if ($target !== null) {
            app(LessonCollaboration::class)->authorizeEdit($lesson, $user, $target);
        }
    }

    /** "scene:N" when the method names the scene it changes in its first parameter. */
    private function claimTargetForCall(string $methodName, array $params): ?string
    {
        if (! method_exists($this, $methodName)) {
            return null;
        }
        $first = (new ReflectionMethod($this, $methodName))->getParameters()[0] ?? null;
        if ($first === null || ! in_array($first->getName(), ['sceneId', 'sourceSceneId'], true)) {
            return null;
        }
        $type = $first->getType();
        if ($type instanceof ReflectionNamedType && $type->getName() !== 'int') {
            return null;
        }

        $value = $params[$first->getName()] ?? $params[0] ?? null;

        return is_numeric($value) && (int) $value > 0 ? LessonCollaboration::sceneTarget((int) $value) : null;
    }

    /** The method an event lands on, by the same lookup SupportEvents makes ($listeners, #[On], {placeholders}). */
    private function claimMethodForEvent(string $event): ?string
    {
        return in_array($event, SupportEvents::getListenerEventNames($this), true)
            ? SupportEvents::getListenerMethodName($this, $event)
            : null;
    }
}
