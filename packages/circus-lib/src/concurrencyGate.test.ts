import concurrencyGate from './concurrencyGate';

test('manual start/finish', async () => {
  const gate = concurrencyGate(3);
  const res = await Promise.all(
    new Array(10).fill(0).map(async (_, i) => {
      const id = await gate.enter(); // This is the 'gate' to limit concurrency
      try {
        // Do some time-consuming async task here, eg calling an external API
        return i * 2;
      } finally {
        // Ensure `finish` is called by using try-finally!
        gate.exit(id);
      }
    })
  );
  expect(res).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
});

test('use', async () => {
  const gate = concurrencyGate(3);
  const res = await Promise.all(
    new Array(10).fill(0).map((_, i) =>
      gate.use(async () => {
        // Do some time-consuming async task here
        return i * 2;
      })
    )
  );
  expect(res).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18]);
});

test('error', async () => {
  // @ts-expect-error
  expect(() => concurrencyGate()).toThrowError(TypeError);
  expect(() => concurrencyGate(0)).toThrowError(RangeError);
});
