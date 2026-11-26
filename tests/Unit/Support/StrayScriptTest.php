<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\StrayScript;
use PHPUnit\Framework\TestCase;

class StrayScriptTest extends TestCase
{
    public function test_the_chinese_word_in_the_marco_polo_subtitle_is_found(): void
    {
        $this->assertSame(['终于'], StrayScript::find('Toen Marco终于 terugkeerde naar Venetië, werden zijn verhalen', 'nl'));
    }

    public function test_accents_punctuation_and_digits_are_fine(): void
    {
        $this->assertSame([], StrayScript::find('Çà et là, «Il Milione» — 1295! Koeblai’s “gezant” ⟦0⟧ € ½', 'fr'));
    }

    public function test_a_script_the_source_line_uses_may_stay(): void
    {
        $this->assertSame([], StrayScript::find('De naam 北京 betekent noordelijke hoofdstad.', 'nl', 'The name 北京 means northern capital.'));
    }

    public function test_each_language_writes_in_its_own_scripts(): void
    {
        $this->assertSame([], StrayScript::find('马可·波罗 Marco Polo', 'zh'));
        $this->assertSame([], StrayScript::find('マルコ・ポーロは中国へ行った', 'ja'));
        $this->assertSame([], StrayScript::find('ماركو بولو', 'ar'));
        $this->assertSame(['Марко'], StrayScript::find('Marco Марко', 'de'));
        $this->assertSame(['ポーロ'], StrayScript::find('马可ポーロ', 'zh'));
    }
}
