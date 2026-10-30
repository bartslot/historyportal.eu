<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\ImageRestyle;
use App\Services\Art\ImageRestyler;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * One pass of a History Lines restyle: pass 1 draws the ink, pass 2 (dispatched by pass 1 once the ink
 * is stored) colours that ink. One try only: a retry would pay for the picture twice.
 */
class RestyleImage implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 240;

    public function __construct(public readonly int $restyleId, public readonly int $pass = 1) {}

    public function handle(ImageRestyler $restyler): void
    {
        $row = ImageRestyle::find($this->restyleId);
        if ($row === null || ! in_array($row->status, [ImageRestyle::QUEUED, ImageRestyle::RUNNING], true) || $row->step >= $this->pass) {
            return;
        }
        $this->pass === 1 ? $restyler->runInk($row) : $restyler->runColour($row);
    }
}
