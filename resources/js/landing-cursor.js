import { gsap } from 'gsap';
import { GSAP_EASE } from './easing.js';

export const isHeroBackgroundHover = (eventTarget) => {
    const hero = document.querySelector('#home');

    if (!hero) {
        return false;
    }

    const element = eventTarget instanceof Element ? eventTarget : null;

    if (!element || !hero.contains(element)) {
        return false;
    }

    return !element.closest('.hero-copy, .hero-cta, [data-portal-signup], header, nav, a, button, input, textarea, select, label');
};

export const setupLandingCursor = () => {
    const cursor = document.querySelector('.landing-cursor');

    if (!cursor || !window.matchMedia('(pointer: fine)').matches) {
        return;
    }

    // `x`/`y`, NOT `left`/`top`. Those two are layout properties, so every frame of every mouse
    // move re-laid-out a positioned element — and pointermove does not set `hadRecentInput`, which
    // means the browser counted each one toward Cumulative Layout Shift. Moving the mouse for a few
    // seconds was enough to log ninety-odd shift entries and climb the score without limit.
    // A transform is composited: it moves the dot without touching layout at all.
    const xTo = gsap.quickTo(cursor, 'x', { duration: 0.12, ease: GSAP_EASE.enter });
    const yTo = gsap.quickTo(cursor, 'y', { duration: 0.12, ease: GSAP_EASE.enter });
    const scaleTo = gsap.quickTo(cursor, 'scale', { duration: 0.2, ease: GSAP_EASE.enter });
    let isMouseDown = false;
    let isBackgroundHover = false;

    const syncCursorState = () => {
        const idleScale = isBackgroundHover ? 1.26 : 1;
        const activeScale = isBackgroundHover ? 1.58 : 1.45;
        scaleTo(isMouseDown ? activeScale : idleScale);
        cursor.classList.toggle('landing-cursor--portal-bg', isBackgroundHover);
    };

    // Centre the dot on the pointer from inside the same transform that moves it. Hidden until
    // the mouse first moves: parked mid-screen it sat on the poster like a stray white dot.
    gsap.set(cursor, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    let hasMoved = false;

    const moveCursor = (x, y, target) => {
        isBackgroundHover = isHeroBackgroundHover(target);
        if (!hasMoved) {
            hasMoved = true;
            gsap.set(cursor, { x, y });   // appear under the pointer, not glide in from a corner
        }
        xTo(x);
        yTo(y);
        syncCursorState();
        // Fully opaque. At 0.9 over a near-black page the dot reads as grey, not as a light source.
        gsap.to(cursor, { autoAlpha: 1, duration: 0.08, ease: GSAP_EASE.enter, overwrite: 'auto' });
    };

    window.addEventListener('pointermove', (event) => {
        // A touch or pen on a hybrid laptop is not a mouse: no dot follows a finger.
        if (event.pointerType && event.pointerType !== 'mouse') {
            return;
        }
        moveCursor(event.clientX, event.clientY, event.target);
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
        isBackgroundHover = false;
        cursor.classList.remove('landing-cursor--portal-bg');
        scaleTo(0.7);
        if (hasMoved) {
            gsap.to(cursor, { autoAlpha: 1, duration: 0.18, ease: GSAP_EASE.enter, overwrite: 'auto' });
        }
    });

    window.addEventListener('mousedown', () => {
        isMouseDown = true;
        syncCursorState();
    });

    window.addEventListener('mouseup', () => {
        isMouseDown = false;
        syncCursorState();
    });
};
