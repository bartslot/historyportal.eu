# Scene types are templates of layers

> Plan. Nothing here is built. `/plan` and WAIT.

**Bart, 2026-08-24:**

> "I want a group of Text 'Templates', we call them scene types, but essentially they are templates
> consisting of layers (like in apple keynote). This makes our system more logical is my belief.
> now it's a bit strange that some things can be deleted, and some things not."

---

## The strangeness is real, and here is where it lives

`objectList()` (`step3-scene-configurator.blade.php:1107`) lists the scene's layers and then PINS
rows that are not layers at all:

```js
items.push({ id: '__gallery__',  label: 'Gallery',  bg: true, voyage: 'gallery' })
items.push({ id: '__waypoint__', label: 'Waypoint', bg: true, voyage: 'waypoint' })
items.push({ id: '__bg__',       label: objKind === 'gallery' ? 'Slideshow' : 'Background', bg: true })
```

Those cannot be deleted, cannot be reordered, and until this week could not be animated. Meanwhile
a dragged-in icon can be all three. Two kinds of thing in one list, told apart by nothing the
teacher can see.

It is not one bad decision, it is the consequence of `kind` being a BEHAVIOUR. `Step3SceneConfigurator`
branches on `$scene->kind === 'voyage'` in a dozen places; a Gallery scene renders a slideshow
because it is a Gallery scene, and so the slideshow cannot be removed without the scene ceasing to
make sense.

## What a scene type becomes

**A template: the layers a scene STARTS with.** After creation there is no such thing as a special
layer — Keynote's model exactly, where a slide layout hands you placeholders and from then on they
are just objects you can move, restyle or throw away.

```
Add scene → "Text block"  →  scene with layers: [ background, paragraph, highlight ]
Add scene → "Map"         →  scene with layers: [ map, camera ]
Add scene → "Gallery"     →  scene with layers: [ slideshow ]
```

Consequences, all of them wanted:

- **Everything is deletable.** Delete the map from a Map scene and you have an empty stage — which
  is fine, and is what "the canvas is a blackboard" already requires
  (`feedback-canvas-is-a-blackboard`).
- **Everything is animatable**, because the timeline already lists objects and the registry already
  keys per object kind. A background becomes a layer with properties like any other.
- **One list, one set of rules.** No pinned rows, no `bg: true`.
- **New templates cost a definition, not a branch.** "Text block", "Title and quote", "Compare two
  pictures" are data, not new `kind` values with new code paths.

## The first template, and why it is nearly free

**Text block with highlight** — the mechanic in Bart's three screenshots: a paragraph sits muted,
and a highlight walks the clause being spoken.

We already have everything it needs. `narration-clock.js` turns `scenes.audio_alignment` into word
spans with start and end times, and `shot-sync.js` already maps a verbatim sentence to a timestamp.
So the highlight does not have to be keyframed by hand at all:

- the teacher writes the paragraph and marks the clause to emphasise
- the clause is matched against the alignment, exactly as `resolveAnchorTime` already does
- the highlight's in and out times ARE the first and last word's times

Which is the whole argument for this direction in one example: a template is a set of layers plus
the timing we can already derive, and the teacher does nothing but choose the words.

## Route

1. **Layer kinds for the things that are currently pinned** — `background`, `slideshow`, `map`,
   `waypoint`, `gallery` become layer kinds with their own property sets in `anim/properties.js`.
   No behaviour change yet; they simply become listable objects.
2. **`objectList()` stops pinning.** One list. Delete works on everything. This is the change that
   removes the strangeness, and it is the risky one — every `kind ===` branch that assumed a
   background exists has to tolerate its absence.
3. **A template is data.** `resources/scene-templates/*.php` (or a `SceneTemplate` enum + factory):
   a name, an icon, and the layers to create. `addScene()` stops branching on kind and applies a
   template.
4. **Text block with highlight**, as the first template that is genuinely new, with the highlight
   timed off the narration clock.
5. **Existing scenes keep working.** `kind` stays on the row as a label and for the player; the
   editor stops treating it as behaviour. Migration is additive — a scene with no explicit layers
   gets them derived from its kind on first open.

## Open questions for Bart

- Does the PLAYER also become template-driven, or does it keep rendering by `kind` for now? My
  instinct: editor first, player unchanged, because a lesson that plays is worth more than an
  elegant one that does not.
- Should a template be editable by a teacher ("save this scene as a template")? Powerful, and it is
  a different feature; I would not build it in the same pass.

## Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| Removing pinned rows breaks scenes that assume a background | Dozens of `kind ===` branches | Step 2 alone, behind a flag, with the full Playwright wizard suite |
| A published lesson renders differently after migration | Teachers have 10 Canon lessons live | Derive layers from `kind` so the default is byte-identical |
| Scope | This touches the largest file in the app | Steps 1 and 4 are independently useful; stop after either |
