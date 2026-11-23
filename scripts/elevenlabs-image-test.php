<?php

declare(strict_types=1);

/**
 * A small History Lines test batch through the ElevenLabs image API (POST /v1/flows/image).
 * Standalone (no Laravel boot), so it runs from the repo root on any machine with PHP + GD.
 *
 *   php scripts/elevenlabs-image-test.php [out-dir] [--models=gemini-3.1-flash-image,gpt-image-2] [--only=1,3] [--retries=1] [--dry]
 *
 * How the look is held on any model: (1) the same History Lines reference pictures in every request,
 * (2) one fixed style prompt for every model, (3) a style check on each result (the §2 numbers); an
 * off-style result is redone with a correction naming what was off, up to --retries times. Every
 * attempt is kept so the eye can still judge (§11: the numbers are a smoke test, not the judge).
 *
 * Key: ELEVENLABS_IMAGE_API_KEY (env or .env), falling back to ELEVENLABS_API_KEY. It needs the
 * image generation permission. Failed generations are not charged (ElevenLabs docs).
 *
 * Writes one image per scene per model, metrics.csv (ink / very pale / saturation, the smoke test of
 * docs/history-lines-style.md §2) and contact-sheet.jpg with the Marco Polo reference plate on top.
 */
$args = array_slice($argv, 1);
$opt = fn (string $name, ?string $default = null) => array_reduce(
    $args,
    fn ($carry, $a) => str_starts_with($a, "--{$name}=") ? substr($a, strlen($name) + 3) : $carry,
    $default,
);
$dry = in_array('--dry', $args, true);
$out = rtrim(array_values(array_filter($args, fn ($a) => ! str_starts_with($a, '--')))[0] ?? 'storage/app/elevenlabs-test/'.date('Ymd-His'), '/');
$models = explode(',', $opt('models', 'gemini-3.1-flash-image,gpt-image-2'));
$only = $opt('only') ? array_map('intval', explode(',', $opt('only'))) : null;
$retries = (int) $opt('retries', '1');

$root = dirname(__DIR__);
$key = getenv('ELEVENLABS_IMAGE_API_KEY') ?: envFile($root, 'ELEVENLABS_IMAGE_API_KEY')
    ?: getenv('ELEVENLABS_API_KEY') ?: envFile($root, 'ELEVENLABS_API_KEY');
if (! $key && ! $dry) {
    fwrite(STDERR, "No ELEVENLABS_IMAGE_API_KEY or ELEVENLABS_API_KEY in env or .env\n");
    exit(1);
}

// One-pass prompt: the History Lines ink + colour rules (app/Services/Art/HistoryLineStyle.php) folded into
// a single text-to-image call, since these models paint in one go. Wording follows the constants there.
$style = 'Style: a clean educational historical comic illustration in the History Lines style of the reference images. '
    .'Take only the drawing and painting style from the references, never their subjects or composition. '
    .'Confident warm black ink line carries the picture: clear closed outer contours of varying weight, only essential interior lines, '
    .'shadows built from controlled hatching with approximately 10 to 14% black coverage, single-direction hatching for medium shadows '
    .'and no more than two crossing directions for deep shadows. No solid black fills, no silhouettes, no grey wash. '
    .'Colour sits beneath the ink as transparent watercolour washes with visible blooms, backruns, granulation, tide-lines and paper tooth. '
    .'Selective colour: architecture very light in cream, pale sandstone and light ochre; weathered brown wood; muted turquoise water; '
    .'olive only on vegetation; one or two strong accent garments in warm red or muted blue on the focal figures. '
    .'Roughly 35 to 45% of the picture stays very pale paper. Sky is a very pale blue wash, clouds mostly untouched paper with thin contours. '
    .'Bright, editorial, like a good European comic album. Natural, respectful, slightly idealised people, faces drawn with a few precise lines, '
    .'hands with five fingers. Historically accurate clothing, architecture and objects; if unsure, simplify, never invent. '
    .'No muddy wash, no sepia or antique filter, no glossy or 3D rendering, no airbrush, no blur, no haze. '
    .'No readable text, no letters, no labels, no signature, no watermark.';

$scenes = [
    1 => ['slug' => 'gobi-caravan', 'ref' => 'pamir-trail.webp',
        'scene' => 'Wide shot, 1273, the Gobi desert: a camel caravan crosses pale dunes in daylight. In the foreground young Marco Polo '
            .'(shoulder-length brown hair, cream tunic laced at the neck, brown belt, satchel on a strap) walks beside a Bactrian camel, '
            .'with his father Niccolo and uncle Maffeo (bearded, rust-orange caps, red cloaks with gold clasps) riding just behind.'],
    2 => ['slug' => 'rialto-market', 'ref' => 'venice-port-1271.webp',
        'scene' => 'Medium shot, Venice 1271, a busy market on the Rialto by the Grand Canal: wooden stalls with fish, cloth and spices, '
            .'merchants in medieval Venetian dress, a gondola on turquoise water behind, brick and pale stone houses with Gothic windows.'],
    3 => ['slug' => 'quanzhou-harbour', 'ref' => 'galley-leaving-venice.webp',
        'scene' => 'Wide shot, Quanzhou harbour in Yuan China, 1291: large four-masted Chinese junks with ribbed batten sails at a stone quay, '
            .'dock workers carrying crates and porcelain jars, a pagoda roof in the distance.'],
    4 => ['slug' => 'genoa-prison', 'ref' => 'venice-glass-crate.webp',
        'scene' => 'Close-up, a Genoese prison cell, 1298: an older Marco Polo, bearded, sits on a bench telling his story while the writer '
            .'Rustichello of Pisa writes with a quill on parchment at a small wooden table, a shaft of daylight from a barred window.'],
];

// References: two colour anchors, the watercolour texture, then the matching Marco Polo plate.
$anchorDir = $root.'/resources/art/style-anchors/history-lines';
$plateDir = $root.'/resources/icons/history-line/backdrops/marco-polo';
$inline = fn (string $path) => ['type' => 'inline_base64', 'content_base64' => base64_encode(file_get_contents($path)),
    'mime_type' => match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) { 'webp' => 'image/webp', 'png' => 'image/png', default => 'image/jpeg' }];

@mkdir($out, 0775, true);
$csv = fopen("{$out}/metrics.csv", 'w');
fputcsv($csv, ['scene', 'model', 'file', 'ink_pct', 'pale_pct', 'mean_sat', 'seconds', 'style_check']);
foreach (array_unique(array_column($scenes, 'ref')) as $ref) {
    $m = metrics(file_get_contents("{$plateDir}/{$ref}"));
    fputcsv($csv, ['reference', 'marco-polo plate', $ref, ...$m, '', styleCheck($m) ? 'off' : 'on style']);
}

$results = [];
foreach ($scenes as $n => $s) {
    if ($only && ! in_array($n, $only, true)) {
        continue;
    }
    $refs = [$inline("{$anchorDir}/colour-caesar.jpg"), $inline("{$anchorDir}/colour-castle.jpg"),
        $inline("{$anchorDir}/texture-watercolour.jpg"), $inline("{$plateDir}/{$s['ref']}")];
    $prompt = $s['scene'].' '.$style;
    foreach ($models as $model) {
        $body = ['model_id' => $model, 'prompt' => $prompt, 'aspect_ratio' => '16:9', 'images' => $refs];
        $body += match ($model) {
            'gpt-image-2' => ['resolution' => '2K', 'quality' => 'medium'],
            'gemini-3.1-flash-image', 'gemini-3-pro-image' => ['resolution' => '2K'],
            default => [],
        };
        $fix = '';
        for ($attempt = 0; $attempt <= $retries; $attempt++) {
        echo "#{$n} {$s['slug']} · {$model}".($attempt ? " (redo {$attempt})" : '')." … ";
        if ($dry) {
            echo "dry run, prompt ".strlen($prompt)." chars\n";

            break;
        }
        $body['prompt'] = $prompt.$fix;
        $t = microtime(true);
        [$status, $created] = api('POST', '/v1/flows/image', $key, $body);
        if ($status >= 300 || empty($created['id'])) {
            echo "create failed ({$status}): ".json_encode($created)."\n";

            continue;
        }
        do {
            sleep(3);
            [, $g] = api('GET', '/v1/flows/image/'.$created['id'], $key);
        } while (in_array($g['status'] ?? '', ['pending', 'generating'], true) && microtime(true) - $t < 600);
        $secs = round(microtime(true) - $t, 1);
        if (($g['status'] ?? '') !== 'completed') {
            echo "failed after {$secs}s: ".($g['failure_reason'] ?? '?').' '.($g['error_message'] ?? json_encode($g))."\n";

            continue;
        }
        $bytes = file_get_contents($g['content_url']);
        $ext = explode('/', $g['content_mime_type'] ?? 'image/png')[1] ?? 'png';
        $file = sprintf('%d-%s-%s%s.%s', $n, $s['slug'], $model, $attempt ? "-redo{$attempt}" : '', $ext === 'jpeg' ? 'jpg' : $ext);
        file_put_contents("{$out}/{$file}", $bytes);
        $m = metrics($bytes);
        $off = styleCheck($m);
        fputcsv($csv, [$n, $model, $file, ...$m, $secs, $off ? implode('; ', array_keys($off)) : 'on style']);
        $results[$n][$model] = "{$out}/{$file}";
        echo "ok in {$secs}s · ink {$m[0]}% pale {$m[1]}% sat {$m[2]} · ".($off ? 'OFF: '.implode('; ', array_keys($off)) : 'on style')."\n";
        if (! $off) {
            break;
        }
        $fix = ' Correction, the last attempt was off the History Lines style: '.implode(' ', $off);
        }
    }
}
fclose($csv);

if ($results) {
    contactSheet($results, $scenes, $plateDir, $models, "{$out}/contact-sheet.jpg");
    echo "Contact sheet: {$out}/contact-sheet.jpg\n";
}
echo "Done: {$out}\n";

// ── helpers ──────────────────────────────────────────────────────────────

function envFile(string $root, string $name): ?string
{
    $env = @file_get_contents($root.'/.env') ?: '';

    return preg_match('/^'.preg_quote($name, '/').'=["\']?([^"\'\r\n]+)/m', $env, $m) ? trim($m[1]) : null;
}

/** @return array{0:int,1:array<string,mixed>} */
function api(string $method, string $path, string $key, ?array $body = null): array
{
    $ch = curl_init('https://api.elevenlabs.io'.$path);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 120,
        CURLOPT_HTTPHEADER => ['xi-api-key: '.$key, 'Content-Type: application/json', 'Accept: application/json'],
        CURLOPT_POSTFIELDS => $body !== null ? json_encode($body) : null,
    ]);
    $raw = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    return [$status, json_decode((string) $raw, true) ?? ['raw' => substr((string) $raw, 0, 500)]];
}

/**
 * The style check: the §2 ranges of docs/history-lines-style.md, widened a little for snow and desert
 * (the Pamir plate runs 5% ink, 75% pale, 0.08). Returns what is off => the correction to ask for.
 *
 * @return array<string,string>
 */
function styleCheck(array $m): array
{
    [$ink, $pale, $sat] = $m;

    return array_filter([
        'too much black' => $ink > 14 ? 'There is too much black: keep ink to about 10% of the picture, darkness built from hatching lines, no solid black fills or dark frames.' : null,
        'too little line' => $ink < 4 ? 'The ink line is too weak: draw confident black contours and controlled hatching over the watercolour.' : null,
        'too little paper' => $pale < 30 ? 'Too little paper shows: leave 35 to 45% of the picture very pale, keep buildings and ground close to white, colour only the focal things.' : null,
        'too saturated' => $sat > 0.30 ? 'The colour is too strong: use thin transparent washes, selective colour, quieter background.' : null,
    ]);
}

/** Smoke test of the style guide §2: dark = luminance < 30%, pale = value > 85% and saturation < 18%. */
function metrics(string $bytes): array
{
    $src = imagecreatefromstring($bytes);
    $w = 384;
    $h = (int) round(imagesy($src) * $w / imagesx($src));
    $img = imagescale($src, $w, $h);
    $dark = $pale = 0;
    $sat = 0.0;
    for ($y = 0; $y < $h; $y++) {
        for ($x = 0; $x < $w; $x++) {
            $c = imagecolorat($img, $x, $y);
            $r = ($c >> 16) & 255;
            $g = ($c >> 8) & 255;
            $b = $c & 255;
            $max = max($r, $g, $b) / 255;
            $min = min($r, $g, $b) / 255;
            $s = $max > 0 ? ($max - $min) / $max : 0;
            $lum = (0.2126 * $r + 0.7152 * $g + 0.0722 * $b) / 255;
            $dark += $lum < 0.30 ? 1 : 0;
            $pale += ($max > 0.85 && $s < 0.18) ? 1 : 0;
            $sat += $s;
        }
    }
    $n = $w * $h;

    return [round($dark / $n * 100, 1), round($pale / $n * 100, 1), round($sat / $n, 2)];
}

function contactSheet(array $results, array $scenes, string $plateDir, array $models, string $path): void
{
    $cw = 640;
    $ch = 360;
    $label = 28;
    $cols = 1 + count($models);
    $rows = array_keys($results);
    $sheet = imagecreatetruecolor($cw * $cols, ($ch + $label) * count($rows) + $label);
    $bg = imagecolorallocate($sheet, 252, 249, 248);
    $ink = imagecolorallocate($sheet, 55, 43, 34);
    imagefill($sheet, 0, 0, $bg);
    foreach (array_merge(['reference plate'], $models) as $i => $title) {
        imagestring($sheet, 5, $i * $cw + 10, 6, $title, $ink);
    }
    foreach ($rows as $r => $n) {
        $y = $label + $r * ($ch + $label);
        $cells = array_merge([$plateDir.'/'.$scenes[$n]['ref']], array_map(fn ($m) => $results[$n][$m] ?? null, $models));
        foreach ($cells as $i => $file) {
            if ($file && ($im = @imagecreatefromstring(file_get_contents($file)))) {
                imagecopyresampled($sheet, $im, $i * $cw, $y + $label, 0, 0, $cw, $ch, imagesx($im), imagesy($im));
            }
        }
        imagestring($sheet, 4, 10, $y + 6, "#{$n} {$scenes[$n]['slug']}", $ink);
    }
    imagejpeg($sheet, $path, 88);
}
