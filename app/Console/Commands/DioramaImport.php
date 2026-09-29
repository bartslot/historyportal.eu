<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Scene;
use App\Services\Diorama\BlenderCamera;
use App\Services\Diorama\DioramaSpec;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use InvalidArgumentException;
use JsonException;

/**
 * Replace a scene's diorama JSON. All or nothing: any error rejects the whole file and lists
 * every problem with its JSON path, so an agent can fix them in one pass.
 *
 *   php artisan diorama:import 812 scene.json
 *   php artisan diorama:import 812 scene.json --camera=lesson_assets/.../quay_camera.json
 *   php artisan diorama:import 812 scene.json --check      # validate only, save nothing
 *
 * --camera replaces the file's camera block with a Blender camera.json from the art pipeline.
 */
class DioramaImport extends Command
{
    protected $signature = 'diorama:import
        {scene : Scene id}
        {file : Diorama JSON file}
        {--camera= : Blender <shot>_camera.json to use as the camera}
        {--check : Validate only, do not save}';

    protected $description = "Validate and save a scene's diorama JSON";

    public function handle(): int
    {
        $scene = Scene::find((int) $this->argument('scene'));
        if (! $scene) {
            $this->error("No scene with id {$this->argument('scene')}.");

            return self::FAILURE;
        }

        try {
            $spec = $this->readJson((string) $this->argument('file'));
            if ($this->option('camera')) {
                $spec['camera'] = BlenderCamera::toCamera($this->readJson((string) $this->option('camera')));
            }
        } catch (InvalidArgumentException $e) {
            $this->error($e->getMessage());

            return self::FAILURE;
        }

        $errors = DioramaSpec::errors($spec);
        if ($errors !== []) {
            $this->error(count($errors).' problem(s), nothing saved:');
            foreach ($errors as $error) {
                $this->line("  - {$error}");
            }

            return self::FAILURE;
        }

        if ($this->option('check')) {
            $this->info('Valid. Nothing saved (--check).');

            return self::SUCCESS;
        }

        $scene->update(['config' => [...($scene->config ?? []), 'diorama' => $spec]]);
        $this->info(sprintf('Saved diorama on scene %d: %d floor(s), %d item(s).', $scene->id, count($spec['floors']), count($spec['items'] ?? [])));

        return self::SUCCESS;
    }

    /** @return array<string, mixed> */
    private function readJson(string $path): array
    {
        if (! File::isFile($path)) {
            throw new InvalidArgumentException("No file at {$path}.");
        }
        try {
            $data = json_decode(File::get($path), true, 64, JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            throw new InvalidArgumentException("{$path} is not valid JSON: {$e->getMessage()}.");
        }
        if (! is_array($data)) {
            throw new InvalidArgumentException("{$path} is not a JSON object.");
        }

        return $data;
    }
}
