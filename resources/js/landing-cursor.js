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
