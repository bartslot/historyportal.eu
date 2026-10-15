// "Play lesson" opens a portal in the landing page itself.
//
// The ring of cards is the rim. On the press, the foreground (poster, title, copy, buttons, header)
// leaves fast, then a round hole opens in the LANDING PAGE from the ring's centre and grows until
// no page is left. What shows through the hole is the real player, already on its title screen:
// an iframe of /lesson/{code} preloaded behind the page on hover/focus/touch of the button. When the
// hole covers the viewport the address becomes /lesson/{code} and that iframe IS the lesson — no
// navigation, so no flash, no reload jump and no second title screen. Back returns to the finished
// homepage; reload or forward loads the plain player at that address.
//
// Deliberately the inverse of oceanum.bartslot.com, where a new screen is clipped open ON TOP of the
// intro. Bart, 2026-10-15: "Make sure that the content of the page is being masked, not a new screen."
//
// How the layers stack: the iframe is a child of <html>, not <body>, at z-index -1. A mask on <body>
// makes body a stacking context that would mask the iframe too if it lived inside it. While a frame
// exists <html> gets its own background, so body paints its own opaque slate and covers the frame
// until the mask cuts through it.
//
// Every number is a dial in DEFAULTS (hero/lesson-demo.js) and on the Test tools panel.

import { gsap } from 'gsap';
import { GSAP_EASE } from '../easing.js';
import { ringInnerRadius } from './cardwheel.js';

export const PORTAL_DEFAULTS = {
    portalExit: 0.45, // the foreground leaves, s
    portalExitStagger: 0.05, // between foreground pieces, s
    portalExitLift: 12, // px the foreground rises as it goes
    // The hole waits for the foreground to be GONE: on a phone its first size is already screen-wide,
    // and opening it under the fading title stacked two titles on top of each other.
    portalOpenDelay: 0.05, // after the foreground has left (later if the lesson is not ready), s
    // ONE motion from nothing to the whole page, accelerating all the way: no stop at a first
    // size, no held breath (Bart, 2026-10-15: "fluid, so it doesn't stop, but it accelerates").
    portalGrow: 1.6, // the hole swallows the page, s
    // One hard line, not a feather (Bart, 2026-10-15). 1px rather than 0 so the circle is
    // anti-aliased instead of stair-stepped.
    portalSoftness: 1, // px feather on the hole's edge
    portalRimPull: 1, // 0 = the ring stays and is swallowed, 1 = the ring rides the hole's edge outward
    portalRimGap: 16, // px between the hole's edge and the ring's inner edge
    portalReadyTimeout: 6, // s to wait for the title screen before falling back to plain navigation
};

const FRAME_CLASS = 'lesson-portal-frame';
const HAS_FRAME = 'has-portal-frame';
const ENTERED = 'portal-entered';
const POLL_MS = 50;

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (test, timeoutMs) => {
    const until = performance.now() + timeoutMs;

    while (performance.now() < until) {
        if (test()) {
            return true;
        }

        await sleep(POLL_MS);
    }

    return false;
};

/** The player's title screen is on screen: Alpine has run, so its x-if poster and buttons exist.
 *  Polled from the moment the frame exists — its `load` event waits for every lesson asset and
 *  arrived seconds after the title screen was already up. */
const titleScreenShown = (doc) => {
    const screen = doc?.querySelector('[data-title-screen]');

    return Boolean(screen?.closest('[x-data]')?._x_dataStack && screen.getClientRects().length);
};

/** Every picture the title screen paints: <img>s, and the backdrop, which is a CSS background. */
const titlePictures = (doc) => [
    ...Array.from(doc.querySelectorAll('[data-title-screen] img'), (img) => img.currentSrc || img.src),
    ...Array.from(doc.querySelectorAll('[style*="url("]'), (el) => el.style.backgroundImage)
        .flatMap((value) => Array.from(value.matchAll(/url\(["']?([^"')]+)["']?\)/g), (match) => match[1]))
        .filter((url) => !url.startsWith('data:')),
].filter(Boolean);

/** Resolves once `url` is decoded, so the hole never opens onto a backdrop still arriving. */
const decoded = (url) => {
    const img = new Image();
    img.src = url;

    return img.decode().catch(() => {});
};

const twoFrames = (win) => new Promise((resolve) => {
    win.requestAnimationFrame(() => win.requestAnimationFrame(resolve));
});

/** The title screen is up AND finished drawing: pictures decoded, fonts in, painted. */
const titleScreenDrawn = async (frame, timeoutMs) => {
    if (!await waitFor(() => titleScreenShown(frame.contentDocument), timeoutMs)) {
        return false;
    }

    const doc = frame.contentDocument;
    routeLinksToTop(doc);
    await Promise.all([doc.fonts?.ready, ...titlePictures(doc).map(decoded)]);
    await twoFrames(frame.contentWindow);

    return true;
};

/** Links inside the player open in the window, not inside the frame (the player's own logo would
 *  otherwise load a second homepage inside the lesson). Anything the player handles itself has
 *  already called preventDefault by the time this bubbles up. */
const routeLinksToTop = (doc) => {
    doc.addEventListener('click', (event) => {
        const link = event.target.closest?.('a[href]');

        if (!link || event.defaultPrevented || link.target || link.hasAttribute('download')) {
            return;
        }

        event.preventDefault();
        window.location.assign(link.href);
    });
};

const createFrame = (url, timeoutMs) => {
    const frame = document.createElement('iframe');
    frame.className = FRAME_CLASS;
    frame.src = url;
    frame.tabIndex = -1;
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('allow', 'autoplay; fullscreen; screen-wake-lock; clipboard-write');
    frame.setAttribute('allowfullscreen', '');

    document.documentElement.classList.add(HAS_FRAME);
    document.documentElement.appendChild(frame);

    return { frame, ready: titleScreenDrawn(frame, timeoutMs) };
};

/** A round hole, `radius` to the outer edge of its feather, centred at (x, y) in the box's own px. */
const holeMask = (x, y, radius, softness) =>
    `radial-gradient(circle at ${x}px ${y}px, transparent ${radius - softness}px, #000 ${radius}px)`;

const setMask = (el, value) => {
    el.style.maskImage = value;
    el.style.webkitMaskImage = value;
};

/** Distance from (x, y) to the farthest viewport corner: the radius that leaves no page. */
const coverRadius = (x, y) => Math.max(
    Math.hypot(x, y),
    Math.hypot(window.innerWidth - x, y),
    Math.hypot(x, window.innerHeight - y),
    Math.hypot(window.innerWidth - x, window.innerHeight - y),
);

export const setupPortal = (root, { warp, settings }) => {
    const link = root.querySelector('[data-portal-play]');

    if (!link) {
        return null;
    }

    const url = link.href;
    const header = document.querySelector('[data-site-header]');
    const wheel = root.querySelector('[data-hero-wheel]');
    const canvas = root.querySelector('[data-timewarp-canvas]');
    const foreground = () => [
        ...root.querySelectorAll('[data-demo-reveal] [data-reveal-item]'),
        header,
    ].filter(Boolean);

    const homeTitle = document.title;
    let loaded = null;
    let opening = null;
    let scrollY = 0;
    let pressed = false;

    const preload = () => {
        loaded ??= createFrame(url, settings.portalReadyTimeout * 1000);

        return loaded;
    };

    /** Ring centre, in viewport px. The canvas fills the hero, and the ring is drawn at its centre. */
    const ringCentre = () => {
        const rect = (canvas ?? root).getBoundingClientRect();

        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, rect };
    };

    const innerRadius = () => {
        const { rect } = ringCentre();

        return ringInnerRadius(rect.width, rect.height);
    };

    /** Paint one frame of the opening: the hole in <body>, and the rim pushed out ahead of it. */
    const paint = (radius, inner) => {
        const centre = ringCentre();
        const body = document.body.getBoundingClientRect();

        setMask(document.body, holeMask(
            centre.x - body.left,
            centre.y - body.top,
            radius,
            settings.portalSoftness,
        ));

        if (wheel) {
            const ride = Math.max(1, (radius + settings.portalRimGap) / inner);
            gsap.set(wheel, { scale: 1 + settings.portalRimPull * (ride - 1) });
        }
    };

    /** The hole covers the viewport: the frame becomes the page. */
    const arrive = (frame, viaKeyboard) => {
        const html = document.documentElement;

        history.pushState({ heroPortal: url }, '', url);
        html.classList.add(ENTERED);
        document.title = frame.contentDocument?.title || document.title;
        frame.removeAttribute('aria-hidden');
        frame.tabIndex = 0;
        frame.title = document.title;
        warp?.pause?.();

        // Keyboard visitors land on the player's own Start button, as Tab would take them on a fresh
        // load. Mouse and touch do not: a focus ring on a button nobody aimed at is noise.
        frame.focus();
        if (viaKeyboard) {
            Array.from(frame.contentDocument?.querySelectorAll('[data-title-piece="cta"] button') ?? [])
                .find((button) => button.getClientRects().length)
                ?.focus();
        }
        opening = null;
    };

    /** Back to the homepage, exactly as it was left: finished, wheel in its seat. */
    const leave = () => {
        const html = document.documentElement;

        opening?.kill();
        opening = null;
        // Removing the frame is what stops a lesson that was playing in it.
        loaded?.frame.remove();
        loaded = null;
        html.classList.remove(ENTERED, HAS_FRAME);
        setMask(document.body, '');
        gsap.set(wheel, { clearProps: 'scale' });
        gsap.set(foreground(), { clearProps: 'opacity,visibility,transform' });
        document.title = homeTitle;
        warp?.resume?.();
        window.scrollTo(0, scrollY);
        pressed = false;
    };

    const exitForeground = () => gsap.to(foreground(), {
        autoAlpha: 0,
        y: -settings.portalExitLift,
        duration: settings.portalExit,
        stagger: settings.portalExitStagger,
        ease: GSAP_EASE.exit,
        overwrite: true,
    });

    const enter = async (viaKeyboard = false) => {
        if (opening || document.documentElement.classList.contains(ENTERED)) {
            return;
        }

        pressed = true;
        scrollY = window.scrollY;
        const { frame, ready } = preload();
        const exit = exitForeground();
        opening = exit;

        const [isReady] = await Promise.all([
            Promise.race([ready, sleep(settings.portalReadyTimeout * 1000).then(() => false)]),
            exit.then(() => sleep(settings.portalOpenDelay * 1000)),
        ]);

        if (!isReady) {
            // The lesson did not draw in time. Go there the ordinary way rather than open a hole
            // onto an empty frame.
            window.location.assign(url);

            return;
        }

        const inner = innerRadius();
        const hole = { radius: 0 };
        const centre = ringCentre();
        const draw = () => paint(hole.radius, inner);

        // Accelerating away: the page falls open into the lesson.
        opening = gsap.to(hole, {
            radius: coverRadius(centre.x, centre.y) + settings.portalSoftness,
            duration: settings.portalGrow,
            ease: GSAP_EASE.exit,
            onUpdate: draw,
            onComplete: () => arrive(frame, viaKeyboard),
        });
    };

    const onPress = (event) => {
        // New tab, new window, download: the browser's business, not ours.
        if (event.defaultPrevented || event.button !== 0
            || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
        }

        if (prefersReducedMotion()) {
            return;
        }

        event.preventDefault();
        // A click from Enter on the focused link carries no pointer: detail is 0.
        enter(event.detail === 0);
    };

    ['pointerenter', 'focus', 'touchstart'].forEach((type) => {
        link.addEventListener(type, () => {
            if (!prefersReducedMotion()) {
                preload();
            }
        }, { passive: true });
    });
    link.addEventListener('click', onPress);

    window.addEventListener('popstate', (event) => {
        const entered = document.documentElement.classList.contains(ENTERED);

        if (entered && !event.state?.heroPortal) {
            leave();
        } else if (!entered && event.state?.heroPortal) {
            // Forward into a lesson whose frame is gone: load it properly at its own address.
            window.location.reload();
        }
    });

    // Restored from the back/forward cache halfway through an opening (the fallback navigation
    // left mid-flight): put the homepage back together.
    window.addEventListener('pageshow', (event) => {
        if (event.persisted && pressed && !document.documentElement.classList.contains(ENTERED)) {
            leave();
        }
    });

    return { enter, leave, preload };
};
