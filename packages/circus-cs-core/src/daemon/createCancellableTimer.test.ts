import createCancellableTimer from './createCancellableTimer';

describe('createCancellableTimer', () => {
  test('basic function', async () => {
    const timer = createCancellableTimer(200, { timerResolution: 50 });
    const start = new Date().getTime();
    await timer.waitForNext();
    expect(new Date().getTime()).toBeGreaterThanOrEqual(start + 200);
  });

  test('cancel', done => {
    const timer = createCancellableTimer(300, { timerResolution: 50 });
    const start = new Date().getTime();
    timer.waitForNext().then(() => {
      expect(new Date().getTime()).toBeLessThan(start + 100);
      done();
    });
    timer.cancel();
  });
});
