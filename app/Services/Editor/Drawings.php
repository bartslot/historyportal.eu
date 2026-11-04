<?php

declare(strict_types=1);

namespace App\Services\Editor;

use App\Models\SvgAsset;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * A line a teacher drew over a scene (resources/js/editor/draw-layer.js): pen, line or arrow. Each becomes its own
 * picture (an SVG the server writes from the points, never markup from the browser) and its own layer, so it is
 * selected, moved and deleted like any picture, and the class sees it when the scene plays.
 *
 * Points come in stage percent: x of the stage's width, y of its height. The picture is drawn in units of 1% of the
 * stage's HEIGHT on both axes (x times the stage's aspect), so a circle stays round however wide the stage is.
 */
final class Drawings
{
    public const SOURCE = 'drawing';

    public const TOOLS = ['pen', 'line', 'arrow'];

    private const MAX_POINTS = 2000;

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
        $aspect = max(0.2, min(5.0, $aspect));
        $lw = $s['width'] / 10;                                   // px at a 1000 px tall stage -> % of its height
        $pts = array_map(fn ($p) => [$p[0] * $aspect, $p[1]], $s['points']);
        $xs = array_column($pts, 0);
        $ys = array_column($pts, 1);
        $pad = $lw * ($s['tool'] === 'arrow' ? 4.5 : 1.5);
        $x0 = min($xs) - $pad;
        $y0 = min($ys) - $pad;
        $w = max($xs) - min($xs) + 2 * $pad;
        $h = max($ys) - min($ys) + 2 * $pad;
        $f = fn (float $v) => rtrim(rtrim(number_format($v, 3, '.', ''), '0'), '.');
        $at = fn (array $p) => $f($p[0] - $x0).' '.$f($p[1] - $y0);

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
        $body = sprintf('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>', $d, $s['colour'], $f($lw));
        if ($s['tool'] === 'arrow') {
            [$a, $b] = [$pts[0], $pts[1]];
            $ang = atan2($b[1] - $a[1], $b[0] - $a[0]);
            $head = $lw * 3.5;
            $tip = [$b[0] + cos($ang) * $lw, $b[1] + sin($ang) * $lw];
            $l = [$b[0] - cos($ang - 0.5) * $head, $b[1] - sin($ang - 0.5) * $head];
            $r = [$b[0] - cos($ang + 0.5) * $head, $b[1] - sin($ang + 0.5) * $head];
            $body .= sprintf('<path d="M%s L%s L%s Z" fill="%s"/>', $at($tip), $at($l), $at($r), $s['colour']);
        }
        $svg = sprintf('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %s %s" width="%d" height="%d">%s</svg>',
            $f($w), $f($h), (int) round($w * 10), (int) round($h * 10), $body);

        return ['svg' => $svg, 'x' => ($x0 + $w / 2) / $aspect, 'y' => $y0 + $h / 2, 'height' => $h, 'width' => $w / $aspect];
    }

    /** Store the drawing as the teacher's own picture. */
    public static function save(User $user, array $stroke, string $svg, string $title): SvgAsset
    {
        $path = sprintf('drawings/%d/%s.svg', $user->id, Str::uuid());
        Storage::disk('public')->put($path, $svg);
        preg_match('/width="(\d+)" height="(\d+)"/', $svg, $m);

        return SvgAsset::create([
            'user_id' => $user->id, 'source' => self::SOURCE, 'source_ref' => pathinfo($path, PATHINFO_FILENAME),
            'source_url' => '', 'title' => $title, 'license' => $title, 'svg_path' => $path,
            'width' => (int) ($m[1] ?? 0) ?: null, 'height' => (int) ($m[2] ?? 0) ?: null, 'view_box' => null,
        ]);
    }
}
