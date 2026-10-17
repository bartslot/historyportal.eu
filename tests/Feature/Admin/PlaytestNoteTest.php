<?php

declare(strict_types=1);

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PlaytestNoteTest extends TestCase
{
    use RefreshDatabase;

    private function note(array $overrides = []): array
    {
        $point = ['x' => 120, 'y' => 340, 'fx' => 0.1, 'fy' => 0.4, 'element' => [
            'selector' => 'main > button.btn.btn-primary', 'text' => 'Start', 'rect' => [100, 320, 80, 40],
        ]];

        return [
            'text' => 'deze knop is te klein',
            'url' => 'https://historyportal.eu/lesson/ABC123',
            'spoken_at' => '2026-10-15T10:00:00Z',
            'duration_ms' => 2100,
            'viewport' => [1280, 800],
            'scroll' => [0, 0],
            'start' => $point,
            'end' => $point,
            'visited' => ['main > button.btn.btn-primary'],
            'lang' => 'nl-NL',
            ...$overrides,
        ];
    }

    public function test_admin_note_is_appended_as_one_json_line_per_note(): void
    {
        Storage::fake('local');
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->postJson(route('admin.playtest-notes.store'), $this->note())->assertNoContent();
        $this->actingAs($admin)->postJson(route('admin.playtest-notes.store'), $this->note(['text' => 'tweede']))->assertNoContent();

        $lines = explode("\n", trim(Storage::disk('local')->get('playtests/'.now()->toDateString().'.jsonl')));
        $this->assertCount(2, $lines);
        $first = json_decode($lines[0], true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame('deze knop is te klein', $first['text']);
        $this->assertSame('main > button.btn.btn-primary', $first['start']['element']['selector']);
        $this->assertSame($admin->id, $first['user_id']);
    }

    public function test_teacher_cannot_post_notes(): void
    {
        Storage::fake('local');
        $teacher = User::factory()->create(['role' => 'teacher']);

        $this->actingAs($teacher)->postJson(route('admin.playtest-notes.store'), $this->note())->assertForbidden();
        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_guest_cannot_post_notes(): void
    {
        $this->postJson(route('admin.playtest-notes.store'), $this->note())->assertUnauthorized();
    }

    public function test_note_without_text_is_rejected(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->postJson(route('admin.playtest-notes.store'), $this->note(['text' => '']))
            ->assertUnprocessable()->assertJsonValidationErrors('text');
    }

    public function test_recorder_renders_for_admins_only(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'admin']))->get('/')->assertSee('id="hp-playtest"', false);
        $this->actingAs(User::factory()->create(['role' => 'teacher']))->get('/')->assertDontSee('id="hp-playtest"', false);
    }
}
