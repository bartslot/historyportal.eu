/**
 * The one drag behaviour for every resize handle in the lesson editor (<x-ui.resize-handle>).
 *
 * The handle measures the pointer and reports it; it never sizes anything itself. Each owner
 * decides what the size is, whether a pull to the edge hides its panel, and what a keypress does.
 * Events are dispatched on the handle element and bubble:
 *
 *   resize-start  { pos }          pointer went down on the handle
 *   resize-drag   { pos }          pointer moved while held
 *   resize-end    { pos }          pointer released
 *   resize-step   { dir, big }     arrow key along the handle's axis; dir is -1 (left/up) or 1
 *   resize-reset                   double-click, or Home
 *   resize-hide                    End
 *
 * pos is the pointer on the handle's axis (clientX for a vertical divider, clientY for a
 * horizontal one), so the owner can compute the size from the edge it is anchored to.
 *
 * Owners that sit outside any Alpine scope (the rail, the object list, the inspector) register
 * with onResize(id, handlers) and survive Livewire morphs. Owners inside an Alpine scope bind the
 * events with x-on attributes instead.
 */

const AXIS_KEYS = {
    x: { ArrowLeft: -1, ArrowRight: 1 },
    y: { ArrowUp: -1, ArrowDown: 1 },
};

const ACTION_KEYS = { Home: 'resize-reset', End: 'resize-hide' };

/**
 * What a key does on a handle. Pure, so the mapping is testable without a DOM.
 * @returns {{ type: string, detail?: object } | null}
 */
export function resizeKeyAction(axis, key, shiftKey) {
    const dir = AXIS_KEYS[axis]?.[key];
    if (dir) return { type: 'resize-step', detail: { dir, big: shiftKey } };
    const type = ACTION_KEYS[key];
    return type ? { type } : null;
}

/** Alpine factory: x-data="resizeHandle('x')" (a vertical divider) or ('y') (horizontal). */
export function resizeHandle(axis = 'x') {
    return {
        axis,
        dragging: false,
        pointer(e) {
            return this.axis === 'x' ? e.clientX : e.clientY;
        },
        down(e) {
            if (e.button !== 0) return;
            this.dragging = true;
            try { this.$el.setPointerCapture(e.pointerId); } catch (_) {}
            document.body.style.userSelect = 'none';
            e.preventDefault();
            this.$dispatch('resize-start', { pos: this.pointer(e) });
        },
        move(e) {
            if (this.dragging) this.$dispatch('resize-drag', { pos: this.pointer(e) });
        },
        up(e) {
            if (!this.dragging) return;
            this.dragging = false;
            try { this.$el.releasePointerCapture(e.pointerId); } catch (_) {}
            document.body.style.userSelect = '';
            this.$dispatch('resize-end', { pos: this.pointer(e) });
        },
        key(e) {
            const action = resizeKeyAction(this.axis, e.key, e.shiftKey);
            if (!action) return;
            e.preventDefault();
            this.$dispatch(action.type, action.detail);
        },
    };
}

const METHOD_FOR_EVENT = {
    'resize-start': 'start',
    'resize-drag': 'drag',
    'resize-end': 'end',
    'resize-step': 'step',
    'resize-reset': 'reset',
    'resize-hide': 'hide',
};

const registry = new Map();
let listening = false;

/**
 * Route a handle's events to its owner. Keyed by the handle's element id, so a re-render or a
 * Livewire morph that replaces the element keeps working: the listener sits on the document.
 * Calling it again for the same id replaces the handlers.
 */
export function onResize(id, handlers) {
    registry.set(id, handlers);
    if (listening) return;
    listening = true;
    for (const type of Object.keys(METHOD_FOR_EVENT)) {
        document.addEventListener(type, (e) => {
            const owner = registry.get(e.target?.id);
            owner?.[METHOD_FOR_EVENT[type]]?.(e.detail);
        });
    }
}
