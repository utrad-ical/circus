import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import createCancellableTimer from './createCancellableTimer.ts';

describe('createCancellableTimer', () => {
  test('basic function', async () => {
    const timer = createCancellableTimer(200, { timerResolution: 50 });
    const start = new Date().getTime();
    await timer.waitForNext();
    assert.ok(new Date().getTime() >= start + 200);
  });

  test('cancel', (_t, done) => {
    const timer = createCancellableTimer(300, { timerResolution: 50 });
    const start = new Date().getTime();
    timer.waitForNext().then(() => {
      assert.ok(new Date().getTime() < start + 100);
      done();
    });
    timer.cancel();
  });
});
