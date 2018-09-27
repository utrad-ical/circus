import sleep from './sleep';

test('sleep', async () => {
  const start = Date.now();
  await sleep(100);
  expect(start).toBeLessThan(Date.now() - 90);
});
