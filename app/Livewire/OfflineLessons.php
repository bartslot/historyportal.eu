<?php

declare(strict_types=1);

namespace App\Livewire;

use App\Models\OfflineCopy;
use App\Services\OfflineSync\LocalCopy;
use App\Services\OfflineSync\RemoteSite;
use Livewire\Attributes\Computed;
use Livewire\Attributes\Title;
use Livewire\Attributes\Url;
use Livewire\Attributes\Validate;
use Livewire\Component;
use RuntimeException;

/**
 * Offline lessons, on the laptop's own History Portal (Bart, 2026-11-28): sign in to the live site once,
 * take a lesson offline before a flight, edit it here with every tool, and bring it back online after.
 * A scene that changed on both sides gets a card: keep mine, keep theirs, or keep both.
 *
 * The work is App\Services\OfflineSync\LocalCopy; the same steps run from the terminal as lessons:pull and
 * lessons:push. The live site has no OFFLINE_SYNC_REMOTE, so this page is not there.
 */
#[Title('Offline lessons')]
class OfflineLessons extends Component
{
    #[Validate('required|email')]
    public string $email = '';

    #[Validate('required|string')]
    public string $password = '';

    /** The copy the editor sent us here for (?lesson=<local id>). */
    #[Url(as: 'lesson')]
    public ?int $focus = null;

    /** @var list<array<string, mixed>> */
    public array $remoteLessons = [];

    /** Conflicts per copy id, from the last Bring back online. @var array<int, list<array<string, mixed>>> */
    public array $conflicts = [];

    /** The teacher's answers per copy id: scene id (or "lesson") => mine | theirs | both. @var array<int, array<string, string>> */
    public array $answers = [];

    public ?string $notice = null;

    public ?string $problem = null;

    public function mount(RemoteSite $remote): void
    {
        abort_unless($remote->enabled(), 404);
        $this->email = (string) ($remote->account()['email'] ?? auth()->user()->email);
    }

    #[Computed]
    public function account(): ?array
    {
        return app(RemoteSite::class)->account();
    }

    #[Computed]
    public function host(): string
    {
        return app(RemoteSite::class)->host();
    }

    /** This account's copies on this laptop, with what changed here since the last sync. */
    #[Computed]
    public function copies(): array
    {
        $user = auth()->user();
        $local = app(LocalCopy::class);

        return OfflineCopy::query()->with('lesson')->latest('synced_at')->get()
            ->filter(fn (OfflineCopy $c) => $c->lesson !== null && $user->canEdit($c->lesson))
            ->map(function (OfflineCopy $c) use ($local) {
                $changes = $local->changes($c);

                return [
                    'id' => $c->id,
                    'lesson_id' => $c->lesson_id,
                    'title' => $c->lesson->title,
                    'code' => $c->remote_code,
                    'holds' => $c->holds_claims,
                    'synced_at' => $c->synced_at,
                    'changed' => count($changes['edited']) + count($changes['added']) + count($changes['deleted']),
                    'lesson_changed' => $changes['lesson'],
                ];
            })->values()->all();
    }

    public function signIn(RemoteSite $remote): void
    {
        $this->validate();
        $this->attempt(function () use ($remote) {
            $name = $remote->login($this->email, $this->password);
            $this->notice = __('Signed in to :site as :name.', ['site' => $remote->host(), 'name' => $name]);
            $this->loadRemote(app(LocalCopy::class));
        });
        $this->password = '';
        unset($this->account);
    }

    public function signOut(RemoteSite $remote): void
    {
        $remote->logout();
        $this->remoteLessons = [];
        unset($this->account);
    }

    public function loadRemote(LocalCopy $local): void
    {
        $this->attempt(fn () => $this->remoteLessons = $local->remoteLessons());
    }

    /** Copy the lesson here and hold its scenes on the live site. */
    public function takeOffline(string $code, LocalCopy $local): void
    {
        $this->attempt(function () use ($code, $local) {
            set_time_limit(0);
            $result = $local->pull($code, auth()->user(), claim: true);
            $this->notice = $result['busy'] === []
                ? __('":title" is on this computer. You can edit it without a connection.', ['title' => $result['copy']->lesson->title])
                : __('":title" is on this computer. :n scenes were being edited by someone else and are not held for you.', [
                    'title' => $result['copy']->lesson->title, 'n' => count($result['busy']),
                ]);
        });
        unset($this->copies);
    }

    /** Fetch what changed on the live site; scenes edited here stay as they are. */
    public function refresh(int $copyId, LocalCopy $local): void
    {
        $copy = $this->copy($copyId);
        $this->attempt(function () use ($copy, $local) {
            set_time_limit(0);
            $local->pull($copy->remote_code, auth()->user(), claim: false);
            $this->notice = __('Up to date with :site.', ['site' => $this->host]);
        });
        unset($this->copies);
    }

    public function answer(int $copyId, string $key, string $answer): void
    {
        if (in_array($answer, ['mine', 'theirs', 'both'], true)) {
            $this->answers[$copyId][$key] = $answer;
        }
    }

    public function bringOnline(int $copyId, LocalCopy $local): void
    {
        $copy = $this->copy($copyId);
        $this->attempt(function () use ($copy, $local, $copyId) {
            set_time_limit(0);
            $result = $local->push($copy, auth()->user(), $this->answers[$copyId] ?? []);
            if (isset($result['conflicts'])) {
                $this->conflicts[$copyId] = $result['conflicts'];

                return;
            }
            unset($this->conflicts[$copyId], $this->answers[$copyId]);
            $this->notice = __('":title" is back online.', ['title' => $copy->lesson->title]);
        });
        unset($this->copies);
    }

    /** Every conflict of this copy has an answer, so Bring back online can try again. */
    public function answered(int $copyId): bool
    {
        foreach ($this->conflicts[$copyId] ?? [] as $c) {
            if (! isset($this->answers[$copyId][(string) $c['key']])) {
                return false;
            }
        }

        return true;
    }

    private function copy(int $id): OfflineCopy
    {
        $copy = OfflineCopy::query()->with('lesson')->findOrFail($id);
        abort_unless($copy->lesson !== null && auth()->user()->canEdit($copy->lesson), 403);

        return $copy;
    }

    private function attempt(callable $work): void
    {
        $this->notice = null;
        $this->problem = null;
        try {
            $work();
        } catch (RuntimeException $e) {
            $this->problem = $e->getMessage();
        } catch (\Illuminate\Http\Client\RequestException $e) {
            $this->problem = __(':site answered with an error (:status). Try again in a moment.', ['site' => $this->host, 'status' => $e->response->status()]);
        }
    }

    public function render()
    {
        return view('livewire.offline-lessons');
    }
}
