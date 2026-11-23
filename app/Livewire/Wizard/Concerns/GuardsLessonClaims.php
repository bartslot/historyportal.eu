<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Lesson;
use App\Services\Collaboration\LessonCollaboration;
use Livewire\Attributes\On;
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
    /** @var array<string, array<string, string>> event name => method, per class */
    private static array $claimEventMethods = [];

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
        $target = $this->claimTarget();
        if ($lesson !== null && $user !== null && $target !== null) {
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

    /** The #[On('event')] method an event lands on, or null when this component does not listen for it. */
    private function claimMethodForEvent(string $event): ?string
    {
        $class = static::class;
        if (! isset(self::$claimEventMethods[$class])) {
            $map = [];
            foreach ((new \ReflectionClass($this))->getMethods(ReflectionMethod::IS_PUBLIC) as $method) {
                foreach ($method->getAttributes(On::class) as $attribute) {
                    $name = $attribute->getArguments()[0] ?? $attribute->getArguments()['event'] ?? null;
                    if (is_string($name)) {
                        $map[$name] = $method->getName();
                    }
                }
            }
            self::$claimEventMethods[$class] = $map;
        }

        return self::$claimEventMethods[$class][$event] ?? null;
    }
}
