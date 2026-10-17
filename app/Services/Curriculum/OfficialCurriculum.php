<?php

declare(strict_types=1);

namespace App\Services\Curriculum;

use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Reads the curriculum from where the government publishes it, so curriculum:sync can notice a change
 * (Bart, 2026-10-17: "a script that will pull in the information when the government updates it").
 *
 * - Kerndoelen 36-47: the Uitvoeringsbesluit WVO 2020 (BWBR0045787) as official XML from the BWB
 *   repository, the version in force today, found through the government's SRU search service.
 * - Canon: the 50 windows on canonvannederland.nl.
 * - Kenmerkende aspecten: only published as a syllabus PDF, so that one is watched (a new or changed
 *   file raises an alert), not parsed.
 */
class OfficialCurriculum
{
    public const BWB_ID = 'BWBR0045787';

    public const LAW_URL = 'https://wetten.overheid.nl/'.self::BWB_ID;

    private const SRU = 'https://zoekservice.overheid.nl/sru/Search';

    private const CANON_URL = 'https://www.canonvannederland.nl/nl/';

    private const EXAMENBLAD = 'https://examenblad.nl';

    private const SYLLABUS_URL = self::EXAMENBLAD.'/%d/vwo/vakken/maatschappijvakken/geschiedenis-vwo';

    private const TIMEOUT = 30;

    /** The XML of the Uitvoeringsbesluit version in force on $date (default today). */
    public function lawXml(?Carbon $date = null): string
    {
        $day = ($date ?? now())->toDateString();
        $search = $this->get(self::SRU.'?'.http_build_query([
            'operation' => 'searchRetrieve', 'version' => '2.0', 'x-connection' => 'BWB',
            'maximumRecords' => 100, 'query' => 'dcterms.identifier='.self::BWB_ID,
        ]));

        preg_match_all('#<overheidbwb:geldigheidsperiode_startdatum>([^<]+)</.*?<overheidbwb:geldigheidsperiode_einddatum>([^<]+)</.*?<overheidbwb:locatie_toestand>([^<]+)<#s', $search, $versions, PREG_SET_ORDER);

        foreach ($versions as [, $start, $end, $url]) {
            if ($start <= $day && $day <= $end) {
                return $this->get(html_entity_decode($url));
            }
        }

        throw new RuntimeException('No version of '.self::BWB_ID." is in force on {$day} according to the SRU service.");
    }

    /**
     * Kerndoelen 36-47 from the law XML, as the text for the European Netherlands: the sentences for
     * Bonaire, Sint Eustatius and Saba are left out. Nested lists become "– item" lines.
     *
     * @return array<string, string> code => official text
     */
    public function parseKerndoelen(string $xml): array
    {
        $xpath = $this->xpath($xml, isXml: true);
        $section = $xpath->query("//divisie[kop/titel[starts-with(normalize-space(.), 'Onderdeel E')]]")->item(0);
        if ($section === null) {
            return [];
        }

        // Walk the section in document order. The law XML puts a kerndoel's later paragraphs AFTER
        // its list closes (kerndoel 37's "20e eeuw … canon" sentence is a loose <al> in the section),
        // so a loose paragraph belongs to the last numbered item; the one before any item is the intro.
        $paragraphs = [];
        $current = null;
        foreach ($xpath->query('./al | ./lijst/li', $section) as $node) {
            /** @var DOMElement $node */
            if ($node->nodeName === 'li') {
                $current = trim((string) $xpath->evaluate('string(li.nr)', $node), " .\u{a0}");
                $paragraphs[$current] = $this->itemParagraphs($node, $xpath);
            } elseif ($current !== null) {
                $paragraphs[$current][] = $this->europeanOnly($this->clean($node->textContent));
            }
        }

        $goals = [];
        foreach ($paragraphs as $code => $parts) {
            $parts = array_values(array_filter($parts, fn (string $part): bool => $part !== ''));
            if ($code !== '' && $parts !== []) {
                $goals[$code] = implode("\n\n", $parts);
            }
        }

        return $goals;
    }

    /** @return list<string> */
    private function itemParagraphs(DOMElement $li, DOMXPath $xpath): array
    {
        $parts = [];
        foreach ($li->childNodes as $child) {
            if (! $child instanceof DOMElement) {
                continue;
            }
            if ($child->nodeName === 'al') {
                $parts[] = $this->europeanOnly($this->clean($child->textContent));
            } elseif ($child->nodeName === 'lijst') {
                $lines = [];
                foreach ($xpath->query('li/al', $child) as $al) {
                    $lines[] = '– '.$this->clean($al->textContent);
                }
                $parts[] = implode("\n", $lines);
            }
        }

        return $parts;
    }

    /** @return list<array{code: string, title: string, period: string, slug: string}> */
    public function parseCanon(string $html): array
    {
        $xpath = $this->xpath($html, isXml: false);
        $windows = [];

        foreach ($xpath->query("//li[contains(concat(' ', normalize-space(@class), ' '), ' window-depiction ')]") as $li) {
            $href = (string) $xpath->evaluate("string(.//a[contains(@class, 'window-depiction__link')]/@href)", $li);
            $title = $xpath->query(".//*[contains(@class, 'window-depiction__text__title')]", $li)->item(0);
            if ($href === '' || $title === null) {
                continue;
            }
            foreach ($xpath->query(".//*[contains(@class, 'sr-only')]", $title) as $hidden) {
                $hidden->parentNode->removeChild($hidden);
            }

            $windows[] = [
                'code' => (string) (count($windows) + 1),
                'title' => $this->clean($title->textContent),
                'period' => $this->clean((string) $xpath->evaluate("string(.//*[contains(@class, 'window-depiction__text__date')])", $li)),
                'slug' => trim(str_replace('/nl/', '', $href), '/'),
            ];
        }

        return $windows;
    }

    public function canonHtml(): string
    {
        return $this->get(self::CANON_URL);
    }

    public function canonUrl(string $slug): string
    {
        return self::CANON_URL.$slug;
    }

    /**
     * sha1 of the vwo history syllabus for an exam year, or null while it is not published. Found via
     * the subject page, whose address is stable; the syllabus slug is not (2025 had none of the year,
     * 2026 on end in "-2026").
     */
    public function syllabusFingerprint(int $year): ?string
    {
        $page = Http::timeout(self::TIMEOUT)->connectTimeout(10)->get($this->syllabusUrl($year));
        if (! $page->successful() || ! preg_match('#href="([^"]*syllabus-geschiedenis-vwo[^"]*)"#i', $page->body(), $link)) {
            return null;
        }

        $pdf = Http::timeout(self::TIMEOUT)->connectTimeout(10)->get(str_starts_with($link[1], 'http') ? $link[1] : self::EXAMENBLAD.$link[1]);

        return $pdf->successful() && str_starts_with($pdf->body(), '%PDF') ? sha1($pdf->body()) : null;
    }

    /** The exam year's vwo history page on examenblad.nl, which links the syllabus. */
    public function syllabusUrl(int $year): string
    {
        return sprintf(self::SYLLABUS_URL, $year);
    }

    private function get(string $url): string
    {
        $response = Http::timeout(self::TIMEOUT)->connectTimeout(10)->retry(2, 2000, throw: false)
            ->withHeaders(['User-Agent' => 'HistoryPortal curriculum sync (info@historyportal.eu)'])
            ->get($url);

        if (! $response->successful()) {
            throw new RuntimeException("GET {$url} returned HTTP {$response->status()}.");
        }

        return $response->body();
    }

    private function xpath(string $source, bool $isXml): DOMXPath
    {
        $document = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $loaded = $isXml
            ? $document->loadXML($source, LIBXML_NONET)
            : $document->loadHTML('<?xml encoding="UTF-8">'.$source, LIBXML_NONET);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        if (! $loaded) {
            throw new RuntimeException('Could not parse the '.($isXml ? 'law XML' : 'Canon page').'.');
        }

        return new DOMXPath($document);
    }

    private function clean(string $text): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', $text));
    }

    /** Drop the Caribbean Netherlands variant ("De leerling in Bonaire, Sint Eustatius …"). */
    private function europeanOnly(string $text): string
    {
        $cut = mb_strpos($text, 'De leerling in Bonaire');

        return trim($cut === false ? $text : mb_substr($text, 0, $cut));
    }
}
