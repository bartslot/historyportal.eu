<?php

declare(strict_types=1);

namespace Tests\Feature\Predict;

use App\Livewire\Wizard\Step3SceneConfigurator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class PredictEditorTest extends TestCase
{
    use BuildsPredictLesson, RefreshDatabase;

    public function test_the_teacher_places_a_predict_moment_and_the_lesson_type_stays(): void
    {
        $lesson = $this->predictLesson();
        $lesson->update(['game_type' => null]);
        $story = $lesson->scenes()->where('kind', 'narration')->orderBy('order')->first();

        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $story->id)
            ->call('addScene', 'game', 'predict')
            ->assertSeeHtml('data-predict-inspector');

        $added = $lesson->scenes()->where('game_type', 'predict')->latest('id')->first();
        $this->assertSame($story->order + 1, $added->order);   // right after the selected scene
        $this->assertSame('paper', $added->config['predict']['mode']);
        $this->assertNull($lesson->fresh()->game_type);
    }

    public function test_question_rubric_and_debrief_are_edited_and_cleaned_on_the_server(): void
    {
        $lesson = $this->predictLesson();
        $scene = $this->predictScene($lesson);

        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('selectScene', $scene->id)
            ->assertSet('predictDraft.debrief', 'Why did the harvest fall?')
            ->set('predictDraft.question', '<script>x</script>What will the farmers do?')
            ->set('predictDraft.rubric.key_cause', 'Salt stays when water evaporates.')
            ->call('savePredictDraft')
            ->call('addPredictRow', 'misconceptions')
            ->set('predictDraft.rubric.misconceptions.1', 'The river was cursed.')
            ->call('savePredictDraft')
            ->call('removePredictRow', 'concepts', 0)
            ->call('setPredictMode', 'typed')
            ->call('setPredictMode', 'hologram');

        $predict = $scene->fresh()->config['predict'];
        $this->assertSame('xWhat will the farmers do?', $predict['question']);
        $this->assertSame('Salt stays when water evaporates.', $predict['rubric']['key_cause']);
        $this->assertSame(['The gods were angry.', 'The river was cursed.'], $predict['rubric']['misconceptions']);
        $this->assertSame(['the soil goes bad', 'water evaporates'], $predict['rubric']['concepts']);
        $this->assertSame('typed', $predict['mode']);
        $this->assertSame('The harvest fell year after year, and the fields turned white.', $predict['outcome']);
    }

    public function test_switching_a_game_scene_to_predict_and_back_keeps_the_moment(): void
    {
        $lesson = $this->predictLesson();
        $scene = $this->predictScene($lesson);

        Livewire::actingAs($this->teacher)
            ->test(Step3SceneConfigurator::class, ['lesson' => $lesson])
            ->call('setSceneGameType', $scene->id, 'quiz')
            ->call('setSceneGameType', $scene->id, 'predict');

        $this->assertSame('predict', $scene->fresh()->game_type);
        $this->assertSame('Why did the harvest fall?', $scene->fresh()->config['predict']['debrief']);
    }
}
