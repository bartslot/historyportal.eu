<?php

declare(strict_types=1);

namespace Tests\Feature\Lessons;

use Tests\TestCase;

/**
 * The Dante lesson is one visual skeleton shared by four languages. Each thin spec must merge into
 * a full composer spec, and a text file out of step with the skeleton must fail, not half-build.
 */
class DanteSpecTest extends TestCase
{
    private const IDS = [
        'pre-quiz', 'firenze-1265', 'poesia-beatrice', 'il-foglio', 'campaldino-1289', 'mappa-fazioni', 'priore-1300',
        'esilio-1302', 'mappa-esilio', 'commedia-nasce', 'commedia-galleria', 'volgare', 'ravenna-1321',
        'eredita', 'post-quiz',
    ];

    public function test_every_language_spec_merges_into_fifteen_scenes(): void
    {
        foreach (['it', 'en', 'nl', 'de'] as $lang) {
            $spec = require resource_path("lessons/dante-{$lang}.php");
            $text = require resource_path("lessons/dante/text/{$lang}.php");

            $this->assertSame("Dante Alighieri ({$lang})", $spec['key']);
            $this->assertSame($lang, $spec['language']);
            $this->assertSame('dante', $spec['translation_group']);
            $this->assertSame('history', $spec['subject']);
            $this->assertSame($text['title'], $spec['title']);
            $this->assertSame($text['grade_level'], $spec['grade_level']);
            $this->assertCount(15, $spec['scenes']);
            $this->assertSame(['quiz', 'pre'], [$spec['scenes'][0]['type'], $spec['scenes'][0]['when']]);
            $this->assertSame(['quiz', 'post'], [$spec['scenes'][14]['type'], $spec['scenes'][14]['when']]);
            $this->assertSame($text['scenes']['firenze-1265']['script'], $spec['scenes'][1]['script']);
            $this->assertNotEmpty($spec['scenes'][0]['questions']);

            // The scene told in lines: every character who speaks has a voice in this language.
            $lines = $spec['scenes'][3]['lines'];
            $this->assertCount(12, $lines);
            foreach ($lines as [$speaker]) {
                if ($speaker !== 'narrator') {
                    $this->assertNotEmpty($spec['cast'][$speaker]['voice'][$lang] ?? null, "{$speaker} has no {$lang} voice");
                }
            }
        }
    }

    public function test_map_labels_merge_words_with_coordinates(): void
    {
        $spec = require resource_path('lessons/dante-en.php');
        $text = require resource_path('lessons/dante/text/en.php');
        $map = $spec['scenes'][5];

        $this->assertSame('map', $map['type']);
        $this->assertSame('Q38', $map['qid']);
        $this->assertContains([$text['scenes']['mappa-fazioni']['labels']['firenze'], 11.2558, 43.7696], $map['labels']);
        $this->assertCount(6, $map['labels']);
        $this->assertCount(7, $spec['scenes'][8]['labels']);
    }

    public function test_a_text_missing_a_skeleton_scene_throws(): void
    {
        $build = require resource_path('lessons/dante/spec.php');
        $text = require resource_path('lessons/dante/text/en.php');
        unset($text['scenes']['volgare']);

        $this->expectException(\UnexpectedValueException::class);
        $this->expectExceptionMessageMatches('/volgare/');

        $build('en', $text);
    }

    public function test_a_text_with_an_extra_scene_throws(): void
    {
        $build = require resource_path('lessons/dante/spec.php');
        $text = require resource_path('lessons/dante/text/en.php');
        $text['scenes']['stray'] = ['script' => 'x'];

        $this->expectException(\UnexpectedValueException::class);
        $this->expectExceptionMessageMatches('/stray/');

        $build('en', $text);
    }

    public function test_the_skeleton_order_is_the_scene_order(): void
    {
        $skeleton = require resource_path('lessons/dante/scenes.php');

        $this->assertSame(self::IDS, array_keys($skeleton));
    }
}
