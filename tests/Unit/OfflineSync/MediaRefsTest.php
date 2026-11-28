<?php

declare(strict_types=1);

namespace Tests\Unit\OfflineSync;

use App\Services\OfflineSync\MediaRefs;
use App\Services\OfflineSync\SyncFields;
use PHPUnit\Framework\TestCase;

/** Finding and renaming the files a lesson points at, and the fingerprint that ignores storage noise. */
class MediaRefsTest extends TestCase
{
    private array $row = [
        'image_path' => 'lessons/1/a.webp',
        'config' => ['layers' => [
            ['src' => '/storage/lessons/1/b.png?v=2'],
            ['src' => 'https://historyportal.eu/storage/library/venice/quay.webp'],
            ['src' => 'https://res.cloudinary.com/x/storage/z.png'],
            ['clip_path' => 'polygon(0 0, 10% 0)'],
            ['svg_path' => 'svg/q.svg'],
        ]],
        'title' => 'No files here',
    ];

    public function test_it_finds_disk_paths_in_columns_urls_and_nested_path_keys_on_our_hosts_only(): void
    {
        $this->assertSame(
            ['lessons/1/a.webp', 'lessons/1/b.png', 'library/venice/quay.webp', 'svg/q.svg'],
            MediaRefs::collect($this->row, ['historyportal.eu']),
        );
    }

    public function test_a_pull_moves_every_file_under_the_offline_prefix_and_a_push_takes_it_off_again(): void
    {
        $offline = MediaRefs::rewrite($this->row, fn (string $p) => MediaRefs::toOffline($p), ['historyportal.eu']);

        $this->assertSame('offline-copy/lessons/1/a.webp', $offline['image_path']);
        $this->assertSame('/storage/offline-copy/lessons/1/b.png?v=2', $offline['config']['layers'][0]['src']);
        $this->assertSame('/storage/offline-copy/library/venice/quay.webp', $offline['config']['layers'][1]['src'], 'our host becomes relative');
        $this->assertSame('https://res.cloudinary.com/x/storage/z.png', $offline['config']['layers'][2]['src'], 'another host is left alone');
        $this->assertSame('polygon(0 0, 10% 0)', $offline['config']['layers'][3]['clip_path']);

        $back = MediaRefs::rewrite($offline, fn (string $p) => MediaRefs::fromOffline($p) ?? $p, []);
        $this->assertSame('lessons/1/a.webp', $back['image_path']);
        $this->assertSame('/storage/library/venice/quay.webp', $back['config']['layers'][1]['src']);
    }

    public function test_paths_cannot_leave_the_disk(): void
    {
        $this->assertFalse(MediaRefs::isSafe('../../.env'));
        $this->assertFalse(MediaRefs::isSafe('/etc/passwd.txt'));
        $this->assertFalse(MediaRefs::isSafe('https://x.test/a.png'));
        $this->assertTrue(MediaRefs::isSafe('lessons/12/scenes/40/bg.webp'));
    }

    public function test_the_fingerprint_ignores_key_order_and_number_spelling(): void
    {
        $this->assertSame(
            SyncFields::hash(['config' => ['b' => 1.0, 'a' => '2'], 'x' => [3, 4]]),
            SyncFields::hash(['x' => [3, 4], 'config' => ['a' => 2, 'b' => 1]]),
        );
        $this->assertNotSame(SyncFields::hash(['x' => [3, 4]]), SyncFields::hash(['x' => [4, 3]]), 'list order is content');
    }
}
