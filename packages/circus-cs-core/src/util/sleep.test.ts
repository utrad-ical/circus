import sleep from './sleep';

describe('sleep', () => {
  it('should wait for the specified time and resolve', async () => {
    const start = Date.now();
    await sleep(100);
    expect(start).toBeLessThan(Date.now() - 90);
  });
});
