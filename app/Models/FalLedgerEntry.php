<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One paid fal.ai art call. See App\Services\Art\FalLedger. */
class FalLedgerEntry extends Model
{
    protected $table = 'fal_ledger';

    protected $fillable = [
        'model', 'purpose', 'command', 'lesson_id', 'request_id',
        'estimated_usd', 'status', 'error', 'meta',
    ];

    protected function casts(): array
    {
        return [
            'meta' => 'array',
            'estimated_usd' => 'float',
        ];
    }
}
