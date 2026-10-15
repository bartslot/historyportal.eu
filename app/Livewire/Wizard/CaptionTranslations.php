<?php

declare(strict_types=1);

namespace App\Livewire\Wizard;

use App\Models\Lesson;
use App\Services\Captions\CaptionTranslator;
use Illuminate\Contracts\View\View;
use Livewire\Component;

/**
 * Lesson settings > Subtitle languages: make a language's subtitles ahead of class, and read and
 * correct every translated line (house rule: the teacher can change everything). An emptied line
 * goes back to the machine version, as does Reset.
 */
class CaptionTranslations extends Component
{
    public Lesson $lesson;

    public string $language = '';

    public function mount(Lesson $lesson): void
    {
        $this->authorizeTeacher($lesson);
        $this->lesson = $lesson;
        $this->language = array_key_first($this->languages()) ?? '';
    }

    /** @return array<string, string> code => endonym, without the lesson's own language */
    public function languages(): array
    {
        $source = CaptionTranslator::sourceLanguage($this->lesson);

        return array_filter(CaptionTranslator::LANGUAGES, fn (string $code) => $code !== $source, ARRAY_FILTER_USE_KEY);
    }

    public function translate(CaptionTranslator $captions): void
    {
        $this->authorizeTeacher($this->lesson);
        if (! isset($this->languages()[$this->language])) {
            return;
        }

        try {
            $captions->translateMissing($this->lesson, $this->language);
        } catch (\Throwable $e) {
            report($e);
            $this->dispatch('toast', message: __('The subtitles could not be translated. Try again later.'), type: 'error');
        }
    }

    public function saveLine(CaptionTranslator $captions, string $hash, string $text): void
    {
        $this->authorizeTeacher($this->lesson);
        $captions->correct($this->lesson, $this->language, $hash, mb_substr($text, 0, 2000));
    }

    public function resetLine(CaptionTranslator $captions, string $hash): void
    {
        $this->authorizeTeacher($this->lesson);
        $captions->correct($this->lesson, $this->language, $hash, null);
    }

    public function render(CaptionTranslator $captions): View
    {
        $rows = isset($this->languages()[$this->language]) ? $captions->editorRows($this->lesson, $this->language) : [];

        return view('livewire.wizard.caption-translations', [
            'rows' => $rows,
            'translated' => count(array_filter($rows, fn (array $r) => $r['machine'] !== null)),
        ]);
    }

    private function authorizeTeacher(Lesson $lesson): void
    {
        abort_unless((bool) auth()->user()?->canManage($lesson), 403);
    }
}
