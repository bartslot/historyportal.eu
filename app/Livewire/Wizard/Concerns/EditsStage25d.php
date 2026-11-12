<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Models\StageWorld;
use App\Services\Editor\Cutouts;
use App\Services\Lessons\FigureMouth;
use App\Services\Stage25d\Daylight;
use App\Services\Stage25d\LayerKeys;
use App\Services\Stage25d\LibraryBundle;
use App\Services\Stage25d\SceneStill;
use App\Services\Support\SpeechBalloons;
use Illuminate\Support\Facades\Storage;
use InvalidArgumentException;
use Livewire\Attributes\On;

/**
 * Saves what a teacher changes on a stage25d scene's layers (config.stage25d.set.layers[i]): a base value
 * set from a field (`stage25d:layer`) and the keys of the timeline (setTimeline). Neither redraws the stage:
 * it already shows the edit (same rule as diorama:move).
 */
trait EditsStage25d
{
    /** The stage25d layer whose Format panel is open ('layer-3'), or null. */
    public ?string $activeStage25dLayer = null;

    /**
     * A base value of one layer: x, y, scale, rotation or opacity.
     *
     * @param  array<string,mixed>  $patch
     */
    #[On('stage25d:layer')]
    public function saveStage25dLayer(int $index, array $patch, int $sceneId): void
    {
        $scene = $this->stage25dScene();
        if ($scene?->id !== $sceneId) {
            return;   // a debounced save from a scene the teacher has since left
        }
        if (is_array($patch['cameraMotion'] ?? null)) {   // its own motion: a sway, a hand holding it, a shake
            $this->storeStage25dCameraMotion($scene, $patch['cameraMotion']);

            return;
        }
        if (array_key_exists('camera', $patch)) {   // the camera move the teacher framed on the canvas
            $this->storeStage25dCamera($scene, $patch['camera'], $patch['camera_more'] ?? []);

            return;
        }
        $layers = $scene?->config['stage25d']['set']['layers'] ?? null;
        if (! $scene || ! is_array($layers) || (! isset($layers[$index]) && ! is_array($patch['add'] ?? null) && ! isset($patch['sky']) && ! isset($patch['band']) && ! isset($patch['skyLayer']))) {
            return;
        }
        $bundle = (string) ($scene->config['stage25d']['bundle'] ?? '');
        if (is_string($patch['sky'] ?? null)) {   // the scene's sky picture
            if (LibraryBundle::assetLayer($bundle, $patch['sky']) === 'sky') {
                $config = $scene->config;
                $config['stage25d']['set']['sky'] = $patch['sky'];
                $scene->update(['config' => $config]);
                $this->selectedScene['config']['stage25d']['set']['sky'] = $patch['sky'];
            }

            return;
        }
        if (is_array($patch['band'] ?? null)) {   // a ground band of the painted landscape: another picture, or its values
            $at = $patch['band']['index'] ?? null;
            if (! is_int($at) || ! isset($scene->config['stage25d']['set']['groundBands'][$at])) {
                return;
            }
            $band = $scene->config['stage25d']['set']['groundBands'][$at];
            $asset = is_string($patch['band']['asset'] ?? null) ? LibraryBundle::asset($bundle, $patch['band']['asset']) : null;
            if ($asset !== null && LibraryBundle::isGroundBand($asset)) {   // a band takes only a strip of ground
                $band['asset'] = $asset['id'];
            }
            $this->storeStage25dSetPart($scene, ['groundBands', $at], [...$band, ...self::backdropValues($patch['band'], self::BAND_FIELDS)]);
            $this->skipQuietRender();   // values only: the stage shows them (Step3SceneConfigurator::isQuietCall)
            $this->renderedFingerprint = $this->lessonFingerprint();

            return;
        }
        if (is_array($patch['skyLayer'] ?? null)) {   // the sky picture's own values: its height, size, opacity, motion
            $sky = (array) ($scene->config['stage25d']['set']['skyLayer'] ?? []);
            $this->storeStage25dSetPart($scene, ['skyLayer'], [...$sky, ...self::backdropValues($patch['skyLayer'], self::SKY_FIELDS)]);

            return;
        }
        if (is_array($patch['add'] ?? null)) {
            $add = $patch['add'];
            $kind = $this->stage25dAssetLayer($bundle, (string) ($add['asset'] ?? ''));
            if ($kind !== null) {
                $layers[] = ['asset' => $add['asset'], 'depth' => in_array($add['depth'] ?? null, ['sky', 'bg', 'mid', 'fg', 'near'], true) ? $add['depth'] : 'mid', ...LayerKeys::clean($add)];
                $this->storeStage25dLayers($scene, $layers);
                // The stage selected it before this save landed, when the panel could not find it yet: open it now.
                $this->selectInspectorTarget('s25_layer-'.(count($layers) - 1));
            }

            return;
        }
        $values = [...LayerKeys::clean($patch), ...LayerKeys::ink($patch)];
        if (is_string($patch['asset'] ?? null) && $this->stage25dAssetLayer($bundle, $patch['asset']) !== null) {
            $values['asset'] = $patch['asset'];
        }
        if (in_array($patch['depth'] ?? null, LayerKeys::DEPTHS, true) && ($layers[$index]['depth'] ?? null) !== 'sky') {
            $values['depth'] = $patch['depth'];
        }
        if (($motion = LayerKeys::motion($patch['motion'] ?? null)) !== null) {
            $values['motion'] = $motion;
        }
        $sheet = LibraryBundle::asset($bundle, (string) ($layers[$index]['asset'] ?? ''));
        $cells = is_array($sheet) && ($sheet['kind'] ?? null) === 'animation' ? (int) ($sheet['frames'] ?? ((int) ($sheet['cols'] ?? 1) * (int) ($sheet['rows'] ?? 1))) : null;
        if (($play = LayerKeys::play($patch['play'] ?? null, $cells)) !== null) {   // an animation's speed, start and own order of frames
            $values['play'] = $play;
        }
        $keys = is_array($patch['keys'] ?? null)   // the picture editor's Bones tab saves a pose with its keys
            ? LayerKeys::sanitize($patch['keys'], max((float) ($scene->config['stage25d']['dur_s'] ?? 0), (float) $scene->duration_seconds))
            : null;
        if ($values === [] && $keys === null) {
            return;
        }
        if (isset($values['asset']) && $values['asset'] !== ($layers[$index]['asset'] ?? null)) {
            // An edited copy belongs to the picture it was made from: kept, it drew over every pose picked after it.
            unset($layers[$index]['src'], $layers[$index]['edit_state'], $layers[$index]['original_src']);
        }
        $layers[$index] = [...$layers[$index], ...$values];
        if ($keys === []) {
            unset($layers[$index]['keys']);
        } elseif ($keys !== null) {
            $layers[$index]['keys'] = $keys;
        }
        $this->storeStage25dLayers($scene, $layers);
        // Moved, sized, turned, faded or posed: the stage and its Format panel already show it (isQuietCall), and the
        // next poll must not draw it either. Anything else (a picture, a depth, keys, motion) renders as before.
        $this->skipQuietRender();
        $this->renderedFingerprint = $this->lessonFingerprint();
    }

    /** From the middle of the head to the nose, as a share of the figure's height. */
    private const NOSE_SHARE = 0.03;

    /** How far a framed camera may go (metres, lens in degrees): framing.js CAM_RANGE. */
    private const CAMERA_MAX_SHOTS = 50;

    private const CAMERA_MOTION_KINDS = ['none', 'sway', 'handheld', 'shake'];

    private const CAMERA_ROLL_MAX = 45.0;

    private const CAMERA_RANGE = ['x' => [-8.0, 8.0], 'y' => [0.3, 6.0], 'z' => [-4.0, 15.0], 'fov' => [20.0, 75.0]];

    /** The house camera (layout.ts HOUSE): what a pose field falls back to. */
    private const CAMERA_HOUSE = ['x' => 0.0, 'y' => 1.6, 'z' => 0.0, 'fov' => 50.0];

    /**
     * config.stage25d.camera: a start and an end pose, held to the camera's range; null = the still house camera.
     * The director's own fields (move, ease, dur_s, at_s) stay as they were.
     */
    /**
     * The values a framed shot takes from the browser: its two poses, held to the range, and its place in time.
     *
     * @param  array<mixed>  $shot
     * @return array<string, mixed>
     */
    private static function cameraShot(array $shot): array
    {
        $pose = function (mixed $p): array {
            $held = collect(self::CAMERA_RANGE)
                ->map(fn (array $range, string $k) => round(max($range[0], min($range[1], is_numeric($p[$k] ?? null) ? (float) $p[$k] : self::CAMERA_HOUSE[$k])), 3))
                ->all();
            $roll = is_numeric($p['roll'] ?? null) ? round(max(-self::CAMERA_ROLL_MAX, min(self::CAMERA_ROLL_MAX, (float) $p['roll'])), 3) : 0.0;

            return $roll !== 0.0 ? [...$held, 'roll' => $roll] : $held;
        };
        $time = fn (string $key): array => is_numeric($shot[$key] ?? null) ? [$key => round(max(0.0, min(3600.0, (float) $shot[$key])), 3)] : [];

        return [...$time('at_s'), ...$time('dur_s'), 'from' => $pose((array) ($shot['from'] ?? [])), 'to' => $pose((array) ($shot['to'] ?? []))];
    }

    /** @param  array<mixed>  $motion */
    private function storeStage25dCameraMotion(Scene $scene, array $motion): void
    {
        $config = $scene->config;
        if (in_array($motion['kind'] ?? null, self::CAMERA_MOTION_KINDS, true)) {
            $config['stage25d']['camera_motion'] = [
                'kind' => $motion['kind'],
                ...collect(['amount', 'speed'])->mapWithKeys(fn (string $k) => [$k => is_numeric($motion[$k] ?? null) ? round(max(0.0, min(3.0, (float) $motion[$k])), 2) : 1.0])->all(),
            ];
        } else {
            unset($config['stage25d']['camera_motion']);
        }
        if ($config !== $scene->config) {
            $this->storeStage25dConfig($scene, $config);
        }
    }

    private function storeStage25dCamera(Scene $scene, mixed $camera, mixed $more = []): void
    {
        $config = $scene->config;
        unset($config['stage25d']['camera_more']);
        if (! is_array($camera)) {
            unset($config['stage25d']['camera']);
        } else {
            $old = (array) ($scene->config['stage25d']['camera'] ?? []);
            $config['stage25d']['camera'] = ['move' => 'framed', 'ease' => 'inOut', 'at_s' => 0, ...$old, ...self::cameraShot($camera)];
            $shots = array_map(fn (mixed $s): array => ['move' => 'framed', 'ease' => 'inOut', ...self::cameraShot((array) $s)], array_slice(array_values((array) $more), 0, self::CAMERA_MAX_SHOTS));
            if ($shots !== []) {
                $config['stage25d']['camera_more'] = $shots;
            }
        }
        if ($config === $scene->config) {
            return;
        }
        $this->storeStage25dConfig($scene, $config);
    }

    /** What a ground band takes from a layer: it stands on the floor, so no Y and no angle. */
    private const BAND_FIELDS = ['x', 'z', 'scale', 'opacity'];

    /** What the sky picture takes: nothing but its motion. It is the back of the backdrop; moved, shrunk or faded it leaves
     *  a hole behind the whole scene (Bart 2026-11-03: "it's part of the background"). */
    private const SKY_FIELDS = [];

    /**
     * A backdrop's values from a patch: its fields, held to their range, and its motion.
     *
     * @param  array<string,mixed>  $patch
     * @param  list<string>  $fields
     * @return array<string,mixed>
     */
    private static function backdropValues(array $patch, array $fields): array
    {
        $values = array_intersect_key(LayerKeys::clean($patch), array_flip($fields));
        if (($motion = LayerKeys::motion($patch['motion'] ?? null)) !== null) {
            $values['motion'] = $motion;
        }

        return $values;
    }

    /**
     * One part of config.stage25d.set (a ground band, the sky's values), saved and mirrored into the open scene.
     *
     * @param  list<string|int>  $path  under set
     */
    private function storeStage25dSetPart(Scene $scene, array $path, mixed $value): void
    {
        $config = $scene->config;
        data_set($config, ['stage25d', 'set', ...$path], $value);
        if ($config === $scene->config) {
            return;
        }
        $this->storeStage25dConfig($scene, $config);
    }

    /** Save a scene's config and mirror it into the open scene: the panel opens rows the snapshot did not have. */
    private function storeStage25dConfig(Scene $scene, array $config): void
    {
        $scene->update(['config' => $config]);
        if ((int) $this->selectedSceneId === $scene->id) {
            $this->selectedScene['config']['stage25d'] = $config['stage25d'];
        }
    }

    /** The scene look sliders the panel offers, with the range each may take (engine-mvp stage25d/look.ts LOOK_RANGE). */
    private const LOOK_RANGES = [
        'sheetGrain' => [0, 1], 'groundDetail' => [0, 1], 'sunLight' => [0, 1], 'castShadow' => [0, 1], 'edgeSoft' => [0, 1],
        'cloudDrift' => [0, 1], 'housePitch' => [-6, 12],
        'groundWash' => [0, 1], 'groundGrain' => [0.5, 3], 'grass' => [0, 1], 'grassSway' => [0, 1], 'horizonBushes' => [0, 1],
        'worldReveal' => [0, 20], 'worldPaint' => [0, 1],
    ];

    /**
     * Put a ready-made world (config/worlds.php) under the scene, or take the world away (''). A world brings its sky,
     * terrain, ground strips and the backdrop and screens standing in it; every layer the teacher placed stays. Its
     * layers are marked world: true, so the next pick (or None) knows which to take away. A world from another
     * period's library only goes on a scene with no layers of its own: those pictures would not load there.
     */
    #[On('stage25d:world-pick')]
    public function pickStage25dWorld(string $world, int $sceneId): void
    {
        $scene = $this->stage25dScene();
        $preset = $world === '' ? null : $this->worldPreset($world);
        if (! $scene || $scene->id !== $sceneId || ($world !== '' && ! is_array($preset))) {
            return;
        }
        $config = $scene->config;
        $stage = $config['stage25d'];
        $set = $stage['set'] ?? ['layers' => []];
        $own = array_values(array_filter($set['layers'] ?? [], fn ($l) => empty($l['world'])));
        if ($preset !== null && ($preset['bundle'] ?? '') !== ($stage['bundle'] ?? '') && $own !== []) {
            return;
        }
        unset($stage['world']);   // a splat world (no longer offered) goes too
        if ($preset === null) {
            unset($set['groundBands'], $stage['world_id']);
            $set['layers'] = $own;
        } else {
            $parts = $preset['set'];
            $stage['bundle'] = $preset['bundle'];
            $stage['world_id'] = $world;
            unset($set['ground'], $set['groundBands'], $set['skyLayer'], $set['daylight']);   // the world's sky, not the scene's own
            $set = ['sky' => $parts['sky'] ?? null, 'groundSlots' => $parts['groundSlots']]
                + (is_array($parts['daylight'] ?? null) ? ['daylight' => $parts['daylight']] : [])
                + (empty($parts['groundBands']) ? [] : ['groundBands' => $parts['groundBands']]) + $set;
            $set['layers'] = [...array_map(fn ($l) => $l + ['world' => true], $parts['layers'] ?? []), ...$own];
            // a world may set a look value it needs (calm water strews no foam): only keys the panel offers, in range
            foreach (array_intersect_key((array) ($preset['look'] ?? []), self::LOOK_RANGES) as $key => $value) {
                [$min, $max] = self::LOOK_RANGES[$key];
                $stage['look'][$key] = max($min, min($max, (float) $value));
            }
        }
        $stage['set'] = $set;
        $config['stage25d'] = $stage;
        $this->storeStage25dConfig($scene, $config);
        $this->selectSceneInternal($scene->id);   // the stage rebuilds from the scene as saved (scene:load)
    }

    /** A world by its picker key: a ready-made one (config/worlds.php) or one this teacher saved ('mine:<id>'). */
    private function worldPreset(string $key): ?array
    {
        if (str_starts_with($key, StageWorld::KEY_PREFIX)) {
            $own = StageWorld::where('user_id', auth()->id())->find((int) substr($key, strlen(StageWorld::KEY_PREFIX)));

            return $own?->preset();
        }
        $preset = config('worlds', [])[$key] ?? null;   // the exact key: a dotted one must not reach inside

        return is_array($preset) ? $preset : null;
    }

    /** A saved world's picture: a small JPEG the stage grabbed (engine still()), at most this many bytes. */
    private const WORLD_THUMB_MAX_BYTES = 400_000;

    /**
     * Save the scene's place as a world of this teacher's (Bart 11-11): its sky, terrain, ground strips, look and every
     * layer but the characters (a world is the place, the story's people are not part of it). Balloons and the camera
     * live outside the layers, so they never come along.
     */
    public function saveStage25dWorldAs(string $name, ?string $thumb = null): void
    {
        $scene = $this->stage25dScene();
        $name = trim(strip_tags($name));
        if (! $scene || $name === '' || mb_strlen($name) > 60) {
            return;
        }
        $stage = $scene->config['stage25d'];
        $bundle = (string) ($stage['bundle'] ?? '');
        $set = (array) ($stage['set'] ?? []);
        if ($bundle === '' || (empty($set['sky']) && ! Daylight::isOwn($set)) || empty($set['groundSlots'])) {
            $this->dispatch('toast', type: 'info', message: __('Give the scene a sky and a terrain first.'));

            return;
        }
        $layers = array_values(array_map(
            fn (array $l) => array_diff_key($l, ['world' => true, 'figure' => true]),
            array_filter((array) ($set['layers'] ?? []), fn ($l) => is_array($l) && ! $this->isCharacterLayer($bundle, $l)),
        ));
        $world = StageWorld::create([
            'user_id' => auth()->id(),
            'name' => $name,
            'bundle' => $bundle,
            'parts' => [
                'set' => ['sky' => $set['sky'] ?? null, 'groundSlots' => $set['groundSlots']]
                    + (is_array($set['daylight'] ?? null) ? ['daylight' => $set['daylight']] : [])
                    + (empty($set['groundBands']) ? [] : ['groundBands' => $set['groundBands']]) + ['layers' => $layers],
                'look' => array_intersect_key((array) ($stage['look'] ?? []), self::LOOK_RANGES),
            ],
        ]);
        $jpeg = $this->worldThumb($thumb);
        if ($jpeg !== null) {
            $path = "worlds/{$world->user_id}/{$world->id}.jpg";
            Storage::disk('public')->put($path, $jpeg);
            $world->update(['thumb_path' => $path]);
        }
        // the scene now stands in that world: its tile is the chosen one, and the layers it took are the world's pieces
        // here too, so None takes them away and picking the world again does not stand them twice
        $config = $scene->config;
        $config['stage25d']['world_id'] = $world->key();
        $config['stage25d']['set']['layers'] = array_map(
            fn ($l) => is_array($l) && ! $this->isCharacterLayer($bundle, $l) ? ['world' => true] + $l : $l,
            (array) ($config['stage25d']['set']['layers'] ?? []),
        );
        $this->storeStage25dConfig($scene, $config);
        $this->selectSceneInternal($scene->id);   // the stage rebuilds from the scene as saved (scene:load)
        $this->dispatch('toast', type: 'success', message: __('World saved.'));
    }

    /** Take one of this teacher's saved worlds out of the list. Scenes built in it keep everything they have. */
    public function removeStage25dWorld(string $key): void
    {
        if (! str_starts_with($key, StageWorld::KEY_PREFIX)) {
            return;
        }
        $world = StageWorld::where('user_id', auth()->id())->find((int) substr($key, strlen(StageWorld::KEY_PREFIX)));
        if ($world === null) {
            return;
        }
        if ($world->thumb_path) {
            Storage::disk('public')->delete($world->thumb_path);
        }
        $world->delete();
    }

    /** A character: a figure of a series in the library, or a layer a balloon is grouped with. */
    private function isCharacterLayer(string $bundle, array $layer): bool
    {
        if (is_string($layer['figure'] ?? null) && $layer['figure'] !== '') {
            return true;
        }
        $asset = LibraryBundle::asset($bundle, (string) ($layer['asset'] ?? ''));

        return $asset !== null && (($asset['layer'] ?? null) === 'figure' || str_starts_with((string) ($asset['id'] ?? ''), 'fig-'));
    }

    /** The JPEG bytes of a data URL the stage grabbed, or null when it is anything else. */
    private function worldThumb(?string $dataUrl): ?string
    {
        if ($dataUrl === null || ! str_starts_with($dataUrl, 'data:image/jpeg;base64,')) {
            return null;
        }
        $bytes = base64_decode(substr($dataUrl, 23), true);
        if ($bytes === false || strlen($bytes) > self::WORLD_THUMB_MAX_BYTES) {
            return null;
        }
        $info = @getimagesizefromstring($bytes);

        return ($info['mime'] ?? null) === 'image/jpeg' ? $bytes : null;
    }

    /** At most this many ground pictures on one floor (engine-mvp stage25d/ground.ts GROUND_SLOTS_MAX). */
    private const GROUND_SLOTS_MAX = 6;

    /**
     * The floor's ground pictures near to far (config.stage25d.set.groundSlots): library ids and from how far out each
     * lies (metres). The nearest starts at 0 m; an empty list puts the scene's one ground back.
     *
     * @param  array<int,mixed>  $slots
     */
    #[On('stage25d:ground-slots')]
    public function saveStage25dGroundSlots(array $slots, int $sceneId): void
    {
        $scene = $this->stage25dScene();
        if (! $scene || $scene->id !== $sceneId) {
            return;
        }
        $clean = [];
        foreach (array_slice(array_values($slots), 0, self::GROUND_SLOTS_MAX) as $i => $slot) {
            $asset = is_array($slot) ? ($slot['asset'] ?? null) : null;
            $from = is_array($slot) ? ($slot['from_m'] ?? null) : null;
            if (! is_string($asset) || preg_match('/^[a-z0-9][a-z0-9-]{0,80}$/', $asset) !== 1 || ! is_numeric($from)) {
                return;   // one bad row: nothing saved, the stage keeps showing what it had
            }
            $clean[] = ['asset' => $asset, 'from_m' => $i === 0 ? 0.0 : max(0.0, min(2000.0, (float) $from))]
                + (($slot['flip'] ?? false) === true ? ['flip' => true] : [])
                + (is_numeric($slot['repeat'] ?? null) && (float) $slot['repeat'] !== 1.0 ? ['repeat' => max(0.25, min(8.0, (float) $slot['repeat']))] : []);
        }
        $config = $scene->config;
        if ($clean === []) {
            unset($config['stage25d']['set']['groundSlots']);
        } else {
            $config['stage25d']['set']['groundSlots'] = $clean;
            if (str_starts_with((string) ($config['stage25d']['set']['ground'] ?? ''), '#')) {
                unset($config['stage25d']['set']['ground']);   // a bare floor's colour would wash over the picture
            }
        }
        $this->storeStage25dConfig($scene, $config);
    }

    /**
     * The scene's time of day (config.stage25d.set.daylight, the Sky panel): the whole block, held to what the stage reads
     * (Daylight::clean). Null takes it away: the scene's sky picture again, lit as its tags say.
     *
     * @param  array<string,mixed>|null  $daylight
     */
    #[On('stage25d:daylight')]
    public function saveStage25dDaylight(?array $daylight, int $sceneId): void
    {
        $scene = $this->stage25dScene();
        if (! $scene || $scene->id !== $sceneId) {
            return;
        }
        if ($daylight === null) {
            $config = $scene->config;
            unset($config['stage25d']['set']['daylight']);
            if ($config !== $scene->config) {
                $this->storeStage25dConfig($scene, $config);
            }

            return;
        }
        $clean = Daylight::clean($daylight, (string) ($scene->config['stage25d']['bundle'] ?? ''));
        if ($clean !== null) {
            $this->storeStage25dSetPart($scene, ['daylight'], $clean);
        }
    }

    /** One scene look value (config.stage25d.look.<key>). */
    #[On('stage25d:look')]
    public function saveStage25dLook(string $key, mixed $value, int $sceneId): void
    {
        $scene = $this->stage25dScene();
        if (! $scene || $scene->id !== $sceneId || ! isset(self::LOOK_RANGES[$key]) || ! is_numeric($value) || ! is_finite((float) $value)) {
            return;
        }
        [$min, $max] = self::LOOK_RANGES[$key];
        $config = $scene->config;
        $config['stage25d']['look'][$key] = max($min, min($max, (float) $value));
        $scene->update(['config' => $config]);
        $this->selectedScene['config']['stage25d']['look'][$key] = $config['stage25d']['look'][$key];
    }

    /**
     * The timeline's keys for every layer (`layer-3` => keys); an empty list clears a layer's keys.
     *
     * @param  array<string,mixed>  $byLayer
     */
    private function saveStage25dKeys(array $byLayer, float $duration, int $sceneId): void
    {
        $scene = $this->stage25dScene();
        if ($scene?->id !== $sceneId) {
            return;   // the panel's stage belonged to another scene: never write its layers here
        }
        $layers = $scene?->config['stage25d']['set']['layers'] ?? null;
        if (! $scene || ! is_array($layers)) {
            return;
        }
        $config = $scene->config;
        $span = max($duration, (float) ($scene->config['stage25d']['dur_s'] ?? 0), (float) $scene->duration_seconds);
        foreach ($byLayer as $id => $keys) {
            // a layer or a ground band (band-0): each keeps its keys on itself. The sky takes none (SKY_FIELDS).
            $path = match (true) {
                preg_match('/^layer-(\d+)$/', (string) $id, $m) === 1 => isset($layers[(int) $m[1]]) ? ['layers', (int) $m[1]] : null,
                preg_match('/^band-(\d+)$/', (string) $id, $m) === 1 => isset($config['stage25d']['set']['groundBands'][(int) $m[1]]) ? ['groundBands', (int) $m[1]] : null,
                default => null,
            };
            if ($path === null || ! is_array($keys)) {
                continue;
            }
            $row = (array) data_get($config, ['stage25d', 'set', ...$path], []);
            $clean = LayerKeys::sanitize($keys, $span);
            if ($clean === []) {
                unset($row['keys']);
            } else {
                $row['keys'] = $clean;
            }
            if ($row !== [] || $path !== ['skyLayer']) {
                data_set($config, ['stage25d', 'set', ...$path], $row);
            }
        }
        if ($config !== $scene->config) {
            $this->storeStage25dConfig($scene, $config);
        }
    }

    /** A rendered frame (data:image/jpeg) for a scene of this lesson: the rail thumbnail and the player's WebGL fallback.
     *  $quiet: one of many drawn in the background: no render now (each is the whole editor); the caller refreshes once
     *  at the end, and the poll does not take each one for a change it must draw. */
    public function saveStage25dStill(int $sceneId, string $dataUrl, ?string $hash = null, bool $quiet = false): void
    {
        $scene = $this->lesson->scenes()->find($sceneId);
        if (! $scene || SceneStill::isFresh($scene)) {
            // Already has this picture: nothing to store or draw. (A render here re-morphs the timeline, which asks
            // for the picture again: that loop sent the whole editor every 3 s and froze it.)
            $this->skipQuietRender();

            return;
        }
        if (SceneStill::store($scene, $dataUrl, $hash) && (int) $this->selectedSceneId === $sceneId) {
            // The snapshot the next save is built from must not put the old picture back.
            $this->selectedScene['image_path'] = $scene->image_path;
        }
        if ($quiet) {
            $this->skipQuietRender();
            $this->renderedFingerprint = $this->lessonFingerprint();
        }
    }

    /**
     * The lesson's stage25d scenes whose rail thumbnail is missing or out of date, with what the browser needs to draw
     * them (it renders each off screen and posts the picture back through saveStage25dStill).
     *
     * @return list<array{id: int, hash: string, config: array<string, mixed>}>
     */
    public function stage25dStaleStills(): array
    {
        return $this->lesson->scenes()->where('kind', 'stage25d')->orderBy('order')->get()
            ->filter(fn (Scene $scene) => $scene->isStage25d() && ! SceneStill::isFresh($scene))
            ->map(fn (Scene $scene) => ['id' => $scene->id, 'hash' => SceneStill::hash($scene), 'config' => $scene->config['stage25d']])
            ->values()->all();
    }

    /** Distance of each depth from the camera in metres (engine-mvp stage25d/layout.ts DEPTH_Z). */
    private const DEPTH_Z = ['bg' => 70.0, 'mid' => 22.0, 'fg' => 7.0, 'near' => 3.5];

    private const DEPTH_RANK = ['sky' => 0, 'bg' => 1, 'mid' => 2, 'fg' => 3, 'near' => 4];

    /**
     * The object list's order, front first, as layer indexes. The dragged layer takes the depth of the one now behind it
     * (the one in front when it went to the very back) and keeps its apparent size; inside one depth the array order
     * is the draw order. Keys move with their layers.
     *
     * @param  list<int>  $order
     */
    public function reorderStage25dLayers(array $order, int $moved, int $sceneId, ?float $x = null, ?float $z = null, ?float $scale = null, ?array $keys = null): void
    {
        $scene = $this->stage25dScene();
        $layers = $scene?->config['stage25d']['set']['layers'] ?? null;
        if (! $scene || $scene->id !== $sceneId || ! is_array($layers)) {
            return;
        }
        $order = array_values(array_map('intval', $order));
        $all = array_keys($layers);
        $sorted = $order;
        sort($sorted);
        if ($sorted !== $all || ! in_array($moved, $order, true)) {
            return;   // a stale list (a layer was added or removed since): do nothing
        }
        $at = array_search($moved, $order, true);
        if ($z !== null) {
            // On the ground: standing nearer or farther than its neighbours is a distance; the browser worked it out
            // (and the x and scale that keep its column and its size on screen). Its band follows the distance.
            $layers[$moved] = [...$layers[$moved], ...LayerKeys::clean(['x' => $x, 'z' => $z, 'scale' => $scale]), 'depth' => self::bandOf($z)];
            if ($keys !== null && isset($layers[$moved]['keys'])) {
                // a keyed distance or size wins over the base: the browser moved the keys by the same step
                $layers[$moved]['keys'] = LayerKeys::sanitize($keys, max((float) ($scene->config['stage25d']['dur_s'] ?? 0), (float) $scene->duration_seconds));
            }
        }
        $ref = $order[$at + 1] ?? ($order[$at - 1] ?? null);
        $from = $layers[$moved]['depth'] ?? 'mid';
        $to = $ref !== null ? ($layers[$ref]['depth'] ?? $from) : $from;
        if ($z === null && ! isset($layers[$moved]['z']) && $from !== 'sky' && in_array($to, LayerKeys::DEPTHS, true) && $to !== $from) {
            $layers[$moved]['depth'] = $to;
            // The browser knows where the picture is on screen and sends the x and scale that keep it there; without them, keep its size.
            $layers[$moved] = [...$layers[$moved], ...LayerKeys::clean(['scale' => $scale ?? ($layers[$moved]['scale'] ?? 1.0) * self::DEPTH_Z[$to] / self::DEPTH_Z[$from], 'x' => $x ?? ($layers[$moved]['x'] ?? 0.5)])];
        }
        $back = array_flip(array_reverse($order));   // layer index -> place from the back
        $indexes = $all;
        usort($indexes, fn (int $a, int $b): int => [self::DEPTH_RANK[$layers[$a]['depth'] ?? 'mid'] ?? 2, $back[$a]] <=> [self::DEPTH_RANK[$layers[$b]['depth'] ?? 'mid'] ?? 2, $back[$b]]);
        $this->storeStage25dLayers($scene, array_map(fn (int $i): array => $layers[$i], $indexes));
        $this->selectSceneInternal($scene->id);
        $this->dispatch('stage25d:select', index: (int) array_search($moved, $indexes, true));
    }

    /** The depth band a distance in metres belongs to (engine-mvp stage25d/layout.ts bandOf): line weight and haze. */
    private static function bandOf(float $z): string
    {
        return $z < 4.9 ? 'near' : ($z < 12.4 ? 'fg' : ($z < 39.2 ? 'mid' : 'bg'));
    }

    /**
     * A speech balloon grouped with a character on the stage (config.lines): its tail points at the figure's head and it
     * moves along with the figure (`group`: its `at` is counted from the mouth, BalloonLayer). A layer without a speaker
     * handle gets one, named after its character. One save, so one undo takes both back.
     */
    public function addStage25dBalloon(int $index, string $kind = 'speech'): void
    {
        $scene = $this->stage25dScene();
        $layer = $scene?->config['stage25d']['set']['layers'][$index] ?? null;
        $asset = is_array($layer) ? LibraryBundle::asset((string) ($scene->config['stage25d']['bundle'] ?? ''), (string) ($layer['asset'] ?? '')) : null;
        $series = $asset !== null ? LibraryBundle::seriesOf($asset) : null;
        if ($series === null) {
            return;   // a balloon is grouped with a character, not with a tree
        }
        $config = $scene->config;
        $handle = is_string($layer['figure'] ?? null) && $layer['figure'] !== '' ? $layer['figure'] : self::freeHandle($series, $config['stage25d']['set']['layers']);
        $config['stage25d']['set']['layers'][$index]['figure'] = $handle;
        $facing = LibraryBundle::facingOf($asset) === 'left' ? -1 : 1;
        $lines = array_values((array) ($config['lines'] ?? []));
        $assetId = 'stage25d:'.$handle;
        $lines[] = [
            ...array_diff_key(SpeechBalloons::make($kind, null), ['at' => true]),
            // `whole`: the mouth is on the whole picture, not on the head box the imported lines use. No `at`: the balloon
            // finds its own place above the mouth, on the side the face looks to, or the other when that is off the stage
            'figure' => ['asset_id' => $assetId, 'mouth' => self::mouthOn((string) $scene->config['stage25d']['bundle'], $asset, $facing), 'facing' => $facing, 'whole' => true],
            'group' => true,
        ];
        $config['lines'] = $lines;
        $scene->update(['config' => $config]);

        $this->activeStage25dLayer = null;
        $this->activeBalloonId = 'bal_'.(count($lines) - 1);
        $this->panelView = 'scene';
        $this->selectSceneInternal($scene->id);
        $this->dispatch('balloon:added', id: $this->activeBalloonId);
    }

    /**
     * Where a balloon's tail points on a figure's picture (0..1): the mouth, a little towards the nose.
     *
     * @param  array<string,mixed>  $asset
     * @return array{0: float, 1: float}
     */
    private static function mouthOn(string $bundle, array $asset, int $facing): array
    {
        try {
            [$x, $y] = FigureMouth::onPicture(Storage::disk('public')->path((string) LibraryBundle::assetPath($bundle, (string) $asset['id'])));
        } catch (InvalidArgumentException) {
            [$x, $y] = [0.5, 0.13];
        }
        $tall = isset($asset['w'], $asset['h']) && $asset['w'] > 0 ? $asset['h'] / $asset['w'] : 1.0;

        return [round(max(0.0, min(1.0, $x + $facing * self::NOSE_SHARE * $tall)), 4), $y];
    }

    /**
     * A speaker handle no other layer has: the character's own name, else with a number (dorpeling-a-2).
     *
     * @param  array<int,mixed>  $layers
     */
    private static function freeHandle(string $series, array $layers): string
    {
        $taken = array_filter(array_map(fn ($l) => is_array($l) ? ($l['figure'] ?? null) : null, $layers));
        $handle = $series;
        for ($n = 2; in_array($handle, $taken, true); $n++) {
            $handle = "{$series}-{$n}";
        }

        return $handle;
    }

    /** Take a layer off the stage. Its keys go with it (they live on the layer); the stage rebuilds from the saved scene.
     *  The balloons grouped with it go too: a group is deleted as one. */
    public function removeStage25dLayer(int $index): void
    {
        $scene = $this->stage25dScene();
        $layers = $scene?->config['stage25d']['set']['layers'] ?? null;
        if (! $scene || ! is_array($layers) || ! isset($layers[$index]) || $this->isStage25dBackdrop($scene, $layers[$index])) {
            return;   // the backdrop is swapped, not deleted. The last layer may go: the scene keeps its sky and terrain (Bart 11-11)
        }
        $handle = $layers[$index]['figure'] ?? null;
        unset($layers[$index]);
        $config = $scene->config;
        $config['stage25d']['set']['layers'] = array_values($layers);
        if (is_string($handle) && ! in_array($handle, array_column($layers, 'figure'), true)) {
            $config = self::withoutGroupOf($config, 'stage25d:'.$handle);
        }
        $this->storeStage25dConfig($scene, $config);
        $this->activeStage25dLayer = null;
        $this->selectSceneInternal($scene->id);   // the stage rebuilds, the timeline re-reads the layers
        $this->dispatch('stage25d:deselect');   // or the selection box moves on to the next layer, and a second Delete takes that one
    }

    /**
     * Copy layers next to themselves (a little to the right, like an artwork layer's copy); the copies are
     * added at the end and the first one is the one left selected.
     *
     * @param  list<int>  $indexes
     */
    public function duplicateStage25dLayers(array $indexes): void
    {
        $scene = $this->stage25dScene();
        $layers = $scene?->config['stage25d']['set']['layers'] ?? null;
        if (! $scene || ! is_array($layers)) {
            return;
        }
        $first = null;
        foreach (array_slice(array_unique($indexes), 0, 20) as $i) {
            if (! isset($layers[$i]) || $this->isStage25dBackdrop($scene, $layers[$i])) {
                continue;   // one backdrop per scene
            }
            $copy = $layers[$i];
            $copy['x'] = min(3.0, (float) ($copy['x'] ?? 0.5) + 0.05);
            unset($copy['figure']);   // a second drawing of a character is not the character: no speaker handle, no balloon tail
            $layers[] = $copy;
            $first ??= count($layers) - 1;
        }
        if ($first === null) {
            return;
        }
        $this->storeStage25dLayers($scene, $layers);
        $this->selectSceneInternal($scene->id);
        $this->dispatch('stage25d:select', index: $first);
    }

    /**
     * The config without the balloons grouped with one speaker; the timeline's balloon tracks are re-keyed to match.
     *
     * @param  array<string,mixed>  $config
     * @return array<string,mixed>
     */
    private static function withoutGroupOf(array $config, string $speaker): array
    {
        $lines = array_values((array) ($config['lines'] ?? []));
        for ($i = count($lines) - 1; $i >= 0; $i--) {
            if (is_array($lines[$i]) && ! empty($lines[$i]['group']) && ($lines[$i]['figure']['asset_id'] ?? null) === $speaker) {
                array_splice($lines, $i, 1);
                if (isset($config['timeline'])) {
                    $config['timeline'] = SpeechBalloons::timelineWithout($config['timeline'], $i);
                }
            }
        }
        if ($lines === []) {
            unset($config['lines']);
        } else {
            $config['lines'] = $lines;
        }

        return $config;
    }

    private function stage25dScene(): ?Scene
    {
        $scene = $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;

        return $scene?->isStage25d() ? $scene : null;
    }

    /** @param  array<int,mixed>  $layers */
    private function storeStage25dLayers(Scene $scene, array $layers): void
    {
        $this->storeStage25dSetPart($scene, ['layers'], array_values($layers));
    }

    /** @param  array<string,mixed>  $layer  whether this layer is the scene's backdrop (LibraryBundle::isBackdrop) */
    private function isStage25dBackdrop(Scene $scene, array $layer): bool
    {
        $asset = LibraryBundle::asset((string) ($scene->config['stage25d']['bundle'] ?? ''), (string) ($layer['asset'] ?? ''));

        return $asset !== null && LibraryBundle::isBackdrop($asset);
    }

    /** A picture's library kind: the period's library, or the teacher's own cut-out (Cutouts: 'cut-<id>'). */
    private function stage25dAssetLayer(string $bundle, string $assetId): ?string
    {
        return Cutouts::layerOf($assetId, (int) auth()->id()) ?? LibraryBundle::assetLayer($bundle, $assetId);
    }
}
