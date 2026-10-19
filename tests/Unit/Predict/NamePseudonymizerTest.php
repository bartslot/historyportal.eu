<?php

declare(strict_types=1);

namespace Tests\Unit\Predict;

use App\Services\Predict\NamePseudonymizer;
use PHPUnit\Framework\TestCase;

class NamePseudonymizerTest extends TestCase
{
    private NamePseudonymizer $names;

    protected function setUp(): void
    {
        parent::setUp();
        $this->names = new NamePseudonymizer('test-secret');
    }

    public function test_the_pupils_own_name_goes_whatever_its_case_and_comes_back_in_feedback(): void
    {
        $out = $this->names->replace('ik denk dat sanne gelijk had, zei Sanne', ['Sanne']);
        $id = $this->names->childId('Sanne');

        $this->assertStringNotContainsStringIgnoringCase('sanne', $out['text']);
        $this->assertSame("ik denk dat {$id} gelijk had, zei {$id}", $out['text']);
        $this->assertSame("Goed, Sanne.", NamePseudonymizer::restore("Goed, {$id}.", $out['map']));
    }

    public function test_a_roster_name_and_its_first_name_alone_are_replaced(): void
    {
        $out = $this->names->replace('Daan said the salt stays. Daan B. agrees.', ['Daan B.']);

        $this->assertStringNotContainsString('Daan', $out['text']);
        $this->assertStringContainsString('the salt stays', $out['text']);
    }

    public function test_family_and_friend_cues_catch_a_name_at_the_start_too(): void
    {
        $out = $this->names->replace('Tim says so. My brother Tim thinks the water dries up.');

        $this->assertStringNotContainsString('Tim', $out['text']);
        $this->assertSame($this->names->childId('tim'), array_key_first($out['map']));
    }

    public function test_dutch_and_german_cues(): void
    {
        $nl = $this->names->replace('mijn zus Noor zegt dat het zout blijft', [], [], 'nl');
        $de = $this->names->replace('Mein Bruder Lukas sagt, das Wasser verdunstet', [], [], 'de');

        $this->assertStringNotContainsString('Noor', $nl['text']);
        $this->assertStringNotContainsString('Lukas', $de['text']);
        $this->assertStringContainsString('Wasser', $de['text']);   // German nouns are not names
    }

    public function test_a_capitalised_word_mid_sentence_goes_unless_the_lesson_uses_it(): void
    {
        $out = $this->names->replace('Because Tasman sailed on, and then Femke laughed.', [], ['Tasman', 'Batavia']);

        $this->assertStringContainsString('Tasman', $out['text']);
        $this->assertStringNotContainsString('Femke', $out['text']);
        $this->assertStringStartsWith('Because', $out['text']);   // a sentence start is no evidence
    }

    public function test_a_name_starting_a_sentence_goes_and_an_everyday_or_lesson_word_stays(): void
    {
        $out = $this->names->replace('Tim says the gods were angry. The salt stays. Water dries up. Omdat Noor het zegt.', [], ['water']);

        $this->assertStringNotContainsString('Tim', $out['text']);
        $this->assertStringNotContainsString('Noor', $out['text']);
        $this->assertStringContainsString('The salt stays. Water dries up. Omdat', $out['text']);
    }

    public function test_acronyms_and_the_word_i_stay(): void
    {
        $out = $this->names->replace('I think the VOC wanted money, and I agree.');

        $this->assertSame('I think the VOC wanted money, and I agree.', $out['text']);
        $this->assertSame([], $out['map']);
    }

    public function test_emails_and_phone_numbers_are_removed(): void
    {
        $out = $this->names->replace('mail me at tim.k@example.com or 06-12345678');

        $this->assertSame('mail me at [email] or [number]', $out['text']);
    }

    public function test_the_same_name_is_the_same_id_in_every_answer(): void
    {
        $this->assertSame($this->names->childId('Tim'), $this->names->childId(' tim '));
        $this->assertNotSame($this->names->childId('Tim'), $this->names->childId('Tom'));
        $this->assertMatchesRegularExpression('/^child_[0-9a-f]{6}$/', $this->names->childId('Tim'));
        $this->assertNotSame((new NamePseudonymizer('other'))->childId('Tim'), $this->names->childId('Tim'));
    }
}
