<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A picture the server asked ChatGPT on Bart's Mac for; see App\Services\Imaging\ImageRelay. */
class ImageRelayRequest extends Model
{
    public const PREPARING = 'preparing';

    public const QUEUED = 'queued';

    public const RUNNING = 'running';

    public const DONE = 'done';

    public const FAILED = 'failed';

    protected $fillable = ['status', 'prompt', 'size', 'transparent', 'inputs', 'result_path', 'error', 'claimed_at'];

    protected function casts(): array
    {
        return ['transparent' => 'boolean', 'inputs' => 'array', 'claimed_at' => 'datetime'];
    }

    /** Where this request's pictures live on the local disk. */
    public function dir(): string
    {
        return 'image-relay/'.$this->id;
    }
}
