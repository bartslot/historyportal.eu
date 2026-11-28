<?php

declare(strict_types=1);

namespace Tests\Feature\OfflineSync;

use App\Enums\LessonStatus;
use App\Models\Lesson;
use App\Models\LessonClaim;
use App\Models\OfflineCopy;
use App\Models\QuizQuestion;
use App\Models\Scene;
use App\Models\User;
use App\Services\Collaboration\LessonCollaboration;
use App\Services\OfflineSync\LocalCopy;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Editing a lesson offline (Bart, 2026-11-28). The laptop and the live site are the same app here: the
 * laptop's HTTP calls are routed back into this test's own app, so the copy is a second lesson in the same
 * database, with other scene ids, exactly as on a real laptop.
 */
class OfflineEditingTest extends TestCase
{
    use RefreshDatabase;

    private User $bart;

    private User $joey;

    private Lesson $live;

    private Scene $venice;

    private Scene $galley;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
        Storage::fake('local');
        config(['offline_sync.remote' => 'https://live.test', 'app.url' => 'https://live.test']);

        $this->bart = User::factory()->teacher()->create(['name' => 'Bart Slot']);
        $this->joey = User::factory()->teacher()->create(['name' => 'Joey']);
        $this->live = Lesson::create([
            'teacher_id' => $this->bart->id, 'title' => 'Marco Polo',
            'topic' => 'Marco Polo', 'subject' => 'history', 'grade_level' => '6',
            'image_style' => 'cinematic', 'status' => LessonStatus::ScenesReady,
        ]);
        $this->live->editors()->attach($this->joey->id);
        Storage::disk('public')->put('lessons/'.$this->live->id.'/venice.webp', 'VENICE');
        $this->venice = Scene::create(['lesson_id' => $this->live->id, 'order' => 1, 'kind' => 'narration', 'status' => 'ready',
            'script_segment' => 'Venice, 1271.', 'image_path' => 'lessons/'.$this->live->id.'/venice.webp']);
        $this->galley = Scene::create(['lesson_id' => $this->live->id, 'order' => 2, 'kind' => 'narration', 'status' => 'ready',
            'script_segment' => 'The ship.', 'config' => ['links' => [['label' => 'Back', 'to' => $this->venice->id]]]]);
        QuizQuestion::create(['lesson_id' => $this->live->id, 'scene_id' => $this->galley->id, 'order' => 1,
            'question' => 'Which city?', 'options' => ['Venice', 'Rome'], 'correct_index' => 0]);

        // The laptop's sign-in, and its HTTP calls answered by this app.
        Storage::disk('local')->put('offline-sync/token.json', json_encode([
            'remote' => 'https://live.test', 'token' => $this->bart->createToken('test')->plainTextToken,
            'email' => $this->bart->email, 'name' => 'Bart Slot',
        ]));
        Http::fake(fn (Request $request) => $this->answer($request));
    }

    private function answer(Request $request)
    {
        $path = (string) parse_url($request->url(), PHP_URL_PATH);
        if (str_starts_with($path, '/storage/')) {
            $file = rawurldecode(substr($path, 9));

            return Storage::disk('public')->exists($file) ? Http::response(Storage::disk('public')->get($file)) : Http::response('', 404);
        }
        $server = ['HTTP_AUTHORIZATION' => $request->header('Authorization')[0] ?? '', 'HTTP_ACCEPT' => 'application/json'];
        if ($request->isMultipart()) {
            $part = collect($request->data())->firstWhere('name', 'file');
            $tmp = tempnam(sys_get_temp_dir(), 'up');
            file_put_contents($tmp, is_resource($part['contents']) ? stream_get_contents($part['contents']) : $part['contents']);
            $response = $this->call('POST', $path, [], [], ['file' => new UploadedFile($tmp, $part['filename'], null, null, true)], $server);
        } elseif ($request->method() === 'GET') {
            parse_str((string) parse_url($request->url(), PHP_URL_QUERY), $query);
            $response = $this->call('GET', $path, $query, [], [], $server);
        } else {
            $response = $this->call($request->method(), $path, [], [], [], $server + ['CONTENT_TYPE' => 'application/json'], $request->body());
        }
        $this->app['auth']->forgetGuards();

        return Http::response($response->getContent(), $response->getStatusCode());
    }

    private function takeOffline(): OfflineCopy
    {
        return app(LocalCopy::class)->pull($this->live->lesson_code, $this->bart)['copy'];
    }

    private function localScene(OfflineCopy $copy, Scene $live): Scene
    {
        foreach ($copy->fresh()->base['scenes'] as $local => $entry) {
            if ($entry['remote_id'] === $live->id) {
                return Scene::findOrFail((int) $local);
            }
        }
        $this->fail('No local copy of scene '.$live->id);
    }

    public function test_the_api_is_only_for_people_who_may_edit_the_lesson(): void
    {
        $this->getJson(route('api.v1.offline.lessons.show', $this->live->lesson_code))->assertUnauthorized();
        $stranger = User::factory()->teacher()->create();
        $this->actingAs($stranger, 'sanctum')->getJson(route('api.v1.offline.lessons.show', $this->live->lesson_code))->assertForbidden();
        $this->actingAs($this->joey, 'sanctum')->getJson(route('api.v1.offline.lessons.show', $this->live->lesson_code))->assertOk();
    }

    public function test_taking_a_lesson_offline_copies_scenes_files_questions_and_links(): void
    {
        $copy = $this->takeOffline();

        $lesson = $copy->lesson;
        $this->assertNotSame($this->live->id, $lesson->id);
        $this->assertSame('Marco Polo', $lesson->title);
        $this->assertSame($this->bart->id, $lesson->teacher_id);
        $this->assertCount(2, $lesson->scenes);

        $venice = $this->localScene($copy, $this->venice);
        $galley = $this->localScene($copy, $this->galley);
        $this->assertSame('offline-copy/lessons/'.$this->live->id.'/venice.webp', $venice->image_path);
        $this->assertSame('VENICE', Storage::disk('public')->get($venice->image_path));
        $this->assertSame($venice->id, $galley->config['links'][0]['to'], 'the link points at the local scene');
        $this->assertSame('Which city?', QuizQuestion::where('scene_id', $galley->id)->value('question'));
        $this->assertSame([], app(LocalCopy::class)->changes($copy->fresh())['edited'], 'a fresh copy has no edits');
    }

    public function test_offline_scenes_stay_held_on_the_live_site_until_the_lesson_comes_back(): void
    {
        $copy = $this->takeOffline();
        $collab = app(LessonCollaboration::class);
        $target = LessonCollaboration::sceneTarget($this->venice->id);

        $this->travel(5)->minutes();
        $this->assertSame('Bart Slot', $collab->heldByOther($this->live, $this->joey, $target));
        $this->assertNotSame($this->joey->id, $collab->claim($this->live, $this->joey, $target));
        $this->assertTrue($collab->room($this->live, $this->joey, $target)['holder']['offline']);

        // Bart opening the live editor on another scene does not let go of the offline ones.
        $collab->ping($this->live, $this->bart, LessonCollaboration::sceneTarget($this->galley->id));
        $this->assertSame('Bart Slot', $collab->heldByOther($this->live, $this->joey, $target));

        app(LocalCopy::class)->push($copy->fresh(), $this->bart);
        $this->assertNull($collab->heldByOther($this->live, $this->joey, $target));
        $this->assertFalse(LessonClaim::whereNotNull('offline_until')->exists());
    }

    public function test_edits_made_offline_go_back_scene_by_scene(): void
    {
        $copy = $this->takeOffline();
        $venice = $this->localScene($copy, $this->venice);
        $venice->update(['script_segment' => 'Venice, written on a plane.']);
        Storage::disk('public')->put('lessons/'.$copy->lesson_id.'/new.webp', 'DRAWN OFFLINE');
        $venice->update(['config' => ['layers' => [['src' => '/storage/lessons/'.$copy->lesson_id.'/new.webp']]]]);
        $added = Scene::create(['lesson_id' => $copy->lesson_id, 'order' => 3, 'kind' => 'narration', 'status' => 'ready',
            'script_segment' => 'Made offline.', 'config' => ['links' => [['label' => 'Start', 'to' => $venice->id]]]]);

        $result = app(LocalCopy::class)->push($copy->fresh(), $this->bart);

        $this->assertSame(['pushed' => 3], $result, 'two scenes and the order');
        $this->venice->refresh();
        $this->assertSame('Venice, written on a plane.', $this->venice->script_segment);
        $this->assertSame('lessons/'.$this->live->id.'/venice.webp', $this->venice->image_path, 'a pulled file goes back to its own path');
        $uploaded = ltrim(substr($this->venice->config['layers'][0]['src'], strlen('/storage/')), '/');
        $this->assertStringStartsWith('lessons/'.$this->live->id.'/offline/', $uploaded);
        $this->assertSame('DRAWN OFFLINE', Storage::disk('public')->get($uploaded));

        $new = $this->live->scenes()->where('script_segment', 'Made offline.')->firstOrFail();
        $this->assertSame(3, $new->order);
        $this->assertSame($this->venice->id, $new->config['links'][0]['to'], 'links get live ids');
        $this->assertSame('ready', $new->status);
        $this->assertSame([], app(LocalCopy::class)->changes($copy->fresh())['added'], 'the copy knows the new scene now');
        $this->assertSame($added->id, $this->localScene($copy, $new)->id, 'and keeps its local id');
    }

    public function test_a_scene_changed_on_both_sides_is_a_conflict_and_nothing_is_written(): void
    {
        $copy = $this->takeOffline();
        $this->localScene($copy, $this->venice)->update(['script_segment' => 'Mine.']);
        $this->localScene($copy, $this->galley)->update(['script_segment' => 'Mine too.']);
        $this->venice->update(['script_segment' => 'Theirs.']);   // Joey took over while Bart was away

        $result = app(LocalCopy::class)->push($copy->fresh(), $this->bart);

        $this->assertCount(1, $result['conflicts']);
        $this->assertSame('changed', $result['conflicts'][0]['reason']);
        $this->assertSame('The ship.', $this->galley->fresh()->script_segment, 'nothing was written');

        // Keep both: mine is added right after theirs.
        $key = $result['conflicts'][0]['key'];
        $result = app(LocalCopy::class)->push($copy->fresh(), $this->bart, [$key => 'both']);

        $this->assertArrayNotHasKey('conflicts', $result);
        $this->assertSame(['Theirs.', 'Mine.', 'Mine too.'], $this->live->scenes()->pluck('script_segment')->all());
        $this->assertCount(3, $copy->fresh()->lesson->scenes, 'the copy now shows both too');
    }

    public function test_keep_mine_saves_the_version_it_replaces(): void
    {
        $copy = $this->takeOffline();
        $this->localScene($copy, $this->venice)->update(['script_segment' => 'Mine.']);
        $this->venice->update(['script_segment' => 'Theirs.']);
        $key = app(LocalCopy::class)->push($copy->fresh(), $this->bart)['conflicts'][0]['key'];

        app(LocalCopy::class)->push($copy->fresh(), $this->bart, [$key => 'mine']);

        $this->assertSame('Mine.', $this->venice->fresh()->script_segment);
        $backups = Storage::disk('local')->files('offline-sync-backups/'.$this->live->id);
        $this->assertCount(1, $backups);
        $this->assertStringContainsString('Theirs.', Storage::disk('local')->get($backups[0]));
    }

    public function test_a_narration_that_arrived_meanwhile_is_not_a_conflict_and_is_kept(): void
    {
        $copy = $this->takeOffline();
        $this->localScene($copy, $this->venice)->update(['script_segment' => 'Mine.']);
        $this->venice->update(['audio_path' => 'lessons/'.$this->live->id.'/voice.mp3', 'duration_seconds' => 9]);

        $result = app(LocalCopy::class)->push($copy->fresh(), $this->bart);

        $this->assertArrayNotHasKey('conflicts', $result);
        $this->venice->refresh();
        $this->assertSame('Mine.', $this->venice->script_segment);
        $this->assertSame('lessons/'.$this->live->id.'/voice.mp3', $this->venice->audio_path);
    }

    public function test_get_latest_keeps_scenes_edited_offline(): void
    {
        $copy = $this->takeOffline();
        $mine = $this->localScene($copy, $this->venice);
        $mine->update(['script_segment' => 'Mine.']);
        $this->galley->update(['script_segment' => 'Fixed online.']);

        app(LocalCopy::class)->pull($this->live->lesson_code, $this->bart, claim: false);

        $this->assertSame('Mine.', $mine->fresh()->script_segment);
        $this->assertSame('Fixed online.', $this->localScene($copy, $this->galley)->script_segment);
        $this->assertSame([$mine->id], app(LocalCopy::class)->changes($copy->fresh())['edited']);
    }

    public function test_deleting_a_scene_offline_deletes_it_online(): void
    {
        $copy = $this->takeOffline();
        $this->localScene($copy, $this->galley)->delete();

        app(LocalCopy::class)->push($copy->fresh(), $this->bart);

        $this->assertSoftDeleted('scenes', ['id' => $this->galley->id]);
        $this->assertSame([$this->venice->id], $this->live->scenes()->pluck('id')->all());
    }

    public function test_a_file_upload_is_stored_once_by_its_content(): void
    {
        $this->actingAs($this->bart, 'sanctum');
        $url = route('api.v1.offline.lessons.media', $this->live->lesson_code);
        $a = $this->post($url, ['file' => UploadedFile::fake()->createWithContent('a.webp', 'SAME')], ['Accept' => 'application/json'])->assertOk()->json('path');
        $b = $this->post($url, ['file' => UploadedFile::fake()->createWithContent('b.webp', 'SAME')], ['Accept' => 'application/json'])->assertOk()->json('path');

        $this->assertSame($a, $b);
        $this->post($url, ['file' => UploadedFile::fake()->createWithContent('x.php', '<?php')], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->postJson(route('api.v1.offline.lessons.media.existing', $this->live->lesson_code), ['files' => [
            ['path' => $a, 'sha1' => sha1('SAME')], ['path' => $a, 'sha1' => sha1('OTHER')], ['path' => '../.env', 'sha1' => sha1('x')],
        ]])->assertOk()->assertJson(['existing' => [$a]]);
    }
}
