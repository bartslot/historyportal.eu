import { describe, it, expect } from 'vitest';
import { resizeKeyAction } from '../ui/resize-handle.js';

describe('resizeKeyAction', () => {
    it('steps along a vertical divider with left and right, not up and down', () => {
        expect(resizeKeyAction('x', 'ArrowRight', false)).toEqual({ type: 'resize-step', detail: { dir: 1, big: false } });
        expect(resizeKeyAction('x', 'ArrowLeft', true)).toEqual({ type: 'resize-step', detail: { dir: -1, big: true } });
        expect(resizeKeyAction('x', 'ArrowUp', false)).toBeNull();
    });

    it('steps along a horizontal divider with up and down, not left and right', () => {
        expect(resizeKeyAction('y', 'ArrowUp', false)).toEqual({ type: 'resize-step', detail: { dir: -1, big: false } });
        expect(resizeKeyAction('y', 'ArrowDown', false)).toEqual({ type: 'resize-step', detail: { dir: 1, big: false } });
        expect(resizeKeyAction('y', 'ArrowLeft', false)).toBeNull();
    });

    it('maps Home to reset and End to hide on every axis', () => {
        expect(resizeKeyAction('x', 'Home', false)).toEqual({ type: 'resize-reset' });
        expect(resizeKeyAction('y', 'End', false)).toEqual({ type: 'resize-hide' });
    });

    it('ignores other keys', () => {
        expect(resizeKeyAction('x', 'a', false)).toBeNull();
    });
});
