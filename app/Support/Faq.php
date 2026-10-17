<?php

declare(strict_types=1);

namespace App\Support;

/**
 * The questions a teacher asks before trying History Portal, answered once. The same list feeds the
 * visible FAQ (<x-landing.faq>, on the homepage and /about) and the FAQPage structured data, so what
 * a search engine quotes is word for word what the page says.
 *
 * Every answer is true today and says no more: no prices and no "free" beyond what the product does
 * now (the Boardroom verdict of 2026-10-14: test a paid offer, do not sell one yet). Cost points at
 * the pricing section instead. Facts about data come from resources/views/legal/privacy.blade.php;
 * change that page and this one together.
 */
final class Faq
{
    /**
     * @return list<array{question: string, answer: string, link: ?array{text: string, url: string}}>
     */
    public static function items(): array
    {
        return [
            self::item(
                __('Does it cost anything?'),
                __('Your class plays lessons in the browser for free, without accounts.'),
                __('See the plans'),
                Seo::url('home').'#pricing',
            ),
            self::item(
                __('Do my pupils need an account?'),
                __('No. They join with the class code or QR code and type a first name or a nickname. We never ask for a pupil\'s email address.'),
            ),
            self::item(
                __('Does it work on school wifi and on phones?'),
                __('Lessons play in any modern browser, on the board, a laptop or a phone, with nothing to install. Some school filters block new websites; if yours does, ask IT to allow historyportal.eu.'),
            ),
            self::item(
                __('Is it made with AI?'),
                __('AI helps write the first draft from real sources, such as Wikipedia, and is told to use only facts from them. You read and change everything, and nothing reaches your class until you publish it.'),
            ),
            self::item(
                __('What happens to our data?'),
                __('We do not sell data, show ads or use tracking cookies. You can download or delete your account and everything in it at any time.'),
                __('Read the privacy policy'),
                route('privacy'),
            ),
            self::item(
                __('Which languages does it speak?'),
                __('English, Dutch, German, French and Italian.'),
            ),
            self::item(
                __('Who makes History Portal?'),
                __('The Learning Portal, a small company in Utrecht, the Netherlands. Questions go to info@historyportal.eu and are answered by a person.'),
            ),
        ];
    }

    /** The FAQPage node for a page's @graph: question and answer exactly as shown (a link is not part of the answer). */
    public static function graphNode(): array
    {
        return [
            '@type' => 'FAQPage',
            'mainEntity' => array_map(fn (array $item) => [
                '@type' => 'Question',
                'name' => $item['question'],
                'acceptedAnswer' => [
                    '@type' => 'Answer',
                    'text' => $item['answer'],
                ],
            ], self::items()),
        ];
    }

    /** @return array{question: string, answer: string, link: ?array{text: string, url: string}} */
    private static function item(string $question, string $answer, ?string $linkText = null, ?string $url = null): array
    {
        return [
            'question' => $question,
            'answer' => $answer,
            'link' => $linkText !== null && $url !== null ? ['text' => $linkText, 'url' => $url] : null,
        ];
    }
}
