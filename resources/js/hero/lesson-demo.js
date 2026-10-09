// Hero storyboard: watch a lesson get made.
//
// Two questions answer themselves, the wheel of thumbnails implodes, and the
// finished lesson lands as a card you can play. Show, do not tell — nothing here explains the
// product in words the visitor has to read.
//
// Pacing is the point. Every beat is separated by a real pause (`beat`), because a demo that cuts
// straight from one answer to the next reads as a loading screen rather than as somebody working.
// Locally, `window.heroDemo` exposes the settings live so the dev Test tools panel can dial the
// whole thing in without an edit-and-rebuild — see resources/views/livewire/dev/test-panel.blade.php.

import { gsap } from 'gsap';
import { GSAP_EASE, CONSTANT_RATE } from '../easing.js';
import { createCardwheel } from './cardwheel.js';

const STORAGE_KEY = 'hero-demo-settings';

/** Every number worth arguing about. The dev panel edits this shape and replays. */
export const DEFAULTS = {
    beat: 1.3, // pause between beats, seconds
    typeSpeed: 22, // characters per second
    inhale: 1.6, // held breath before the implosion
    windUp: 3.4, // the ring pulled into the middle, card by card
    // The story never speeds up, it just runs slow and lets the field do the accelerating.
    // Dialled in on the Test tools panel, 2026-08-01.
    timeScaleStart: 0.7,
    warpSpin: 0.35, // radians per second the wheel turns at full pull
    warpGlow: 0.34,
};

const CARET_BLINK = 0.55;

const TIMESCALE_SKIP = 14;

// What the wheel sits at while the questions are answered: a slow, faint drift that must not read
// as an animation yet.
const IDLE = { spin: 0.04, alpha: 0.3, trail: 1, glow: 0 };

const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const loadSettings = () => {
    try {
        return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch {
        return { ...DEFAULTS };
    }
};

/** Types `text` into `target` by tweening a character index, so the timeline owns the pace. */
const typeInto = (timeline, target, text, position, charactersPerSecond) => {
    const cursor = { index: 0 };

    timeline.to(cursor, {
        index: text.length,
        duration: text.length / Math.max(1, charactersPerSecond),
        ease: CONSTANT_RATE,
        onUpdate: () => {
            target.textContent = text.slice(0, Math.round(cursor.index));
        },
    }, position);
};

const loadAtlas = (img) => {
    if (img.complete && img.naturalWidth > 0) {
        return Promise.resolve(img);
    }

    return new Promise((resolve, reject) => {
        img.addEventListener('load', () => resolve(img), { once: true });
        img.addEventListener('error', reject, { once: true });
    });
};

/** The lesson has landed. The hero stops hiding its ending, and the site nav — which stepped
 *  back while the demo ran (see .site-nav in app.css) — comes forward again. */
const markRevealed = (root) => {
    root.classList.add('is-revealed');
    document.documentElement.classList.add('hero-revealed');
};

/** Put the hero back to "still building". Only the dev scrubber needs this: those two classes
 *  are one-way in normal playback, so scrubbing backwards past the reveal would otherwise leave
 *  the finished lesson sitting on top of the warp. */
const unmarkRevealed = (root) => {
    root.classList.remove('is-revealed');
    document.documentElement.classList.remove('hero-revealed');
};

const heroParts = (root) => ({
    goal: root.querySelector('[data-demo-step="goal"]'),
    audience: root.querySelector('[data-demo-step="audience"]'),
    typed: root.querySelector('[data-demo-typed]'),
    caret: root.querySelector('[data-demo-caret]'),
    chips: Array.from(root.querySelectorAll('[data-demo-chip]')),
    picked: root.querySelector('[data-demo-chip][data-demo-chip-pick]'),
    conversation: root.querySelector('[data-demo-conversation]'),
    reveal: root.querySelector('[data-demo-reveal]'),
    revealItems: Array.from(root.querySelectorAll('[data-demo-reveal] [data-reveal-item]')),
    // The flat picture of the ring. The field redraws it card by card, so it is hidden throughout.
    wheel: root.querySelector('.wheel'),
});

const buildStoryboard = (root, warp, settings) => {
    const {
        goal, audience, typed, caret, chips, picked,
        conversation, reveal, revealItems, wheel,
    } = heroParts(root);

    const { beat } = settings;
    const master = gsap.timeline({ paused: true, defaults: { ease: GSAP_EASE.enter } });

    gsap.set([goal, audience], { autoAlpha: 0, y: 14 });
    gsap.set(chips, { autoAlpha: 0, y: 10, scale: 0.94 });
    gsap.set(revealItems, { autoAlpha: 0, y: 26, scale: 1.06 });
    gsap.set(reveal, { autoAlpha: 0 });
    gsap.set(conversation, { autoAlpha: 1, scale: 1 });
    gsap.set(caret, { autoAlpha: 1 });
    chips.forEach((chip) => chip.classList.remove('is-picked'));
    typed.textContent = '';

    // The field DRAWS the wheel, card by card, so the flat picture of one would sit behind it as
    // a ghost.
    if (wheel) {
        gsap.set(wheel, { autoAlpha: 0 });
    }

    const caretPulse = gsap.to(caret, {
        autoAlpha: 0,
        duration: CARET_BLINK,
        repeat: -1,
        yoyo: true,
        ease: CONSTANT_RATE,
    });

    // ── The questions answer themselves ─────────────────────────────────────
    master
        .to(goal, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.4)
        // A real pause before anything is typed: somebody is thinking.
        .add('typing', `>+${beat}`);

    typeInto(master, typed, typed.dataset.demoTyped ?? '', 'typing', settings.typeSpeed);

    master
        .to(audience, { autoAlpha: 1, y: 0, duration: 0.5 }, `>+${beat}`)
        .to(chips, {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.45,
            stagger: 0.09,
            ease: GSAP_EASE.pop,
        }, `>+${beat * 0.6}`)
        // The choice makes itself, but only after a beat of deliberation.
        .call(() => picked?.classList.add('is-picked'), null, `>+${beat}`)
        .to(picked, { scale: 1.06, duration: 0.24, ease: GSAP_EASE.pop }, '<')
        .to(chips.filter((chip) => chip !== picked), {
            autoAlpha: 0.28,
            scale: 0.96,
            duration: 0.32,
        }, '<')
        .to(picked, { scale: 1, duration: 0.22 }, '>');

    // ── The warp ────────────────────────────────────────────────────────────
    //
    // Every dial uses an "in" ease, so the first seconds barely move and the last half-second is
    // violent. The inhale before it is the whole trick: without a floor to push off from, the
    // warp reads as "fast" and never as "here it comes".
    // Positions are always built from ONE offset off the `warp` label. Composing them as
    // afterWarp(launchAt + 0.5) produced "warp+=1.6+=0.5", which GSAP cannot parse — tweens silently
    // landed in the wrong place and the burst ran ahead of the implosion that feeds it.
    const afterWarp = (seconds) => `warp+=${Math.max(0, seconds)}`;
    const launchAt = settings.inhale;
    const brakeAt = settings.inhale + settings.windUp;
    const launch = afterWarp(launchAt);
    const brake = afterWarp(brakeAt);

    // The whole implosion is one number. `pull` eased in means the first card is tugged away
    // slowly and the last few are snatched — one at a time, accelerating, in ring order.
    master
        .addLabel('warp', `>+${beat}`)
        .call(() => caretPulse.pause(), null, 'warp')
        .to(conversation, {
            autoAlpha: 0,
            scale: 0.6,
            duration: 1.1,
            ease: GSAP_EASE.exit,
        }, launch)
        .to(warp.state, {
            pull: 1,
            duration: settings.windUp,
            ease: GSAP_EASE.exit,
        }, launch)
        .to(warp.state, {
            spin: settings.warpSpin,
            duration: settings.windUp,
            ease: GSAP_EASE.exit,
        }, launch)
        .to(warp.state, {
            glow: settings.warpGlow,
            duration: settings.windUp * 0.8,
            ease: GSAP_EASE.exit,
        }, launch)
        // The stock wheel has gone in; now the lesson itself comes back out. Overlapped on
        // purpose — the last few ring cards are still falling as the first Tasman picture
        // arrives, which is what makes it one event rather than two.
        .to(warp.state, {
            burst: 1,
            duration: settings.windUp * 0.75,
            ease: GSAP_EASE.exit,
        }, afterWarp(launchAt + settings.windUp * 0.45))
        // The last card goes in and the middle flares.
        .to(warp.state, { glow: 0.95, duration: 0.3, ease: GSAP_EASE.enter }, brake)
        .to(warp.state, { glow: 0, duration: 1, ease: GSAP_EASE.enter }, afterWarp(brakeAt + 0.3));

    // ── The lesson lands ────────────────────────────────────────────────────
    // It arrives out of the middle: the card first, then the words. Slightly overscaled,
    // settling back as the flare dies.
    master
        .addLabel('reveal', afterWarp(brakeAt + 0.35))
        .set(reveal, { autoAlpha: 1 }, 'reveal')
        .call(() => markRevealed(root), null, 'reveal')
        .call(() => caretPulse.kill(), null, 'reveal')
        .to(revealItems, {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.9,
            stagger: 0.16,
            ease: GSAP_EASE.enter,
        }, 'reveal');

    // Order restored: the ring reassembles, every card back in the seat it left. Running `pull`
    // home is literally the implosion in reverse, which is why nothing can land out of place.
    master
        .to(warp.state, {
            pull: 0,
            duration: 2.2,
            ease: GSAP_EASE.enter,
        }, 'reveal')
        .to(warp.state, {
            spin: 0.02,
            alpha: 0.55,
            duration: 2,
            ease: GSAP_EASE.enter,
        }, 'reveal');

    master.heroCaretPulse = caretPulse;

    return master;
};

/** Jump the whole hero to its finished state — reduced motion, or a visitor who skipped. */
const showFinalState = (root) => {
    const { conversation, reveal, revealItems } = heroParts(root);

    gsap.set(conversation, { autoAlpha: 0 });
    gsap.set(reveal, { autoAlpha: 1 });
    gsap.set(revealItems, { autoAlpha: 1, y: 0, scale: 1 });
    markRevealed(root);
};

export const setupHeroLessonDemo = async () => {
    const root = document.querySelector('[data-demo]');

    if (!root) {
        return;
    }

    const canvas = root.querySelector('[data-timewarp-canvas]');
    const atlas = root.querySelector('[data-timewarp-atlas]');

    if (prefersReducedMotion()) {
        showFinalState(root);

        return;
    }

    const settings = loadSettings();
    let warp = null;

    if (canvas && atlas) {
        try {
            // The lesson's own sheet is optional and must never hold up the hero: if it is
            // missing or slow, the wheel runs on the generic cards alone.
            const lessonImg = root.querySelector('[data-timewarp-lesson-atlas]');
            const lessonAtlas = lessonImg
                ? await loadAtlas(lessonImg)
                    .then((image) => ({ image, cells: Number(lessonImg.dataset.cells) || 0 }))
                    .catch(() => null)
                : null;

            warp = createCardwheel(canvas, await loadAtlas(atlas), {
                lessonAtlas: lessonAtlas?.cells ? lessonAtlas : null,
            });

            // Hide it before the first frame, not on the first tween, or the flat wheel flashes
            // behind the drawn one.
            gsap.set(root.querySelector('.wheel'), { autoAlpha: 0 });
        } catch {
            // A missing sprite must not cost the visitor the hero: fall through without particles.
            warp = null;
        }
    }

    // Without the canvas there is nothing to warp through, so skip straight to the lesson.
    if (!warp) {
        showFinalState(root);

        return;
    }

    let master = null;

    const start = () => {
        master?.heroCaretPulse?.kill();
        master?.kill();
        gsap.killTweensOf(warp.state);
        root.classList.remove('is-revealed');
        document.documentElement.classList.remove('hero-revealed');
        Object.assign(warp.state, IDLE);
        warp.restart();

        master = buildStoryboard(root, warp, settings);
        master.timeScale(settings.timeScaleStart).play();

        return master;
    };

    start();

    const skip = () => {
        if (root.classList.contains('is-revealed')) {
            return;
        }

        gsap.to(master, { timeScale: TIMESCALE_SKIP, duration: 0.3, ease: GSAP_EASE.exit });
    };

    root.querySelector('[data-demo-skip]')?.addEventListener('click', skip);

    // Live controls, but only where the dev Test tools panel is actually rendered (local, signed
    // in). No point shipping a tuning API to visitors with nothing to tune it with.
    if (document.querySelector('[data-dev-panel]')) {
        window.heroDemo = {
            settings,
            defaults: { ...DEFAULTS },
            state: warp.state,
            // The engine itself: `field.advance(seconds)` steps the wheel by hand, which is the
            // only way to inspect it in a browser whose rAF is asleep.
            field: warp,
            replay: start,
            play: () => master?.play(),
            pause: () => master?.pause(),
            seek: (fraction) => {
                if (! master) {
                    return;
                }

                const target = gsap.utils.clamp(0, 1, fraction);
                master.pause();
                master.progress(target);

                // The reveal flips two classes that a backward seek cannot undo on its own.
                const revealed = master.duration() * target >= master.labels.reveal;
                (revealed ? markRevealed : unmarkRevealed)(root);
            },
            progress: () => master?.progress() ?? 0,
            duration: () => master?.duration() ?? 0,
            save: () => localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)),
            reset: () => {
                Object.assign(settings, DEFAULTS);
                localStorage.removeItem(STORAGE_KEY);
                start();
            },
        };
    }
};
