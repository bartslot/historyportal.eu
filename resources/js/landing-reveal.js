import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GSAP_EASE } from './easing.js';

gsap.registerPlugin(ScrollTrigger);

/**
 * Landing sections open as you scroll to them, once, like a story turning a page.
 *
 * The feeling is curiosity, not spectacle: calm, sure, no bounce. One entrance for everything (rise
 * and fade in, GSAP_EASE.enter), three durations (small, card, heading), and each section plays
 * the first time it comes into view and never again.
 *
 * Markup opts in with data-reveal on the element to animate:
 *   heading  words rise out from under the line, one after another (a film title card)
 *   text     a sentence that follows its heading
 *   cards    a carousel row: cards dealt in from the left, the painting settling from a slight zoom
 *   tiers    the pricing cards: they rise, the featured plan arrives last, a beat later
 *   glow     a background light that fades up slowly behind its section
 *   cta      a button that follows its heading
 *
 * Starting states are set here, never in CSS, so a page whose script fails shows everything.
 * People who ask for reduced motion get the page as it is, nothing moves.
 */

/** The numbers. Every one is live in Test tools → Settings → Landing motion. */
const MOTION = {
    small: 0.5,          // s: a sentence, a button
    card: 0.8,           // s: a card rising
    slow: 1.1,           // s: heading words, a painting settling, the glow
    rise: 28,            // px: how far a card or sentence travels up
    wordStagger: 0.06,   // s between heading words
    cardStagger: 0.07,   // s between cards (a row of 8 is dealt in under 0.5 s)
    settle: 1.06,        // painting's starting zoom inside its card
    featuredDelay: 0.15, // s: the featured plan's extra beat
    start: 'top 82%',    // a section plays when its top crosses this line of the viewport
};

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Wrap each word in a clipping mask so it can rise into view from under its own baseline. */
function splitWords(heading) {
    if (heading.dataset.revealSplit) {
        return heading.querySelectorAll('[data-reveal-word]');
    }
    const words = heading.textContent.trim().split(/\s+/);
    heading.textContent = '';
    words.forEach((word, i) => {
        const mask = document.createElement('span');
        // a little room below the mask so descenders (g, y, p) are not clipped
        mask.style.cssText = 'display:inline-block;overflow:hidden;vertical-align:bottom;padding-bottom:0.14em;margin-bottom:-0.14em';
        const inner = document.createElement('span');
        inner.style.display = 'inline-block';
        inner.dataset.revealWord = '';
        inner.textContent = word;
        mask.appendChild(inner);
        heading.appendChild(mask);
        if (i < words.length - 1) {
            heading.appendChild(document.createTextNode(' '));
        }
    });
    heading.dataset.revealSplit = '1';
    return heading.querySelectorAll('[data-reveal-word]');
}

/**
 * A tween that leaves no trace: CSS hover transitions on the same element are paused while it runs
 * (otherwise they would smooth every GSAP frame into a lag), and its inline styles are removed at the
 * end so hover effects work exactly as before.
 */
function enter(targets, from, opts) {
    return gsap.fromTo(targets, { ...from, transition: 'none' }, {
        ...Object.fromEntries(Object.keys(from).map((k) => [k, k === 'opacity' ? 1 : k === 'scale' ? 1 : 0])),
        ease: GSAP_EASE.enter,
        clearProps: [...Object.keys(from), 'transition'].join(','),
        ...opts,
    });
}

const builders = {
    heading: (el, tl) => tl.add(enter(splitWords(el), { yPercent: 105 }, { duration: MOTION.slow, stagger: MOTION.wordStagger }), 0),
    text: (el, tl) => tl.add(enter(el, { y: MOTION.rise * 0.6, opacity: 0 }, { duration: MOTION.small }), 0.15),
    cta: (el, tl) => tl.add(enter(el, { y: MOTION.rise * 0.6, opacity: 0 }, { duration: MOTION.small }), 0.3),
    glow: (el, tl) => tl.add(enter(el, { opacity: 0 }, { duration: MOTION.slow * 1.4 }), 0),
    cards: (el, tl) => {
        const cards = [...el.querySelectorAll('.carousel-cell > :first-child')];
        const paintings = cards.map((c) => c.querySelector('img')).filter(Boolean);
        tl.add(enter(cards, { x: MOTION.rise * 1.4, opacity: 0 }, { duration: MOTION.card, stagger: MOTION.cardStagger }), 0);
        tl.add(enter(paintings, { scale: MOTION.settle }, { duration: MOTION.slow, stagger: MOTION.cardStagger }), 0);
    },
    tiers: (el, tl) => {
        const tiers = [...el.children];
        const featured = tiers.filter((t) => t.matches('[data-featured]'));
        const rest = tiers.filter((t) => !featured.includes(t));
        tl.add(enter(rest, { y: MOTION.rise, opacity: 0 }, { duration: MOTION.card, stagger: MOTION.cardStagger * 1.5 }), 0);
        if (featured.length) {
            const at = MOTION.cardStagger * 1.5 * rest.length + MOTION.featuredDelay;
            tl.add(enter(featured, { y: MOTION.rise, opacity: 0 }, { duration: MOTION.card }), at);
        }
    },
};

let triggers = [];

/** One timeline per section, played once when the section scrolls into view. */
function build() {
    triggers.forEach((t) => t.kill(true));
    triggers = [];
    document.querySelectorAll('[data-reveal-section]').forEach((section) => {
        const tl = gsap.timeline({ paused: true });
        // a section inside a section owns its own elements
        section.querySelectorAll('[data-reveal]').forEach((el) => {
            if (el.closest('[data-reveal-section]') === section) {
                builders[el.dataset.reveal]?.(el, tl);
            }
        });
        tl.progress(0);    // apply every starting state now, before the section is seen
        triggers.push(ScrollTrigger.create({ trigger: section, start: MOTION.start, once: true, onEnter: () => tl.play(0) }));
    });
}

function registerTuner() {
    const ranges = {
        small: [0.1, 1.5, 0.05], card: [0.2, 2, 0.05], slow: [0.3, 3, 0.05], rise: [0, 120, 1],
        wordStagger: [0, 0.3, 0.01], cardStagger: [0, 0.3, 0.01], settle: [1, 1.3, 0.01], featuredDelay: [0, 1, 0.05],
    };
    window.__tune?.register('Landing motion', [
        ...Object.entries(ranges).map(([key, [min, max, step]]) => ({
            key, label: key, min, max, step, value: MOTION[key], apply: (v) => { MOTION[key] = v; },
        })),
        { key: 'replay', type: 'button', label: 'Replay from the top', apply: () => { build(); window.scrollTo({ top: 0 }); ScrollTrigger.refresh(); } },
    ], { tab: 'Landing' });
}

export function setupLandingReveal() {
    if (!document.querySelector('[data-reveal-section]') || reducedMotion()) {
        return;
    }
    build();
    registerTuner();
    // carousels and images change the page height after load; re-measure the trigger lines
    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
}
