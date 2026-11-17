<?php

declare(strict_types=1);

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Http\Requests\Teacher\ImportTwineRequest;
use App\Services\Import\TwineImporter;
use Illuminate\Http\RedirectResponse;
use InvalidArgumentException;

/** "Import from Twine" on the new-lesson screen: the story becomes a lesson, and the editor opens on it. */
class TwineImportController extends Controller
{
    public function __invoke(ImportTwineRequest $request, TwineImporter $importer): RedirectResponse
    {
        try {
            $lesson = $importer->import((string) $request->file('story')->get(), $request->user(), $request->string('world')->toString());
        } catch (InvalidArgumentException $e) {
            return back()->withErrors(['story' => $e->getMessage()])->withInput();
        }

        return redirect()->route('teacher.lessons.wizard', ['lesson' => $lesson->id, 'step' => 3]);
    }
}
