<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Enums\LessonStatus;
use App\Livewire\Admin\ArtLibrary;
use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class ArtLibraryTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private SvgAsset $dante;

    private SvgAsset $beatrice;

    private SvgAsset $olive;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);
        $this->dante = $this->bundled('history-line', 'figures', 'dante', 'dante-giovane', 'Dante giovane');
        $this->beatrice = $this->bundled('history-line', 'figures', 'dante', 'beatrice', 'Beatrice');
        $this->olive = $this->bundled('history-line', 'nature', 'trees', 'olive-tree', 'Olive tree');
        $this->bundled('line-art', 'Civilisations', 'Egyptians', 'pharaoh', 'Pharaoh', 'svg');
    }

    private function bundled(string $collection, string $category, string $subcategory, string $slug, string $title, string $ext = 'webp'): SvgAsset
    {
        $ref = "{$collection}/{$category}/{$subcategory}/{$slug}.{$ext}";

        return SvgAsset::create([
            'user_id' => null, 'source' => 'bundled', 'source_ref' => $ref, 'source_url' => '',
            'collection' => $collection, 'category' => $category, 'subcategory' => $subcategory,
            'title' => $title, 'license' => 'Royalty-free (commercial)',
            'svg_path' => 'svg-assets/library/'.$ref, 'width' => 1024, 'height' => 1536,
        ]);
    }

    private function lessonWithScenes(int $scenes, int $assetId): Lesson
    {
        $lesson = Lesson::create([
            'teacher_id' => $this->admin->id, 'topic' => 'Dante', 'subject' => 'history',
            'grade_level' => 'K-7', 'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);

        for ($i = 1; $i <= $scenes; $i++) {
            Scene::create([
                'lesson_id' => $lesson->id, 'order' => $i, 'kind' => 'narration', 'status' => 'ready',
                'shots' => [['order' => 0, 'layers' => [['asset_id' => $assetId, 'x' => 50, 'y' => 50]]]],
            ]);
        }

        return $lesson;
    }

    public function test_a_non_admin_is_refused(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'teacher']))
            ->get(route('admin.art'))
            ->assertForbidden();
    }

    public function test_an_admin_sees_the_bundled_assets_of_the_first_collection(): void
    {
        $this->actingAs($this->admin)
            ->get(route('admin.art'))
            ->assertOk()
            ->assertSee('Dante giovane')
            ->assertSee('dante-giovane.webp')
            ->assertDontSee('Pharaoh');
    }

    public function test_the_tabs_lead_with_history_line_and_carry_counts(): void
    {
        $tabs = Livewire::actingAs($this->admin)->test(ArtLibrary::class)->instance()->collections();

        $this->assertSame(['history-line' => 3, 'line-art' => 1], $tabs);
    }

    public function test_it_filters_by_category_and_by_search(): void
    {
        $page = Livewire::actingAs($this->admin)->test(ArtLibrary::class);

        $this->assertSame(['Olive tree'], $page->set('category', 'nature')->instance()->assets()->pluck('title')->all());

        $page->set('category', '')->set('search', 'beat');
        $this->assertSame(['Beatrice'], $page->instance()->assets()->pluck('title')->all());

        // The slug in the file name counts as well as the title.
        $page->set('search', 'giovane');
        $this->assertSame(['Dante giovane'], $page->instance()->assets()->pluck('title')->all());
    }

    public function test_reuse_counts_distinct_lessons_and_scenes(): void
    {
        $this->lessonWithScenes(2, $this->dante->id);
        $this->lessonWithScenes(1, $this->dante->id);

        $reuse = Livewire::actingAs($this->admin)->test(ArtLibrary::class)->instance()->reuse();

        $this->assertSame(['lessons' => 2, 'scenes' => 3], array_intersect_key($reuse[$this->dante->id], ['lessons' => 1, 'scenes' => 1]));
        $this->assertArrayNotHasKey($this->beatrice->id, $reuse);
    }

    public function test_a_teachers_own_import_is_not_listed(): void
    {
        SvgAsset::create([
            'user_id' => $this->admin->id, 'source' => 'bundled', 'source_ref' => 'history-line/figures/dante/mine.webp',
            'source_url' => '', 'collection' => 'history-line', 'category' => 'figures', 'subcategory' => 'dante',
            'title' => 'My private sketch', 'license' => 'CC0', 'svg_path' => 'svg-assets/1/mine.webp',
        ]);

        $this->actingAs($this->admin)->get(route('admin.art'))->assertOk()->assertDontSee('My private sketch');
    }

    public function test_the_preview_lists_the_lessons_using_the_asset(): void
    {
        $lesson = $this->lessonWithScenes(1, $this->dante->id);

        Livewire::actingAs($this->admin)->test(ArtLibrary::class)
            ->call('preview', $this->dante->id)
            ->assertSet('previewId', $this->dante->id)
            ->assertSee(route('teacher.lessons.wizard', $lesson));
    }

    public function test_a_crafted_collection_never_reaches_the_file_system(): void
    {
        // A client write to the collection is refused outright.
        $this->expectException(\Livewire\Features\SupportLockedProperties\CannotUpdateLockedPropertyException::class);

        Livewire::actingAs($this->admin)->test(ArtLibrary::class)->set('collection', '../../x');
    }

    public function test_an_unknown_collection_falls_back_to_the_first_one(): void
    {
        $page = Livewire::actingAs($this->admin)->withQueryParams(['collection' => '../../x'])->test(ArtLibrary::class);
        $page->assertSet('collection', 'history-line');

        $page->call('selectCollection', '../../x')->assertSet('collection', 'history-line');
        $page->call('selectCollection', 'line-art')->assertSet('collection', 'line-art');

        // Even with the property forced past the guards, credits() reads nothing outside
        // resources/icons: a real credits.json one level up (collection '..') is never opened.
        $outside = resource_path('credits.json');
        file_put_contents($outside, json_encode(['leak' => [['credit' => 'outside', 'license' => 'x']]]));

        try {
            $component = $page->instance();
            $component->collection = '..';
            unset($component->credits);
            $this->assertSame([], $component->credits());
        } finally {
            @unlink($outside);
        }
    }
}
