/**
 * The Script panel in the scene editor (wizard step 4): its paragraph toolbar, its save rules and
 * what it says while a re-narration is being made.
 *
 * Four claims from the QA sweep, each of which is really the same mistake in a different disguise:
 * the panel showed the teacher a state that was not true.
 *
 *   1. "Rewrite text" could not be used at all. The prompt field took focus and lost it again in
 *      the same frame, because a focusout handler measured "did focus leave the panel?" against
 *      $el — which Alpine binds to the element the handler sits on (the paragraph scroller), not
 *      to the panel. Everything the teacher then typed went into the narration behind it, and was
 *      saved. On top of that the toolbar cancelled mousedown for its own field, so the field could
 *      not be clicked into either.
 *   2. Clearing a paragraph looked like it worked. The server refuses to empty a scene's narration
 *      inline, the panel said nothing, and the words came back on the next load.
 *   3. Typing a space declared the recording out of date and took the Play button away, for a
 *      change that is trimmed off before saving and can never reach the recording.
 *   4. Re-narrate went back to "not waiting" within a second of being pressed, while the job was
 *      still queued: the server re-fires scene:load as soon as it accepts the request, carrying the
 *      recording being REPLACED, and the panel took that as the answer.
 *
 * Everything here is driven with a real pointer and real keys, on a throwaway copy of a lesson, and
 * asserts on what the panel's own component believes as well as on what the teacher can see.
 *
 *   npx playwright test wizard-script-panel --project=chromium
 */
import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';

/**
 * The lesson to copy. NOT one of the fixtures another spec already uses: `lessons:test-copy` keeps
 * one child per parent and force-deletes the previous one, so two specs copying the same parent
 * delete each other's lesson mid-run. Any lesson with a narrated scene works; pin another with
 * SCRIPT_EDIT_PARENT.
 */
const PARENT = process.env.SCRIPT_EDIT_PARENT ?? 'NIGMAL';

/** Labels, in whichever of the five interface languages the signed-in teacher happens to use. */
const REWRITE_TEXT = /^(Rewrite text|Tekst herschrijven|Text umschreiben|Réécrire le texte|Riscrivi il testo)$/i;
const RECORD_BUTTON = /^(Narrate|Re-narrate|Inspreken|Opnieuw inspreken|Vertonen|Neu vertonen|Enregistrer la voix|Renarrer|Registra la voce|Rinarra)$/i;
const NARRATING = /^(Narrating…|Bezig met inspreken…|Wird aufgenommen…|Enregistrement…|Registrazione…)$/i;
const PLAY_NARRATION = /^(Play narration|Vertelstem afspelen|Erzählstimme abspielen|Écouter la narration|Riproduci la narrazione)$/i;

function artisan<T>(code: string): T {
  const out = execFileSync('php', ['artisan', 'tinker', '--execute', code], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  const line = out.trim().split('\n').reverse().find((l) => l.trim().startsWith('{') || l.trim().startsWith('['));
  if (!line) throw new Error(`artisan returned no JSON:\n${out}`);
  return JSON.parse(line.trim()) as T;
}

type SceneRow = { id: number; status: string; script: string; audio_path: string | null; fresh: boolean };

const sceneRow = (id: number) =>
  artisan<SceneRow>(`
    $s = App\\Models\\Scene::find(${id});
    echo json_encode(['id' => $s->id, 'status' => (string) $s->status, 'script' => (string) $s->script_segment,
      'audio_path' => $s->audio_path, 'fresh' => $s->hasFreshAudio()]);
  `);

/** A narrated scene of the copy, with a script long enough to edit. */
const narratedScene = (lessonId: number) =>
  artisan<{ id: number } | []>(`
    $s = App\\Models\\Lesson::findOrFail(${lessonId})->scenes()
      ->where('kind', 'narration')->whereNotNull('audio_path')->orderBy('order')->first();
    echo json_encode($s ? ['id' => $s->id] : []);
  `);

/** The bottom dock's script editor, and only it. */
const dockOf = (page: Page) => page.locator('[x-data^="scriptEditor"]');

/** What the panel itself believes, read live — the same numbers its controls are drawn from. */
const panelState = (page: Page) =>
  page.evaluate(() => {
    const el = document.querySelector('[x-data^="scriptEditor"]');
    if (!el) return null;
    const d = (window as any).Alpine.$data(el);
    const focused = document.activeElement as HTMLElement | null;
    return {
      dirty: d.dirty as boolean,
      regenerating: d.regenerating as boolean,
      promptOpen: d.promptOpen as boolean,
      focusedPara: d.focusedPara as number | null,
      focusedTag: focused?.tagName ?? null,
      focusedIsPrompt: !!focused && focused === el.querySelector('input[type=text]'),
      boxes: [...el.querySelectorAll('[data-line]')].map((b) => b.textContent ?? ''),
    };
  });

/** Every toast the app raised, in order. The panel talks to the teacher through this one event. */
async function recordToasts(page: Page, sink: Array<{ type?: string; message?: string }>) {
  await page.exposeFunction('__toastSeen', (detail: any) => { sink.push(detail ?? {}); });
  await page.addInitScript(() => {
    window.addEventListener('toast', (e: any) => (window as any).__toastSeen(e.detail));
  });
}

async function openScene(page: Page, lessonId: number, sceneId: number) {
  await page.goto(`/teacher/lessons/${lessonId}/wizard?step=4&scene=${sceneId}`, { waitUntil: 'domcontentloaded' });
  const line = dockOf(page).locator('[data-line]').first();
  await line.waitFor({ timeout: 60_000 });
  // The editor mounts a WebGL stage and a Livewire poll; give it a moment to settle before
  // driving it, so a click does not land on a panel that is still laying itself out.
  await page.waitForTimeout(5000);

  return line;
}

/** Put the caret at the very start of the focused paragraph, with keys a teacher really has. */
async function caretToStart(page: Page) {
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.press('ArrowLeft');
}

test.describe.serial('Script panel', () => {
  let lesson: { id: number; code: string };
  let sceneId: number;

  test.beforeAll(() => {
    const out = execFileSync('php', ['artisan', 'lessons:test-copy', PARENT, '--json'], { encoding: 'utf8' });
    lesson = JSON.parse(out.trim().split('\n').filter(Boolean).pop()!);
    const scene = narratedScene(lesson.id) as { id: number };
    expect(scene?.id, `the copy of ${PARENT} has no narrated scene to edit`).toBeTruthy();
    sceneId = scene.id;
  });

  test('the Rewrite text prompt takes the focus and the typing', async ({ page }) => {
    test.setTimeout(180_000);
    const line = await openScene(page, lesson.id, sceneId);
    const dock = dockOf(page);
    const before = (await line.textContent()) ?? '';

    await line.click();
    await expect.poll(async () => (await panelState(page))?.focusedPara).toBe(0);

    await dock.getByRole('button', { name: REWRITE_TEXT }).click();

    // The field is open AND has the focus, and the toolbar is still there to hold it.
    const prompt = dock.locator('input[type=text]').first();
    await expect(prompt).toBeVisible();
    await expect.poll(async () => (await panelState(page))?.focusedIsPrompt,
      { timeout: 5000, message: 'the Rewrite text prompt never took the focus' }).toBe(true);
    expect((await panelState(page))?.focusedPara, 'the toolbar closed itself while opening its own field').not.toBeNull();

    // What the teacher types goes into the prompt, and NOT into the narration behind it.
    await page.keyboard.type('make it shorter');
    await expect(prompt).toHaveValue('make it shorter');
    expect(await line.textContent(), 'the typed prompt landed in the narration').toBe(before);

    // And the field can be clicked into, which the toolbar's mousedown handler used to prevent.
    await page.keyboard.press('Escape');
    await line.click();
    await dock.getByRole('button', { name: REWRITE_TEXT }).click();
    await expect(prompt).toBeVisible();
    await prompt.click();
    expect((await panelState(page))?.focusedIsPrompt, 'a click on the prompt field did not focus it').toBe(true);
  });

  test('clearing a paragraph is refused out loud, and the words come back', async ({ page }) => {
    test.setTimeout(180_000);
    const toasts: Array<{ type?: string; message?: string }> = [];
    await recordToasts(page, toasts);

    const stored = sceneRow(sceneId).script;
    const line = await openScene(page, lesson.id, sceneId);

    await line.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await expect(line).toHaveText('');

    // Blur by clicking the canvas above the panel.
    await page.mouse.move(950, 300);
    await page.mouse.down();
    await page.mouse.up();

    await expect.poll(() => toasts.filter((t) => t.type === 'warning').length,
      { timeout: 10_000, message: 'emptying the narration said nothing at all' }).toBeGreaterThan(0);
    await expect.poll(async () => (await panelState(page))?.boxes.join('\n\n'),
      { timeout: 10_000, message: 'the panel kept showing an empty script that was never saved' }).toBe(stored);
    expect(sceneRow(sceneId).script, 'an inline edit emptied the stored narration').toBe(stored);
  });

  test('typing whitespace does not declare the recording out of date', async ({ page }) => {
    test.setTimeout(180_000);
    const dock = dockOf(page);
    const line = await openScene(page, lesson.id, sceneId);

    // A scene with matching audio opens on Play.
    await expect(dock.getByRole('button', { name: PLAY_NARRATION })).toBeVisible();

    await line.click();
    await caretToStart(page);
    await page.keyboard.type('   ');
    await page.waitForTimeout(500);

    const state = await panelState(page);
    expect(state?.boxes[0]?.startsWith('   '), 'the spaces never reached the box').toBe(true);
    expect(state?.dirty, 'three spaces marked the recording stale, and it is trimmed off before saving').toBe(false);
    await expect(dock.getByRole('button', { name: PLAY_NARRATION }),
      'the Play button was taken away over whitespace').toBeVisible();
    await expect(dock.getByRole('button', { name: RECORD_BUTTON })).toBeHidden();

    // A real character still does mark it stale, so this is not just a dead flag.
    await page.keyboard.type('X');
    await expect.poll(async () => (await panelState(page))?.dirty,
      { timeout: 5000, message: 'a real edit no longer marks the recording stale' }).toBe(true);
    await expect(dock.getByRole('button', { name: RECORD_BUTTON })).toBeVisible();
  });

  test('an edit the allowance refuses is not written down as saved', async ({ page }) => {
    test.setTimeout(240_000);
    const toasts: Array<{ type?: string; message?: string }> = [];
    await recordToasts(page, toasts);
    const words = ' Zijn broer Theo betaalde alles.';
    const grantTag = `pw-script-panel-${Date.now()}`;

    // Everything this test spends is put back in the finally: the lesson's own counter, and any
    // ledger row written while it ran. It runs against a real teacher's wallet.
    const opening = artisan<{ spent: number; lastCredit: number }>(`
      $l = App\\Models\\Lesson::findOrFail(${lesson.id});
      echo json_encode(['spent' => (int) $l->narration_edit_characters,
        'lastCredit' => (int) App\\Models\\NarrationCredit::where('teacher_id', $l->teacher_id)->max('id')]);
    `);

    try {
      // Spend the whole allowance — the lesson's free characters AND the teacher's credits — so
      // that the next edit is refused for the reason a real teacher hits.
      const drained = artisan<{ remaining: number }>(`
        $l = App\\Models\\Lesson::findOrFail(${lesson.id});
        $l->update(['narration_edit_characters' => App\\Support\\NarrationBudget::FREE_CHARACTERS_PER_LESSON]);
        $ledger = app(App\\Services\\Billing\\NarrationCreditLedger::class);
        $balance = $ledger->balanceFor($l->teacher);
        if ($balance > 0) { $ledger->recordSpend($l, $balance); }
        echo json_encode(['remaining' => App\\Support\\NarrationBudget::remainingFor($l->refresh())]);
      `);
      expect(drained.remaining, 'the allowance was not actually spent').toBe(0);

      const stored = sceneRow(sceneId).script;
      const line = await openScene(page, lesson.id, sceneId);

      await line.click();
      await page.keyboard.press('End');
      await page.keyboard.type(words);
      await page.mouse.move(950, 300);
      await page.mouse.down();
      await page.mouse.up();

      await expect.poll(() => toasts.filter((t) => t.type === 'warning').length,
        { timeout: 10_000, message: 'the refused edit said nothing' }).toBeGreaterThan(0);
      expect(sceneRow(sceneId).script, 'a refused edit was stored anyway').toBe(stored);

      // The teacher buys credits. Their words are still on screen, so the next save has to be
      // attempted for real: the panel used to write a refused edit down as saved, which turned
      // every later attempt into a silent no-op and lost the work on the next load.
      artisan(`
        $l = App\\Models\\Lesson::findOrFail(${lesson.id});
        app(App\\Services\\Billing\\NarrationCreditLedger::class)->grantFromStripe($l->teacher, 5000, '${grantTag}');
        echo json_encode(['remaining' => App\\Support\\NarrationBudget::remainingFor($l->refresh())]);
      `);

      await line.click();
      await page.mouse.move(950, 300);
      await page.mouse.down();
      await page.mouse.up();

      await expect.poll(() => sceneRow(sceneId).script,
        { timeout: 15_000, intervals: [1000], message: 'the panel never tried to save the refused edit again' })
        .toContain(words.trim());
    } finally {
      artisan(`
        $l = App\\Models\\Lesson::findOrFail(${lesson.id});
        $l->update(['narration_edit_characters' => ${opening.spent}]);
        App\\Models\\NarrationCredit::where('teacher_id', $l->teacher_id)
          ->where('id', '>', ${opening.lastCredit})->delete();
        echo json_encode(['ok' => true]);
      `);
    }
  });

  test('Re-narrate keeps saying it is narrating while the job is queued', async ({ page }) => {
    test.setTimeout(180_000);
    const dock = dockOf(page);

    // Start from a scene whose recording matches its words, so the panel opens on Play.
    artisan(`
      $s = App\\Models\\Scene::find(${sceneId});
      $s->update(['status' => 'ready', 'audio_script_hash' => sha1((string) $s->script_segment)]);
      echo json_encode(['ok' => true]);
    `);

    const line = await openScene(page, lesson.id, sceneId);
    await line.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' De brieven vertellen de rest.');
    await expect.poll(async () => (await panelState(page))?.dirty, { timeout: 5000 }).toBe(true);

    try {
      await dock.getByRole('button', { name: RECORD_BUTTON }).click();

      // It really started: the control says so in the teacher's own language.
      await expect(dock.getByRole('button', { name: NARRATING }),
        'pressing Re-narrate never showed that anything was happening').toBeVisible({ timeout: 10_000 });

      // And it keeps saying so for as long as the recording is still being made. Without a queue
      // worker the job simply sits there, which is exactly the state this pins; with one running,
      // the loop stops as soon as the scene really is re-narrated.
      for (let i = 0; i < 6; i++) {
        await page.waitForTimeout(1000);
        const row = sceneRow(sceneId);
        if (row.fresh) break;   // a worker finished it — nothing left to wait for
        const state = await panelState(page);
        expect(state?.regenerating,
          'the panel stopped waiting while the recording was still being made').toBe(true);
        expect(state?.dirty,
          'the panel called the old recording current while the new one was still queued').toBe(true);
        await expect(dock.getByRole('button', { name: PLAY_NARRATION }),
          'the panel offered to play the recording it had just asked to replace').toBeHidden();
      }
    } finally {
      artisan(`
        DB::table('jobs')->delete();
        App\\Models\\Scene::where('id', ${sceneId})->update(['status' => 'ready']);
        echo json_encode(['ok' => true]);
      `);
    }
  });
});
