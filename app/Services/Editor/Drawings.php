<?php

declare(strict_types=1);

namespace App\Services\Editor;

use App\Models\SvgAsset;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * A line a teacher drew over a scene (resources/js/editor/draw-layer.js): pen, line or arrow. The lines of one drawing
 * session (until Klaar) are ONE picture (an SVG the server writes from the points, never markup from the browser) on
 * one layer, selected, moved and deleted like any picture, and the class sees it when the scene plays. The layer keeps
 * its strokes (`strokes`, with the box they were drawn in, `drawn`), so more can be added and the eraser can rub out.
 *
 * Points come in stage percent: x of the stage's width, y of its height. The picture is drawn in units of 1% of the
 * stage's HEIGHT on both axes (x times the stage's aspect), so a circle stays round however wide the stage is.
 */
final class Drawings
{
    public const SOURCE = 'drawing';

    public const TOOLS = ['pen', 'line', 'arrow'];

    private const MAX_POINTS = 2000;

    /** All the strokes on one drawing layer together; past this the next stroke starts a layer of its own. */
    public const MAX_LAYER_POINTS = 12000;

    /**
     * A clean stroke, or null when it is not one.
     *
     * @param  array<string,mixed>  $s
     * @return array{tool:string, colour:string, width:float, points:list<array{0:float,1:float}>}|null
     */
    public static function clean(array $s): ?array
    {
        $tool = in_array($s['tool'] ?? null, self::TOOLS, true) ? $s['tool'] : null;
        $colour = is_string($s['colour'] ?? null) && preg_match('/^#[0-9a-fA-F]{6}$/', $s['colour']) === 1 ? strtolower($s['colour']) : null;
        $width = is_numeric($s['width'] ?? null) ? max(1.0, min(40.0, (float) $s['width'])) : null;
        $points = [];
        foreach (array_slice(is_array($s['points'] ?? null) ? $s['points'] : [], 0, self::MAX_POINTS) as $p) {
            if (is_array($p) && is_numeric($p[0] ?? null) && is_numeric($p[1] ?? null)) {
                $points[] = [max(-50.0, min(150.0, (float) $p[0])), max(-50.0, min(150.0, (float) $p[1]))];
            }
        }
        if ($tool === null || $colour === null || $width === null || count($points) < 2) {
            return null;
        }

        return ['tool' => $tool, 'colour' => $colour, 'width' => $width, 'points' => $tool === 'pen' ? $points : [$points[0], $points[count($points) - 1]]];
    }

    /**
     * The SVG and where it sits: centre x/y in stage %, height in % of the stage's height, width in % of its width.
     *
     * @param  array{tool:string, colour:string, width:float, points:list<array{0:float,1:float}>}  $s
     * @return array{svg:string, x:float, y:float, height:float, width:float}
     */
    public static function svg(array $s, float $aspect): array
    {
        return self::svgMany([$s], $aspect);
    }

    /**
     * Several strokes as ONE picture (one drawing layer: every stroke of a drawing session, Bart 2026-11-24), boxed
     * around all of them together.
     *
     * @param  non-empty-list<array{tool:string, colour:string, width:float, points:list<array{0:float,1:float}>}>  $strokes
     * @return array{svg:string, x:float, y:float, height:float, width:float}
     */
    public static function svgMany(array $strokes, float $aspect): array
    {
        $aspect = max(0.2, min(5.0, $aspect));
        $x0 = $y0 = INF;
        $x1 = $y1 = -INF;
        foreach ($strokes as $s) {
            $lw = $s['width'] / 10;                               // px at a 1000 px tall stage -> % of its height
            $pad = $lw * ($s['tool'] === 'arrow' ? 4.5 : 1.5);
            foreach ($s['points'] as $p) {
                $x0 = min($x0, $p[0] * $aspect - $pad);
                $x1 = max($x1, $p[0] * $aspect + $pad);
                $y0 = min($y0, $p[1] - $pad);
                $y1 = max($y1, $p[1] + $pad);
            }
        }
        $w = $x1 - $x0;
        $h = $y1 - $y0;
        $f = fn (float $v) => rtrim(rtrim(number_format($v, 3, '.', ''), '0'), '.');
        $at = fn (array $p) => $f($p[0] - $x0).' '.$f($p[1] - $y0);

        $body = '';
        foreach ($strokes as $s) {
            $lw = $s['width'] / 10;
            $pts = array_map(fn ($p) => [$p[0] * $aspect, $p[1]], $s['points']);
            $d = 'M'.$at($pts[0]);
            if ($s['tool'] === 'pen' && count($pts) > 2) {
                for ($i = 1; $i < count($pts) - 1; $i++) {
                    $mid = [($pts[$i][0] + $pts[$i + 1][0]) / 2, ($pts[$i][1] + $pts[$i + 1][1]) / 2];
                    $d .= ' Q'.$at($pts[$i]).' '.$at($mid);
                }
                $d .= ' L'.$at($pts[count($pts) - 1]);
            } else {
                foreach (array_slice($pts, 1) as $p) {
                    $d .= ' L'.$at($p);
                }
            }
            $body .= sprintf('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>', $d, $s['colour'], $f($lw));
            if ($s['tool'] === 'arrow') {
                [$a, $b] = [$pts[0], $pts[1]];
                $ang = atan2($b[1] - $a[1], $b[0] - $a[0]);
                $head = $lw * 3.5;
                $tip = [$b[0] + cos($ang) * $lw, $b[1] + sin($ang) * $lw];
                $l = [$b[0] - cos($ang - 0.5) * $head, $b[1] - sin($ang - 0.5) * $head];
                $r = [$b[0] - cos($ang + 0.5) * $head, $b[1] - sin($ang + 0.5) * $head];
                $body .= sprintf('<path d="M%s L%s L%s Z" fill="%s"/>', $at($tip), $at($l), $at($r), $s['colour']);
            }
        }
        $svg = sprintf('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s" width="%d" height="%d">%s</svg>',
            $f($w), $f($h), (int) round($w * 10), (int) round($h * 10), $body);

        return ['svg' => $svg, 'x' => ($x0 + $w / 2) / $aspect, 'y' => $y0 + $h / 2, 'height' => $h, 'width' => $w / $aspect];
    }

    /** A layer that holds its strokes (drawn since 2026-11-24), so more can be drawn on it and parts rubbed out. */
    public static function isDrawingLayer(array $layer): bool
    {
        return is_array($layer['strokes'] ?? null) && $layer['strokes'] !== [] && is_array($layer['drawn'] ?? null)
            && ($layer['anchor'] ?? 'stage') !== 'map' && ! isset($layer['embed']);
    }

    /** @param  list<array{points:list<mixed>}>  $strokes */
    public static function pointCount(array $strokes): int
    {
        return array_sum(array_map(fn (array $s): int => count($s['points']), $strokes));
    }

    /**
     * The layer's strokes where the layer is NOW: it may have been moved, scaled, turned or flipped since they were
     * drawn. The strokes are kept in stage % as drawn, with the box they were drawn in (`drawn`).
     *
     * @return list<array{tool:string, colour:string, width:float, points:list<array{0:float,1:float}>}>
     */
    public static function placed(array $layer, float $aspect): array
    {
        $aspect = max(0.2, min(5.0, $aspect));
        $d = $layer['drawn'];
        $dw = max(0.001, (float) ($d['width'] ?? 1));
        $dh = max(0.001, (float) ($d['height'] ?? 1));
        $scale = (float) ($layer['scale'] ?? 1.0);
        $sx = (float) ($layer['width'] ?? $dw) * $scale / $dw;
        $sy = (float) ($layer['height'] ?? $dh) * $scale / $dh;
        $fx = ! empty($layer['flip_x']) ? -1 : 1;
        $fy = ! empty($layer['flip_y']) ? -1 : 1;
        $rad = deg2rad((float) ($layer['rotation'] ?? 0));
        [$cos, $sin] = [cos($rad), sin($rad)];
        $cx = (float) ($layer['x'] ?? $d['x']);
        $cy = (float) ($layer['y'] ?? $d['y']);
        $grow = sqrt(max(0.0001, $sx * $sy));

        $out = [];
        foreach ($layer['strokes'] as $s) {
            $clean = self::clean($s);
            if ($clean === null) {
                continue;
            }
            $clean['points'] = array_map(function (array $p) use ($d, $sx, $sy, $fx, $fy, $cos, $sin, $cx, $cy, $aspect): array {
                $X = ($p[0] - (float) $d['x']) * $sx * $fx * $aspect;   // in % of the stage's height, so a turn stays round
                $Y = ($p[1] - (float) $d['y']) * $sy * $fy;

                return [round($cx + ($X * $cos - $Y * $sin) / $aspect, 3), round($cy + $X * $sin + $Y * $cos, 3)];
            }, $clean['points']);
            $clean['width'] = round(max(1.0, min(40.0, $clean['width'] * $grow)), 2);
            $out[] = $clean;
        }

        return $out;
    }

    /**
     * Rub out with a round eraser of `radius` (% of the stage's height) dragged along `path` (stage %). A pen line
     * loses the part under the eraser and may come apart in pieces; a straight line or an arrow goes as a whole once
     * the eraser touches it (half an arrow is no arrow).
     *
     * @param  list<array{tool:string, colour:string, width:float, points:list<array{0:float,1:float}>}>  $strokes
     * @param  list<array{0:float,1:float}>  $path
     * @return list<array{tool:string, colour:string, width:float, points:list<array{0:float,1:float}>}>
     */
    public static function erase(array $strokes, array $path, float $radius, float $aspect): array
    {
        $aspect = max(0.2, min(5.0, $aspect));
        $toH = fn (array $p): array => [$p[0] * $aspect, $p[1]];
        $rub = array_map($toH, $path);
        $near = function (array $q, float $reach) use ($rub): bool {
            $n = count($rub);
            if ($n === 1) {
                return hypot($q[0] - $rub[0][0], $q[1] - $rub[0][1]) <= $reach;
            }
            for ($i = 0; $i < $n - 1; $i++) {
                [$a, $b] = [$rub[$i], $rub[$i + 1]];
                $dx = $b[0] - $a[0];
                $dy = $b[1] - $a[1];
                $len = $dx * $dx + $dy * $dy;
                $t = $len > 0 ? max(0.0, min(1.0, (($q[0] - $a[0]) * $dx + ($q[1] - $a[1]) * $dy) / $len)) : 0.0;
                if (hypot($q[0] - ($a[0] + $t * $dx), $q[1] - ($a[1] + $t * $dy)) <= $reach) {
                    return true;
                }
            }

            return false;
        };
        // a stroke's points, filled in so no gap between two of them is wider than `step`
        $dense = function (array $pts, float $step): array {
            $out = [$pts[0]];
            for ($i = 1; $i < count($pts); $i++) {
                [$a, $b] = [$pts[$i - 1], $pts[$i]];
                $n = (int) min(400, ceil(hypot($b[0] - $a[0], $b[1] - $a[1]) / $step));
                for ($k = 1; $k <= $n; $k++) {
                    $out[] = [$a[0] + ($b[0] - $a[0]) * $k / max(1, $n), $a[1] + ($b[1] - $a[1]) * $k / max(1, $n)];
                }
            }

            return $out;
        };
        // a pen line as the picture draws it (svgMany): quadratic curves through the midpoints, flattened
        $curve = function (array $pts): array {
            $n = count($pts);
            if ($n <= 2) {
                return $pts;
            }
            $out = [$pts[0]];
            $from = $pts[0];
            for ($i = 1; $i < $n - 1; $i++) {
                $c = $pts[$i];
                $to = [($pts[$i][0] + $pts[$i + 1][0]) / 2, ($pts[$i][1] + $pts[$i + 1][1]) / 2];
                for ($k = 1; $k <= 6; $k++) {
                    $t = $k / 6;
                    $u = 1 - $t;
                    $out[] = [$u * $u * $from[0] + 2 * $u * $t * $c[0] + $t * $t * $to[0], $u * $u * $from[1] + 2 * $u * $t * $c[1] + $t * $t * $to[1]];
                }
                $from = $to;
            }
            $out[] = $pts[$n - 1];

            return $out;
        };
        $step = max(0.2, $radius / 2);

        $out = [];
        foreach ($strokes as $s) {
            $reach = $radius + $s['width'] / 20;                     // the eraser's edge meets the line's edge
            $mapped = array_map($toH, $s['points']);
            $pts = $dense($s['tool'] === 'pen' ? $curve($mapped) : $mapped, $step);
            if ($s['tool'] !== 'pen') {
                foreach ($pts as $q) {
                    if ($near($q, $reach)) {
                        continue 2;
                    }
                }
                $out[] = $s;

                continue;
            }
            $runs = [[]];
            foreach ($pts as $q) {
                if ($near($q, $reach)) {
                    if ($runs[count($runs) - 1] !== []) {
                        $runs[] = [];
                    }
                } else {
                    $runs[count($runs) - 1][] = $q;
                }
            }
            if (count($runs) === 1 && count($runs[0]) === count($pts)) {
                $out[] = $s;                                         // untouched: keep it exactly as it was

                continue;
            }
            foreach ($runs as $run) {
                $kept = [];
                foreach ($run as $q) {                               // thin the filled-in points back out
                    $last = $kept[count($kept) - 1] ?? null;
                    if ($last === null || hypot($q[0] - $last[0], $q[1] - $last[1]) >= 0.25) {
                        $kept[] = $q;
                    }
                }
                if (count($run) > 1 && end($kept) !== end($run)) {
                    $kept[] = end($run);
                }
                if (count($kept) < 2) {
                    continue;
                }
                $kept = array_map(fn ($q) => [round($q[0] / $aspect, 3), round($q[1], 3)], $kept);
                // a long piece goes in several strokes that meet end to end, never cut short
                for ($at = 0; $at < count($kept) - 1; $at += self::MAX_POINTS - 1) {
                    $out[] = [...$s, 'points' => array_slice($kept, $at, self::MAX_POINTS)];
                }
            }
        }

        return $out;
    }

    /**
     * The layer drawn again from `strokes`: a new picture file (the old one stays, so Undo can put it back), and the
     * layer's box around the strokes, upright and at scale 1 since `placed` already moved them where the layer is.
     *
     * @param  non-empty-list<array{tool:string, colour:string, width:float, points:list<array{0:float,1:float}>}>  $strokes
     * @return array<string,mixed>
     */
    public static function relayer(User $user, array $layer, array $strokes, float $aspect): array
    {
        $drawn = self::svgMany($strokes, $aspect);
        $box = ['x' => round($drawn['x'], 3), 'y' => round($drawn['y'], 3), 'width' => round($drawn['width'], 3), 'height' => round($drawn['height'], 3)];
        unset($layer['flip_x'], $layer['flip_y']);

        return [...$layer, ...$box, 'path' => self::store($user, $drawn['svg']), 'scale' => 1.0, 'rotation' => 0.0,
            'strokes' => $strokes, 'drawn' => $box];
    }

    /** Write a drawing's SVG to the public disk; its path. */
    public static function store(User $user, string $svg): string
    {
        $path = sprintf('drawings/%d/%s.svg', $user->id, Str::uuid());
        Storage::disk('public')->put($path, $svg);

        return $path;
    }

    /** Store the drawing as the teacher's own picture. */
    public static function save(User $user, array $stroke, string $svg, string $title): SvgAsset
    {
        $path = self::store($user, $svg);
        preg_match('/width="(\d+)" height="(\d+)"/', $svg, $m);

        return SvgAsset::create([
            'user_id' => $user->id, 'source' => self::SOURCE, 'source_ref' => pathinfo($path, PATHINFO_FILENAME),
            'source_url' => '', 'title' => $title, 'license' => $title, 'svg_path' => $path,
            'width' => (int) ($m[1] ?? 0) ?: null, 'height' => (int) ($m[2] ?? 0) ?: null, 'view_box' => null,
        ]);
    }
}
