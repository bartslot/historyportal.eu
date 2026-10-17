<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\Faq;
use App\Support\Seo;
use Tests\TestCase;

class FaqTest extends TestCase
{
    public function test_the_structured_data_says_exactly_what_the_page_shows(): void
    {
        $node = Faq::graphNode();

        $this->assertSame('FAQPage', $node['@type']);
        $this->assertSame(
            array_map(fn (array $i) => [$i['question'], $i['answer']], Faq::items()),
            array_map(fn (array $q) => [$q['name'], $q['acceptedAnswer']['text']], $node['mainEntity']),
        );
    }

    public function test_it_names_no_price(): void
    {
        // Boardroom 2026-10-14: test a paid offer, do not sell one; cost points at #pricing instead.
        foreach (Faq::items() as $item) {
            $this->assertDoesNotMatchRegularExpression('/[€$£]|\d+\s*(euro|eur)\b/i', $item['answer'], $item['question']);
        }

        $this->assertStringEndsWith('#pricing', Faq::items()[0]['link']['url']);
    }

    public function test_a_page_graph_keeps_its_own_nodes_and_gains_the_faq(): void
    {
        $graph = Seo::withFaq(Seo::organisationGraph());
        $types = array_column($graph['@graph'], '@type');

        $this->assertSame(['Organization', 'WebSite', 'FAQPage'], $types);
        $this->assertSame(['FAQPage'], array_column(Seo::withFaq()['@graph'], '@type'));
    }
}
