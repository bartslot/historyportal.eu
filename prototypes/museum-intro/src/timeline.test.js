import test from 'node:test';
import assert from 'node:assert/strict';
import { EASE, sampleTrack, span } from './timeline.js';

test('every easing starts at 0 and ends at 1', () => {
  for (const [name, f] of Object.entries(EASE)) {
    assert.ok(Math.abs(f(0)) < 1e-3, `${name}(0)`);
    assert.ok(Math.abs(f(1) - 1) < 1e-3, `${name}(1)`);
  }
});

test('settle is slow at both ends (not linear)', () => {
  assert.ok(EASE.settle(0.1) < 0.1);
  assert.ok(EASE.settle(0.9) > 0.9);
});

test('track holds before the first key, after the last, and eases between', () => {
  const keys = [{ t: 1, v: [0, 0] }, { t: 3, v: [10, 20], ease: 'settle' }];
  assert.deepEqual(sampleTrack(keys, 0), [0, 0]);
  assert.deepEqual(sampleTrack(keys, 9), [10, 20]);
  const mid = sampleTrack(keys, 2);
  const e = EASE.settle(0.5);
  assert.ok(Math.abs(mid[0] - 10 * e) < 1e-9 && Math.abs(mid[1] - 20 * e) < 1e-9);
});

test('span clamps outside its window', () => {
  assert.equal(span(-1, 0, 1), 0);
  assert.equal(span(5, 0, 1), 1);
});
