<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Models\Corpus\Topic;
use Illuminate\Database\QueryException;
use Tests\TestCase;

/** A corpus that is DOWN (not just a dropped connection) must not 500 the page that asked. */
class TopicResilientTest extends TestCase
{
    private function corpusDown(): callable
    {
        return fn () => throw new QueryException('pgsql_corpus', 'select 1', [], new \PDOException('tenant/user not found'));
    }

    public function test_returns_the_fallback_when_the_retry_also_fails(): void
    {
        $this->assertSame([], Topic::resilient($this->corpusDown(), []));
    }

    public function test_a_null_fallback_counts_as_a_fallback(): void
    {
        $this->assertNull(Topic::resilient($this->corpusDown(), null));
    }

    public function test_still_throws_without_a_fallback(): void
    {
        $this->expectException(QueryException::class);
        Topic::resilient($this->corpusDown());
    }
}
