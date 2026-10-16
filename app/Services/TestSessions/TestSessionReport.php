<?php

declare(strict_types=1);

namespace App\Services\TestSessions;

use App\Models\TestSession;

/**
 * Turns a test session's events into what Claude reads after a test: a compact timeline and the
 * auto-flagged problems. Pure (events in, text out), so it is tested on fixture events; the
 * test:report command adds the snapshots and writes the file.
 *
 * Flags: errors (HTTP, failed loads, console), rage and dead clicks (detected in the browser,
 * resources/js/test-session/detectors.js), long idle, and back-and-forth navigation.
 *
 * Written in Dutch, like the tests it describes.
 */
class TestSessionReport
{
    /** No click or page change for this long is flagged. */
    public const IDLE_MS = 60_000;

    /** A → B → A within this long is flagged as back-and-forth. */
    public const BOUNCE_MS = 30_000;

    /** The same error again within this long is the same problem. */
    private const ERROR_DEDUPE_MS = 2_000;

    /** What counts as the tester doing something, for idle. */
    private const ACTIVITY = ['click', 'rage_click', 'dead_click', 'route', 'stop'];

    private const TEXT_MAX = 120;

    /**
     * @param  list<array{t_ms: int, type: string, payload: ?array<string, mixed>}>  $events  sorted by t_ms
     * @return list<array{t_ms: int, kind: string, text: string}>
     */
    public function flags(array $events): array
    {
        $flags = [...$this->errorFlags($events), ...$this->clickFlags($events), ...$this->idleFlags($events), ...$this->bounceFlags($events)];
        usort($flags, fn (array $a, array $b): int => $a['t_ms'] <=> $b['t_ms']);

        return $flags;
    }

    /**
     * One line per minute: "00:12 klik 'Start de les' · 00:40 fout 500 POST /livewire/update".
     *
     * @param  list<array{t_ms: int, type: string, payload: ?array<string, mixed>}>  $events
     */
    public function timeline(array $events): string
    {
        $minutes = [];
        foreach ($events as $event) {
            $minutes[intdiv($event['t_ms'], 60_000)][] = self::clock($event['t_ms']).' '.$this->describe($event);
        }

        return implode("\n", array_map(fn (array $parts): string => '- '.implode(' · ', $parts), $minutes));
    }

    /**
     * @param  list<array{t_ms: int, type: string, payload: ?array<string, mixed>}>  $events
     * @param  list<array{t_ms: int, kind: string, text: string}>  $flags
     * @param  array<int, string>  $snapshots  flag index => image path relative to the report
     * @param  array{chunks: int, bytes: int}  $recording
     */
    public function markdown(TestSession $session, array $events, array $flags, array $snapshots, array $recording): string
    {
        $endMs = $events === [] ? 0 : max(array_column($events, 't_ms'));
        $minutes = max($endMs / 60_000, 1 / 60);

        $out = [
            "# Testsessie {$session->code}".($session->label ? " · {$session->label}" : ''),
            '',
            '- Gestart: '.($session->started_at?->toDateTimeString() ?? 'nooit (geen toestemming)'),
            '- Gestopt: '.($session->ended_at?->toDateTimeString() ?? 'niet gestopt'),
            '- Duur: '.self::clock($endMs).' · '.count($events).' gebeurtenissen',
            sprintf('- Opname: %d rrweb-blokken, %.0f KB opgeslagen (%.0f KB per minuut)', $recording['chunks'], $recording['bytes'] / 1024, $recording['bytes'] / 1024 / $minutes),
            '',
            '## Bevindingen ('.count($flags).')',
            '',
        ];

        if ($flags === []) {
            $out[] = 'Niets automatisch gevonden.';
        }
        foreach ($flags as $i => $flag) {
            $out[] = '- '.self::clock($flag['t_ms']).' **'.$flag['kind'].'** '.$flag['text']
                .(isset($snapshots[$i]) ? "  \n  ![".self::clock($flag['t_ms'])."]({$snapshots[$i]})" : '');
        }

        return implode("\n", [...$out, '', '## Tijdlijn', '', $this->timeline($events), '']);
    }

    /** 75_300 → "01:15"; past an hour "1:01:15". */
    public static function clock(int $ms): string
    {
        $s = intdiv(max(0, $ms), 1000);

        return $s >= 3600
            ? sprintf('%d:%02d:%02d', intdiv($s, 3600), intdiv($s % 3600, 60), $s % 60)
            : sprintf('%02d:%02d', intdiv($s, 60), $s % 60);
    }

    /** "MM:SS" or "H:MM:SS" → ms; null when it is not a time. */
    public static function parseClock(string $value): ?int
    {
        if (! preg_match('/^(?:(\d+):)?(\d{1,2}):(\d{2})$/', trim($value), $m)) {
            return null;
        }

        return (((int) $m[1]) * 3600 + ((int) $m[2]) * 60 + (int) $m[3]) * 1000;
    }

    /** @param array{t_ms: int, type: string, payload: ?array<string, mixed>} $event */
    public function describe(array $event): string
    {
        $p = $event['payload'] ?? [];
        $text = fn (): string => "'".$this->clip((string) ($p['text'] ?? ''))."'".(empty($p['role']) ? '' : " [{$p['role']}]");

        return match ($event['type']) {
            'start' => 'start',
            'stop' => 'gestopt',
            'viewport' => sprintf('scherm %d×%d', $p['w'] ?? 0, $p['h'] ?? 0),
            'route' => 'pagina '.($p['path'] ?? '?'),
            'click' => 'klik '.$text(),
            'rage_click' => 'woedeklik '.$text().' ('.($p['count'] ?? 3).'×)',
            'dead_click' => 'dode klik '.$text(),
            'http_error' => 'fout '.($p['status'] ?? '?').' '.trim(($p['method'] ?? '').' '.($p['url'] ?? '')),
            'console_error' => 'console: '.$this->clip((string) ($p['message'] ?? '')),
            'scene' => $this->scene($p),
            default => $event['type'],
        };
    }

    /** @param array<string, mixed> $p */
    private function scene(array $p): string
    {
        $index = isset($p['sceneIndex']) ? ' '.((int) $p['sceneIndex'] + 1) : '';

        return match ($p['event'] ?? '') {
            'lesson_started' => 'les gestart',
            'lesson_completed' => 'les af',
            'lesson_exited' => 'les verlaten',
            'scene_started' => "scène{$index}",
            'scene_completed' => "scène{$index} klaar",
            'quiz_started' => "quiz{$index}",
            'moment_started' => "moment{$index}",
            default => 'speler '.($p['event'] ?? '?'),
        };
    }

    /** @return list<array{t_ms: int, kind: string, text: string}> */
    private function errorFlags(array $events): array
    {
        $flags = [];
        $seen = [];
        foreach ($events as $event) {
            if (! in_array($event['type'], ['http_error', 'console_error'], true)) {
                continue;
            }
            $line = $this->describe($event);
            if (isset($seen[$line]) && $event['t_ms'] - $seen[$line] <= self::ERROR_DEDUPE_MS) {
                continue;
            }
            $seen[$line] = $event['t_ms'];
            $flags[] = ['t_ms' => $event['t_ms'], 'kind' => 'fout', 'text' => $line];
        }

        return $flags;
    }

    /** @return list<array{t_ms: int, kind: string, text: string}> */
    private function clickFlags(array $events): array
    {
        $kinds = ['rage_click' => 'woedeklik', 'dead_click' => 'dode klik'];

        return array_values(array_map(
            fn (array $e): array => ['t_ms' => $e['t_ms'], 'kind' => $kinds[$e['type']], 'text' => $this->describe($e)],
            array_filter($events, fn (array $e): bool => isset($kinds[$e['type']])),
        ));
    }

    /** @return list<array{t_ms: int, kind: string, text: string}> */
    private function idleFlags(array $events): array
    {
        $flags = [];
        $last = 0; // the session start counts as activity
        foreach ($events as $event) {
            if (! in_array($event['type'], self::ACTIVITY, true)) {
                continue;
            }
            if ($event['t_ms'] - $last >= self::IDLE_MS) {
                $flags[] = [
                    't_ms' => $last,
                    'kind' => 'stil',
                    'text' => sprintf('%d s niets gedaan (%s tot %s)', intdiv($event['t_ms'] - $last, 1000), self::clock($last), self::clock($event['t_ms'])),
                ];
            }
            $last = $event['t_ms'];
        }

        return $flags;
    }

    /** @return list<array{t_ms: int, kind: string, text: string}> */
    private function bounceFlags(array $events): array
    {
        $routes = array_values(array_filter($events, fn (array $e): bool => $e['type'] === 'route'));
        $flags = [];
        for ($i = 2; $i < count($routes); $i++) {
            [$a, $b, $c] = [$routes[$i - 2], $routes[$i - 1], $routes[$i]];
            $path = fn (array $e): string => (string) ($e['payload']['path'] ?? '');
            if ($path($a) === $path($c) && $path($a) !== $path($b) && $c['t_ms'] - $a['t_ms'] <= self::BOUNCE_MS) {
                $flags[] = [
                    't_ms' => $c['t_ms'],
                    'kind' => 'heen en terug',
                    'text' => $path($a).' → '.$path($b).' → terug binnen '.intdiv($c['t_ms'] - $a['t_ms'], 1000).' s',
                ];
            }
        }

        return $flags;
    }

    private function clip(string $text): string
    {
        return mb_strlen($text) > self::TEXT_MAX ? mb_substr($text, 0, self::TEXT_MAX - 1).'…' : $text;
    }
}
