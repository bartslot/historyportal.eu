<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** One line of a test session's timeline. `t_ms` counts from the session start. */
class TestEvent extends Model
{
    /** What the recorder may send (resources/js/test-session/recorder.js). */
    public const TYPES = [
        'start', 'stop', 'viewport', 'route', 'click', 'rage_click', 'dead_click',
        'http_error', 'console_error', 'scene',
    ];

    public $timestamps = false;

    protected $fillable = ['test_session_id', 't_ms', 'type', 'payload'];

    protected function casts(): array
    {
        return ['t_ms' => 'integer', 'payload' => 'array'];
    }
}
