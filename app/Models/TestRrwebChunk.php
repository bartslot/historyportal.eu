<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One 5-second batch of the rrweb DOM recording. A large batch (a full page snapshot) is stored as
 * base64 gzip; decoded() hides that.
 */
class TestRrwebChunk extends Model
{
    public const UPDATED_AT = null;

    /** Above this many bytes of JSON a chunk is gzipped. */
    public const GZIP_OVER_BYTES = 16_384;

    protected $fillable = ['test_session_id', 'seq', 'gzipped', 'events'];

    protected function casts(): array
    {
        return ['gzipped' => 'boolean', 'seq' => 'integer'];
    }

    /**
     * @param  array<int, mixed>  $events
     * @return array{gzipped: bool, events: string}
     */
    public static function encode(array $events): array
    {
        $json = json_encode($events, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

        return strlen($json) > self::GZIP_OVER_BYTES
            ? ['gzipped' => true, 'events' => base64_encode((string) gzencode($json, 6))]
            : ['gzipped' => false, 'events' => $json];
    }

    /** @return array<int, mixed> */
    public function decoded(): array
    {
        $json = $this->gzipped ? (string) gzdecode((string) base64_decode($this->events, true)) : $this->events;

        return json_decode($json, true, 512, JSON_THROW_ON_ERROR);
    }
}
