<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\ImageRestyle;
use App\Services\Art\ImageRestyler;
use Illuminate\Database\Eloquent\Model;

/**
 * The Restyle button's server side, shared by the inspector (scene picture) and the Assets drawer
 * (library tiles). The host component supplies restyleSubject() and restyleRefreshed().
 *
 * One toast per restyle: pollRestyle() runs while a job is in flight and stamps notified_at the
 * first time it reports done or failed.
 */
trait RestylesImages
{
    abstract protected function restyleSubject(string $kind, int $id): ?Model;

    /** The subject now shows another picture: redraw whatever shows it. */
    abstract protected function restyleRefreshed(Model $subject): void;

    public function restyle(string $kind, int $id, ImageRestyler $restyler): void
    {
        $subject = $this->restyleSubject($kind, $id);
        abort_if($subject === null, 404);

        $result = $restyler->request(auth()->user(), $subject);
        if (is_string($result)) {
            $this->dispatch('toast', message: $this->restyleRefusal($result), type: 'warning');
        }
    }

    public function keepRestyle(int $restyleId, ImageRestyler $restyler): void
    {
        $row = $this->ownedRestyle($restyleId);
        $restyler->keep($row);
        $this->restyleRefreshed($row->subject);
    }

    /** Undo: drop an unkept result, or put a kept one back to the original. */
    public function undoRestyle(int $restyleId, ImageRestyler $restyler): void
    {
        $row = $this->ownedRestyle($restyleId);
        $restyler->discard($row);
        $this->restyleRefreshed($row->subject);
    }

    /** "Back to original" on a kept restyle; the result stays so Keep can bring it back. */
    public function revertRestyle(int $restyleId, ImageRestyler $restyler): void
    {
        $row = $this->ownedRestyle($restyleId);
        $restyler->revert($row);
        $this->restyleRefreshed($row->subject);
    }

    /** wire:poll target while a restyle runs. */
    public function pollRestyle(int $restyleId): void
    {
        $row = ImageRestyle::find($restyleId);
        if ($row?->isStale() && (int) $row->user_id === (int) auth()->id()) {
            app(ImageRestyler::class)->expire($row);
            $row->refresh();
        }
        if ($row === null || $row->isActive() || $row->notified_at !== null || (int) $row->user_id !== (int) auth()->id()) {
            return;
        }
        $row->update(['notified_at' => now()]);
        if ($row->status === ImageRestyle::FAILED) {
            $this->dispatch('toast', message: $this->restyleFailure((string) $row->error_code), type: 'error');
        } else {
            $this->dispatch('toast', message: __('Restyled. Keep it or undo.'), type: 'success');
        }
    }

    private function ownedRestyle(int $id): ImageRestyle
    {
        $row = ImageRestyle::with('subject')->findOrFail($id);
        $restyler = app(ImageRestyler::class);
        abort_unless($row->subject !== null && $restyler->allows(auth()->user(), $row->subject), 403);

        return $row;
    }

    private function restyleRefusal(string $reason): string
    {
        return match ($reason) {
            ImageRestyler::BUSY => __('This picture is already being restyled.'),
            ImageRestyler::LIMIT => __('You have restyled a lot of pictures this hour. Try again a little later.'),
            ImageRestyler::UNSUPPORTED => __('This picture cannot be restyled.'),
            default => __('You cannot restyle this picture.'),
        };
    }

    private function restyleFailure(string $code): string
    {
        return match ($code) {
            'credits' => __('The image service is out of credits right now. Nothing was changed.'),
            'blocked' => __('The image service declined this picture. Nothing was changed.'),
            'busy' => __('The image service is busy. Try again in a minute. Nothing was changed.'),
            default => __('The restyle did not work. Nothing was changed.'),
        };
    }
}
