<?php

declare(strict_types=1);

namespace Tests\Unit\Assets;

use App\Services\Assets\SequenceImporter;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SequencePlanTest extends TestCase
{
    public function test_frames_are_ordered_by_number_not_alphabetically_and_grouped_by_clip(): void
    {
        $plan = SequenceImporter::plan(['sailor_walk_10.png', 'sailor_walk_9.png', 'Sailor_Wave_0001.webp', 'sailor_walk_8.png']);

        $this->assertSame('sailor', $plan['name']);
        $this->assertSame(['walk' => [3, 1, 0], 'wave' => [2]], $plan['clips']);
    }

    public function test_an_asset_name_may_contain_underscores(): void
    {
        $this->assertSame('dante_young', SequenceImporter::plan(['dante_young_walk_0001.png'])['name']);
    }

    /** @return array<string, array{list<string>, string}> */
    public static function badSequences(): array
    {
        return [
            'no number' => [['sailor_walk.png'], 'is not named name_clip_0001.webp'],
            'a gap' => [['sailor_walk_0001.png', 'sailor_walk_0003.png'], 'walk is missing frame 2'],
            'twice' => [['sailor_walk_0001.png', 'sailor_walk_001.png'], 'Frame 1 of walk is there twice'],
            'two assets' => [['sailor_walk_0001.png', 'dante_walk_0001.png'], 'more than one asset'],
            'nothing' => [[], 'Choose the frames of one animation'],
        ];
    }

    #[DataProvider('badSequences')]
    public function test_a_bad_sequence_is_refused_with_the_reason(array $names, string $reason): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage($reason);

        SequenceImporter::plan($names);
    }
}
