<?php

declare(strict_types=1);

namespace App\Livewire;

use App\Support\Locales;
use Illuminate\Support\Facades\App;
use Livewire\Attributes\Title;
use Livewire\Component;

/**
 * Self-service account settings. For now this is the UI-language switcher — teachers like Leonie
 * can flip their own locale without an admin. Saving updates users.locale, which the SetLocale
 * middleware applies on every subsequent request; the full redirect re-renders the whole page (nav
 * included) in the new language.
 *
 * The language list lives in App\Support\Locales.
 */
#[Title('Account Settings')]
class Settings extends Component
{
    /** The sizes offered. Steps a person can tell apart, not a slider of near-identical values. */
    public const UI_SCALES = [90, 100, 110, 125];

    public string $locale = 'en';

    /** The language this teacher's lessons are written and narrated in. */
    public string $teaching_locale = 'en';

    /**
     * How large the interface is drawn, as a percentage the teacher recognises.
     *
     * 100 is the new normal and renders at 0.8 — the editor was designed at what a browser calls
     * 80%, and asking teachers to zoom their browser to see it as intended is not a design. The
     * base factor lives in app.css so this number stays the one a person would say out loud.
     */
    public int $ui_scale = 100;

    public function mount(): void
    {
        $this->locale = auth()->user()->locale ?? 'en';
        $this->teaching_locale = auth()->user()->teachingLocale();
        $this->ui_scale = auth()->user()->ui_scale ?? 100;
    }

    public function save(): void
    {
        // Rule derived from Locales rather than a #[Validate] literal, so adding a language cannot
        // leave the switcher accepting a value the app has no translations for.
        $this->validate([
            'locale' => ['required', Locales::validationRule()],
            'teaching_locale' => ['required', Locales::validationRule()],
            'ui_scale' => ['required', 'integer', 'in:'.implode(',', self::UI_SCALES)],
        ]);

        auth()->user()->update([
            'locale' => $this->locale,
            'teaching_locale' => $this->teaching_locale,
            'ui_scale' => $this->ui_scale,
        ]);
        App::setLocale($this->locale);

        session()->flash('saved', true);

        // Full redirect (not wire:navigate) so SetLocale re-runs and every component — including the
        // nav outside this component — re-renders in the chosen language.
        $this->redirectRoute('settings.index');
    }

    public function render()
    {
        return view('livewire.settings');
    }
}
