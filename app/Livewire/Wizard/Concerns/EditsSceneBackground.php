<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Models\Scene;
use App\Services\EmbedParser;

/**
 * A scene's background is ONE thing at a time: a colour, an image, a gradient or a video
 * (Bart, 2026-09-30). The image and 3D paths already exist (EditsSceneArtwork, applyBgEmbed); this
 * adds the other three, for every scene kind that has a backdrop, quizzes included.
 *
 * What shows is decided in one order by the stage and the player alike: video > image > gradient >
 * colour. So a colour or gradient takes the picture away (it stays in the lesson's own pictures,
 * where "Reuse" finds it) and a video goes over whatever is there. Artwork layers are kept.
 *
 * Videos are never hosted by us: YouTube or Vimeo in an iframe, muted and looping (EmbedParser).
 */
trait EditsSceneBackground
{
    public function setBackgroundColor(string $hex): void
    {
        $scene = $this->backgroundScene();
        if (! $scene || ! self::isHex($hex)) {
            return;
        }
        $this->replaceBackdrop($scene, ['background_color' => strtolower($hex)], fn (array $cfg) => $this->withoutBackdropExtras($cfg));
    }

    public function setBackgroundGradient(string $from, string $to, int $angle = 180): void
    {
        $scene = $this->backgroundScene();
        if (! $scene || ! self::isHex($from) || ! self::isHex($to)) {
            return;
        }
        $gradient = ['from' => strtolower($from), 'to' => strtolower($to), 'angle' => (($angle % 360) + 360) % 360];

        // background_color = the first stop: it is the matte behind artwork layers, which draw
        // on a single colour, and what a player that predates gradients falls back to.
        $this->replaceBackdrop($scene, ['background_color' => $gradient['from']],
            fn (array $cfg) => [...$this->withoutBackdropExtras($cfg), 'background_gradient' => $gradient]);
    }

    public function setBackgroundVideo(string $link): void
    {
        $scene = $this->backgroundScene();
        if (! $scene) {
            return;
        }
        $parser = app(EmbedParser::class);
        $video = $parser->video($link);
        if (! $video) {
            $this->dispatch('toast', message: __('That doesn\'t look like a YouTube or Vimeo link.'), type: 'warning');

            return;
        }
        $embed = [
            ...$video,
            'src' => $parser->embedVideoSrc($video, ['autoplay' => true, 'controls' => false, 'loop' => true]),
            'fit' => 'cover',
        ];
        $cfg = $scene->config ?? [];
        $cfg['bg_embed'] = $embed;
        $scene->update(['config' => $cfg, 'status' => 'ready']);
        $this->selectSceneInternal($scene->id);
    }

    private function backgroundScene(): ?Scene
    {
        return $this->selectedSceneId ? $this->lesson->scenes()->find($this->selectedSceneId) : null;
    }

    /** Clear the picture (keeping artwork layers) and apply the new colour fields. */
    private function replaceBackdrop(Scene $scene, array $fields, callable $config): void
    {
        $scene->update([
            ...$fields,
            'image_path' => null,
            'shots' => $this->shotsPreservingArtwork($scene, null),
            'skybox_image_path' => null,
            'scene_view' => 'slideshow',
            'config' => $config($scene->config ?? []),
        ]);
        $this->selectSceneInternal($scene->id);
    }

    private function withoutBackdropExtras(array $cfg): array
    {
        unset($cfg['bg_embed'], $cfg['background_gradient'], $cfg['background_credit']);

        return $cfg;
    }

    private static function isHex(string $value): bool
    {
        return (bool) preg_match('/^#[0-9a-f]{6}$/i', $value);
    }
}
