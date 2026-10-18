<?php

/*
 * Pieter (16, the ship's boy whose eyes the Tasman script v3 tells the story through) into the
 * Tasman lesson: one new cut-out per scene, added as ONE layer to that scene's shots[0], plus the
 * balloon tail of his silent `matroos` balloons pointing at his mouth (config.lines[].figure).
 * Touches nothing else: no script, no audio, no other layer, no other line.
 *
 *   PIETER_LESSONS=63,71 php artisan tinker scripts/tasman-pieter-patch.php            # dry run
 *   PIETER_LESSONS=63,71 PIETER_APPLY=1 php artisan tinker scripts/tasman-pieter-patch.php
 *
 * Before: the art is deployed (resources/icons/history-line/figures/tasman/pieter_*.webp + meta.json
 * + cdn.json) and `php artisan icons:import --collection=history-line` has run.
 *
 * Finding the scene: by its panel's plate + the exact set of library layers already on it (the
 * story.json panel), the nearest to the scene number of prod lesson 63 (script-v3/new3.json), at
 * most MAX_DRIFT away. A scene that does not match is skipped and named, never guessed.
 * Idempotent: a scene that already holds a pieter_ layer is left alone (its lines are still
 * pointed at it). Every changed scene's old shots + config are printed as JSON for rollback:
 *   Scene::find($id)->update(['shots' => <old shots>, 'config' => <old config>]);
 * (then Cache::forget('lesson.player.<CODE>') — the player caches its payload for 30 minutes).
 */

use App\Models\Lesson;
use App\Models\Scene;
use App\Models\SvgAsset;
use App\Services\Lessons\LibraryCdn;
use App\Services\SceneLayers;

$PIETER_MAX_DRIFT = 4;

// order = scene number in prod 63 (new3.json); with = the library layers already on it (basenames);
// x / ground (feet or cut edge, % of stage) / height (%); mouth = [x, y, facing] on the picture, for his balloon.
$PIETER_SHOTS = [
    ['order' => 1, 'plate' => 'golden_bay_dusk', 'with' => ['figma_ship_moonlit', 'waka_pair'], 'fig' => 'cu_squinting_dusk', 'x' => 12, 'ground' => 104, 'height' => 40],
    ['order' => 2, 'plate' => 'deck_dusk', 'with' => [], 'fig' => 'whisper_dusk', 'x' => 40, 'ground' => 104, 'height' => 64, 'mouth' => [0.77, 0.24, 'right']],
    // Prod-only scene (not in story.json): matched by number alone, and only onto a deck plate.
    ['order' => 3, 'plate' => 'deck_*', 'with' => null, 'fig' => 'first_deck_nervous', 'x' => 72, 'ground' => 93, 'height' => 52],
    ['order' => 4, 'plate' => 'batavia_roadstead', 'with' => ['heemskerck_anchor_dusk'], 'fig' => 'back_seabag_ship', 'x' => 22, 'ground' => 103, 'height' => 62, 'mouth' => [0.74, 0.25, 'right']],
    ['order' => 5, 'plate' => 'batavia_harbour_boat', 'with' => [], 'fig' => 'carrying_pepper', 'x' => 28, 'ground' => 103, 'height' => 66, 'mouth' => [0.22, 0.15, 'left']],
    ['order' => 6, 'plate' => 'batavia_harbour_boat', 'with' => [], 'fig' => 'cu_chin_fist', 'x' => 26, 'ground' => 104, 'height' => 58, 'mouth' => [0.72, 0.34, 'right']],
    ['order' => 12, 'plate' => 'deck_harbour', 'with' => ['sailor_front'], 'fig' => 'pushing_barrel', 'x' => 68, 'ground' => 93, 'height' => 44, 'mouth' => [0.44, 0.15, 'left']],
    ['order' => 13, 'plate' => 'deck_harbour', 'with' => ['visscher_front', 'tasman_side'], 'fig' => 'carrying_crate', 'x' => 84, 'ground' => 90, 'height' => 50],
    ['order' => 14, 'plate' => 'deck_harbour', 'with' => ['sailor_side'], 'fig' => 'rail_looking_back', 'x' => 30, 'ground' => 104, 'height' => 62, 'mouth' => [0.56, 0.23, 'right']],
    ['order' => 17, 'plate' => 'mauritius_anchorage', 'with' => ['heemskerck_anchor_dusk'], 'fig' => 'mallet_nails', 'x' => 22, 'ground' => 104, 'height' => 60],
    ['order' => 18, 'plate' => 'mauritius_shore', 'with' => ['sailor_threequarter'], 'fig' => 'firewood', 'x' => 30, 'ground' => 90, 'height' => 42, 'mouth' => [0.20, 0.07, 'left']],
    ['order' => 19, 'plate' => 'mauritius_anchorage', 'with' => ['heemskerck_anchor_dusk', 'tasman_back'], 'fig' => 'wind_ahead', 'x' => 86, 'ground' => 106, 'height' => 66],
    ['order' => 21, 'plate' => 'ocean_empty_wide', 'with' => ['ships_pair_far'], 'fig' => 'back_empty_sea', 'x' => 30, 'ground' => 106, 'height' => 58],
    ['order' => 22, 'plate' => 'deck_sea_day', 'with' => ['visscher_threequarter'], 'fig' => 'asking_visscher_sun', 'x' => 22, 'ground' => 93, 'height' => 38, 'mouth' => [0.40, 0.17, 'right']],
    ['order' => 23, 'plate' => 'cabin_chart', 'with' => ['tasman_side', 'visscher_front'], 'fig' => 'finger_on_chart', 'x' => 72, 'ground' => 104, 'height' => 62],
    ['order' => 24, 'plate' => 'storm_deck', 'with' => ['tasman_pointing'], 'fig' => 'storm_freezing', 'x' => 70, 'ground' => 93, 'height' => 55],
    ['order' => 25, 'plate' => 'storm_deck', 'with' => ['sailor_front'], 'fig' => 'holding_rope_wet', 'x' => 22, 'ground' => 93, 'height' => 52, 'mouth' => [0.24, 0.12, 'right']],
    ['order' => 26, 'plate' => 'storm_deck', 'with' => ['sailor_side'], 'fig' => 'cu_fists_rope', 'x' => 78, 'ground' => 104, 'height' => 64],
    ['order' => 27, 'plate' => 'storm_morning_sea', 'with' => ['zeehaen_side_sail', 'tasman_back'], 'fig' => 'pointing_relieved', 'x' => 56, 'ground' => 101, 'height' => 60],
    ['order' => 28, 'plate' => 'cabin_chart', 'with' => ['visscher_front'], 'fig' => 'cu_uneasy_door', 'x' => 16, 'ground' => 104, 'height' => 66],
    ['order' => 29, 'plate' => 'tweendeck_night', 'with' => ['sailor_threequarter'], 'fig' => 'blanket_spoon', 'x' => 70, 'ground' => 96, 'height' => 46, 'mouth' => [0.30, 0.13, 'left']],
    ['order' => 32, 'plate' => 'deck_sea_day', 'with' => ['tasman_pointing2'], 'fig' => 'asking_up_left', 'x' => 72, 'ground' => 93, 'height' => 52, 'flip' => true, 'mouth' => [0.38, 0.10, 'right']],
    ['order' => 34, 'plate' => 'deck_rail_coast', 'with' => ['tasman_spyglass'], 'fig' => 'looking_up_mast', 'x' => 72, 'ground' => 93, 'height' => 54],
    ['order' => 35, 'plate' => 'deck_rail_coast', 'with' => ['tasman_pointing', 'visscher_threequarter'], 'fig' => 'at_rail_coast', 'x' => 88, 'ground' => 106, 'height' => 72, 'mouth' => [0.38, 0.10, 'right']],
    ['order' => 36, 'plate' => 'vdl_forest', 'with' => ['sloep_rowing', 'sailor_side'], 'fig' => 'tree_notches', 'x' => 70, 'ground' => 92, 'height' => 40, 'mouth' => [0.60, 0.09]],
    ['order' => 37, 'plate' => 'nz_high_land_sea', 'with' => [], 'fig' => 'cu_awe_mountains', 'x' => 18, 'ground' => 104, 'height' => 56],
    ['order' => 38, 'plate' => 'nz_high_land_sea', 'with' => ['tasman_holding_chart'], 'fig' => 'cu_chin_on_rail', 'x' => 76, 'ground' => 104, 'height' => 50, 'mouth' => [0.53, 0.42, 'right']],
    ['order' => 41, 'plate' => 'golden_bay_dusk', 'with' => ['waka_pair'], 'fig' => 'cu_listening_dusk', 'x' => 82, 'ground' => 104, 'height' => 58],
    ['order' => 42, 'plate' => 'deck_dusk', 'with' => ['tasman_back', 'sailor_side'], 'fig' => 'asking_tasman_dusk', 'x' => 54, 'ground' => 93, 'height' => 52, 'flip' => true],
    ['order' => 44, 'plate' => 'golden_bay_morning', 'with' => ['waka_pair', 'sloep_rowing'], 'fig' => 'hands_flat_rail', 'x' => 50, 'ground' => 104, 'height' => 64, 'mouth' => [0.58, 0.17, 'right']],
    ['order' => 45, 'plate' => 'golden_bay_morning', 'with' => ['tasman_side'], 'fig' => 'cu_shock', 'x' => 78, 'ground' => 104, 'height' => 60],
    ['order' => 46, 'plate' => 'golden_bay_morning', 'with' => ['tasman_back', 'sailor_threequarter'], 'fig' => 'cu_head_down', 'x' => 52, 'ground' => 106, 'height' => 52],
    ['order' => 47, 'plate' => 'figma_stern_night_windows', 'with' => [], 'fig' => 'night_gripping_rail', 'x' => 80, 'ground' => 104, 'height' => 50, 'mouth' => [0.37, 0.40, 'left']],
    ['order' => 49, 'plate' => 'tonga_lagoon', 'with' => ['tongan_canoes', 'sailor_front'], 'fig' => 'water_jar', 'x' => 76, 'ground' => 106, 'height' => 62],
    ['order' => 50, 'plate' => 'fiji_reef', 'with' => ['visscher_threequarter'], 'fig' => 'reef_warning', 'x' => 74, 'ground' => 106, 'height' => 56],
    ['order' => 51, 'plate' => 'batavia_quay_return', 'with' => [], 'fig' => 'arms_open_home', 'x' => 40, 'ground' => 100, 'height' => 66, 'mouth' => [0.47, 0.21, 'right']],
    ['order' => 52, 'plate' => 'voc_chamber', 'with' => ['tasman_side'], 'fig' => 'rubbing_hands', 'x' => 88, 'ground' => 88, 'height' => 44],
];

$pieterBase = fn (?string $path): string => $path === null ? '' : preg_replace('/\.[a-z0-9]+$/i', '', basename(parse_url($path, PHP_URL_PATH) ?: $path));

/** The library layers on a scene's first shot (basenames, cover excluded) and whether Pieter is already there. */
$pieterLayers = function (Scene $scene) use ($pieterBase): array {
    $layers = (array) (($scene->shots ?? [])[0]['layers'] ?? []);
    $names = [];
    foreach ($layers as $layer) {
        if (($layer['kind'] ?? null) !== 'cover') {
            $names[] = $pieterBase($layer['path'] ?? null);
        }
    }

    return $names;
};

$pieterSig = function (array $shot): string {
    $with = $shot['with'];
    if ($with !== null) {
        sort($with);
    }

    return $shot['plate'].'|'.json_encode($with);
};

/** Scenes that match a shot's plate + layers, by order. Shots sharing one signature take them in turn. */
$pieterPick = function (array $scenes, array $shot) use ($pieterBase, $pieterLayers, $pieterSig, $PIETER_SHOTS, $PIETER_MAX_DRIFT): array {
    $twins = array_values(array_filter($PIETER_SHOTS, fn ($s) => $pieterSig($s) === $pieterSig($shot)));
    $rank = array_search($shot['order'], array_column($twins, 'order'), true);
    $matches = [];
    $best = null;
    foreach ($scenes as $scene) {
        $plate = $pieterBase(($scene->shots ?? [])[0]['image_path'] ?? $scene->image_path);
        $plateOk = str_ends_with($shot['plate'], '*')
            ? str_starts_with($plate, rtrim($shot['plate'], '*'))
            : $plate === $shot['plate'];
        if (! $plateOk) {
            continue;
        }
        $others = array_values(array_filter($pieterLayers($scene), fn ($n) => ! str_starts_with($n, 'pieter_')));
        if ($shot['with'] === null) {
            if ((int) $scene->order !== $shot['order']) {
                continue;
            }
        } else {
            $want = $shot['with'];
            sort($want);
            sort($others);
            if ($want !== $others) {
                continue;
            }
        }
        $drift = abs((int) $scene->order - $shot['order']);
        if ($drift <= $PIETER_MAX_DRIFT) {
            $matches[] = $scene;
            if ($best === null || $drift < $best[1]) {
                $best = [$scene, $drift];
            }
        }
    }
    // Two panels on the same plate with the same layers (S01-B, S01-C): the n-th shot takes the n-th scene.
    if (count($twins) > 1 && count($matches) === count($twins)) {
        $best = [$matches[$rank], 0];
    }

    return $best === null ? [null, "no scene with plate {$shot['plate']} + [".implode(', ', (array) $shot['with']).'] near #'.$shot['order']] : [$best[0], ''];
};

$pieterLessons = array_filter(array_map('intval', explode(',', (string) getenv('PIETER_LESSONS'))));
$pieterApply = getenv('PIETER_APPLY') === '1';
if ($pieterLessons === []) {
    echo "Set PIETER_LESSONS=63,71 (lesson ids). Dry run unless PIETER_APPLY=1.\n";

    return;
}
echo 'Database: '.DB::connection()->getDatabaseName().($pieterApply ? ' (APPLY)' : ' (dry run)')."\n";

foreach ($pieterLessons as $lessonId) {
    $lesson = Lesson::find($lessonId);
    if (! $lesson) {
        echo "Lesson {$lessonId}: not found, skipped.\n";

        continue;
    }
    $scenes = Scene::where('lesson_id', $lessonId)->orderBy('order')->get()->all();
    echo "\n== Lesson {$lessonId} '{$lesson->title}', ".count($scenes)." scenes ==\n";
    $taken = [];
    foreach ($PIETER_SHOTS as $shot) {
        [$scene, $why] = $pieterPick($scenes, $shot);
        $label = "#{$shot['order']} pieter_{$shot['fig']}";
        if ($scene === null) {
            echo "  SKIP {$label}: {$why}\n";

            continue;
        }
        if (isset($taken[$scene->id])) {
            echo "  SKIP {$label}: scene {$scene->id} already taken by {$taken[$scene->id]}\n";

            continue;
        }
        $taken[$scene->id] = $label;
        $ref = "history-line/figures/tasman/pieter_{$shot['fig']}";
        $asset = SvgAsset::query()->where('source', 'bundled')->where('source_ref', "{$ref}.webp")->first();
        if (! $asset) {
            echo "  SKIP {$label}: no library asset {$ref}.webp (deploy the art + icons:import first)\n";

            continue;
        }

        $shots = (array) $scene->shots;
        $layers = (array) ($shots[0]['layers'] ?? []);
        if ($layers === []) {
            echo "  SKIP {$label}: scene #{$scene->order} (id {$scene->id}) has no shot to stand in\n";

            continue;
        }
        $already = in_array("pieter_{$shot['fig']}", $pieterLayers($scene), true);
        $other = array_filter($pieterLayers($scene), fn ($n) => str_starts_with($n, 'pieter_') && $n !== "pieter_{$shot['fig']}");
        if ($other !== []) {
            echo "  SKIP {$label}: scene #{$scene->order} (id {$scene->id}) already has ".implode(', ', $other)."\n";

            continue;
        }

        $newShots = $shots;
        if (! $already) {
            if (! $pieterApply) {
                echo "  ADD  {$label} -> scene #{$scene->order} (id {$scene->id})\n";
            } else {
                app(LibraryCdn::class)->ensure($asset);   // a no-op when cdn.json already gave it a URL
                $asset->refresh();
            }
            $bottom = $shot['ground'];
            $layer = SceneLayers::figure($asset, [
                'depth' => 1, 'scale' => 1, 'height' => $shot['height'], 'sway' => false,
                'x' => $shot['x'], 'y' => $shot['ground'] - $shot['height'] / 2, 'anim' => 'fade', 'color_match' => 0.3,
            ] + ($shot['ground'] <= 100 ? ['contact_shadow' => 0.5] : []) + (! empty($shot['flip']) ? ['flip' => true] : []));
            // Drawn in front of whatever stands further back, behind whatever is nearer the camera.
            $at = count($layers);
            foreach ($layers as $i => $l) {
                if (($l['kind'] ?? null) === 'figure' && ((float) ($l['y'] ?? 0) + (float) ($l['height'] ?? 0) / 2) > $bottom) {
                    $at = $i;
                    break;
                }
            }
            array_splice($layers, $at, 0, [$layer]);
            $newShots[0]['layers'] = $layers;
        } else {
            echo "  HAS  {$label} on scene #{$scene->order} (id {$scene->id})\n";
        }

        // His silent balloons: the tail points at his mouth (mirrored with the layer).
        $config = (array) ($scene->config ?? []);
        $newConfig = $config;
        $pointed = 0;
        if (isset($shot['mouth'])) {
            $flip = ! empty($shot['flip']);
            $facing = match ($shot['mouth'][2] ?? null) {
                'right' => 1, 'left' => -1, default => 0
            };
            $figure = ['asset_id' => $asset->id,
                'mouth' => [$flip ? round(1 - $shot['mouth'][0], 4) : $shot['mouth'][0], $shot['mouth'][1]],
                'facing' => $flip ? -$facing : $facing];
            foreach ((array) ($newConfig['lines'] ?? []) as $i => $line) {
                if (($line['speaker'] ?? null) === 'matroos' && ($line['figure'] ?? null) != $figure) {
                    $newConfig['lines'][$i]['figure'] = $figure;
                    $pointed++;
                }
            }
        }

        if ($newShots === $shots && $pointed === 0) {
            continue;
        }
        echo '  '.($pieterApply ? 'DONE' : 'WOULD')." scene #{$scene->order} (id {$scene->id}): ".($already ? 'layer kept' : 'layer added').", {$pointed} balloon(s) pointed\n";
        echo '    ROLLBACK '.json_encode(['id' => $scene->id, 'shots' => $shots, 'config' => $config], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n";
        if ($pieterApply) {
            // Only these two columns: script, audio and every other column stay as they are.
            Scene::whereKey($scene->id)->update(['shots' => json_encode($newShots, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), 'config' => json_encode($newConfig, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)]);
            $pieterChanged = true;
        }
    }
    // A query update fires no model events: bump the content version and drop the player's
    // 30-minute payload cache by hand, or the player keeps serving the lesson without him.
    if (! empty($pieterChanged)) {
        App\Support\LessonVersion::changed($lessonId);
        Cache::forget('lesson.player.'.strtoupper((string) $lesson->lesson_code));
        echo "  lesson {$lessonId}: content version bumped, player cache cleared\n";
    }
    $pieterChanged = false;
}
echo "\nDone.\n";
