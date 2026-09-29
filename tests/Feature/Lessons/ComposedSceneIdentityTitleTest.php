<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use App\Livewire\Wizard\Step3SceneConfigurator;
use App\Models\Lesson;
use App\Models\User;
use App\Services\LessonComposer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Livewire\Livewire;
use Tests\TestCase;

/**
 * The title above a scene's year must never be the spec `key` (a composed lesson's topic, e.g.
 * "Dante Alighieri (it)"): a composed scene is titled by its chapter.
 */
class ComposedSceneIdentityTitleTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        $this->teacher = User::factory()->create();
    }

    private function compose(): Lesson
    {
        return app(LessonComposer::class)->build([
            'key' => 'Dante Alighieri (it)',
            'title' => 'Dante Alighieri: la vita di un poeta in esilio',
            'scenes' => [
                ['type' => 'story', 'chapter' => 'Un bambino a Firenze', 'year' => '1265', 'location' => 'Firenze', 'script' => 'Siamo a Firenze.'],
                ['type' => 'story', 'script' => 'Senza capitolo.'],
                ['type' => 'story', 'chapter' => 'Nasce la Commedia', 'script' => 'Dante scrive.', 'extra_config' => ['identity_title' => 'Scelto a mano']],
            ],
        ], $this->teacher, narrate: false);
    }

    public function test_a_composed_scene_is_titled_by_its_chapter_not_the_spec_key(): void
    {
        $lesson = $this->compose();
        $scene = $lesson->scenes()->orderBy('order')->firstOrFail();

        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $scene->id)
            ->assertDispatched('scene:load', fn (string $e, array $p) => $p['payload']['identityTitle'] === 'Un bambino a Firenze');
    }

    public function test_a_scene_without_a_chapter_or_with_its_own_title_is_left_alone_and_recompose_is_idempotent(): void
    {
        $this->compose();
        $lesson = $this->compose();   // a rebuild finds the same lesson by teacher + topic

        $this->assertSame(1, Lesson::where('topic', 'Dante Alighieri (it)')->count());
        $titles = $lesson->scenes()->orderBy('order')->get()->map(fn ($s) => $s->config['identity_title'] ?? null)->all();
        $this->assertSame(['Un bambino a Firenze', null, 'Scelto a mano'], $titles);
    }
}
