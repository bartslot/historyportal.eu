<?php

declare(strict_types=1);

namespace App\Livewire\Wizard\Concerns;

use App\Enums\TitlePosition;
use App\Models\Lesson;
use App\Services\Support\WebpEncoder;
use App\Support\TitlePoster;

/**
 * The title screen as the pinned first item of the editor's scene rail.
 *
 * It is not a scene: it cannot be deleted or moved, and the stage shows the real player's title
 * screen (embedded) rather than a copy. Its Format panel sets the lesson's title picture, where
 * the title sits, how the title is drawn (a comic candidate, logo, plain), whether the lesson-type badges and the
 * join QR show. The editor opens on it.
 */
trait EditsTitleScreen
{
    public bool $titleSelected = false;

    /**
     * The player URL the stage frames while the title is selected. The `v` changes with every
     * title setting, so the frame reloads exactly when there is something new to show.
     */
    public string $titleFrameSrc = '';

    /** A picture the teacher uploads for the title screen (the component uses WithFileUploads). */
    public $titleUpload = null;

    public function refreshTitleFrame(): void
    {
        $this->titleFrameSrc = $this->lesson->titlePreviewSrc();
    }

    public function selectTitle(): void
    {
        $this->titleSelected = true;
        $this->panelView = 'scene';
        $this->activeTextId = null;
        $this->activeLayerId = null;
    }

    /**
     * A text or layer picked on the canvas belongs to a scene, so the title is no longer what is
     * being edited. One rule here instead of one line at every place a selection is made.
     */
    public function renderingEditsTitleScreen(): void
    {
        if ($this->activeTextId !== null || $this->activeLayerId !== null) {
            $this->titleSelected = false;
        }
    }

    /** One of the lesson's own pictures, the same set the poster picker offers. */
    public function selectTitleImage(string $url): void
    {
        $url = trim($url);
        $isOwn = collect($this->lesson->posterCandidates())->contains(fn ($c) => $c['url'] === $url);
        if ($url === '' || ! $isOwn) {
            return;
        }
        $this->lesson->update(['title_image' => preg_replace('#^(?:https?:)?//[^/]+(?=/storage/)#i', '', $url)]);
        $this->lesson->refresh();
        $this->refreshTitleFrame();
    }

    /**
     * The title text from its two parts as the panel shows them: the series, and the subtitle after
     * ": " (Lesson::titleParts, the player's splitTitle). This lesson only: each translation is a
     * lesson of its own with its own title. Never emptied, never cut.
     */
    public function setTitleText(string $series, string $subtitle): void
    {
        $series = trim($series);
        $subtitle = trim($subtitle);
        $title = $subtitle === '' ? $series : "{$series}: {$subtitle}";
        if ($series === '' || mb_strlen($title) > Lesson::TITLE_MAX_CHARS) {
            return;
        }
        $this->lesson->update(['title' => $title]);
        $this->lesson->refresh();
        $this->refreshTitleFrame();
    }

    /** The teacher's own picture: stored like any upload (WebP), then the title screen's picture. */
    public function updatedTitleUpload(): void
    {
        $this->validate(['titleUpload' => 'image|mimes:jpg,jpeg,png,webp,gif|max:8192']);   // 8 MB
        $path = WebpEncoder::storeUpload($this->titleUpload, "lessons/{$this->lesson->id}/uploads");
        $this->reset('titleUpload');
        $this->lesson->update(['title_image' => '/storage/'.$path]);
        $this->lesson->refresh();
        $this->refreshTitleFrame();
    }

    /** Back to the automatic lead image. */
    public function resetTitleImage(): void
    {
        $this->lesson->update(['title_image' => null]);
        $this->lesson->refresh();
        $this->refreshTitleFrame();
    }

    public function setTitlePosition(string $position): void
    {
        $value = TitlePosition::tryFrom($position);
        if ($value === null) {
            return;
        }
        $this->lesson->update(['title_position' => $value]);
        $this->lesson->refresh();
        $this->refreshTitleFrame();
    }

    /** Only a style this lesson can show: one of the series' candidates, its logo, or plain. */
    public function setTitleStyle(string $style): void
    {
        if (! in_array($style, array_column($this->lesson->titleChoices(), 'key'), true)) {
            return;
        }
        $this->lesson->update(['title_style' => $style]);
        $this->lesson->refresh();
        $this->refreshTitleFrame();
    }

    /** Back to the default: the series' first candidate. */
    public function resetTitleStyle(): void
    {
        $this->lesson->update(['title_style' => null]);
        $this->lesson->refresh();
        $this->refreshTitleFrame();
    }

    /** The lesson-type badges (Interactief, Stripverhaal, Teams) on or off; on is the default. */
    public function setShowLessonTypes(bool $show): void
    {
        $this->lesson->update(['show_lesson_types' => $show]);
        $this->lesson->refresh();
        $this->refreshTitleFrame();
    }

    /** The join QR on or off. Its place is not a choice: the bottom rail's right end (title-qr.js). */
    public function setShowQr(bool $show): void
    {
        $this->lesson->update(['show_qr' => $show, 'qr_position' => null]);
        $this->lesson->refresh();
        $this->refreshTitleFrame();
    }

    /** One of the "what you can expect" lines; an empty line drops out, the rest close up. */
    public function setExpectLine(int $index, string $text): void
    {
        if ($index < 0 || $index >= Lesson::EXPECT_MAX_LINES) {
            return;
        }
        $lines = array_pad(array_values((array) ($this->lesson->expect ?? [])), Lesson::EXPECT_MAX_LINES, '');
        $lines[$index] = $text;
        $this->lesson->update(['expect' => Lesson::cleanExpect($lines)]);
        $this->lesson->refresh();
        $this->refreshTitleFrame();
    }

    /** Back to the lines the lesson was composed with (its spec); none for a lesson without one. */
    public function resetExpect(): void
    {
        $this->lesson->update(['expect' => $this->lesson->expect_default ?: null]);
        $this->lesson->refresh();
        $this->refreshTitleFrame();
    }
}
