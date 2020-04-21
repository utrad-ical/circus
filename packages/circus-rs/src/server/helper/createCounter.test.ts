import createCounter from './createCounter';

test('count up', async () => {
  const counter = await createCounter({});
  expect(counter.getCount('foo')).toBe(0);
  expect(counter.getCount('bar')).toBe(0);
  counter.countUp('foo');
  expect(counter.getCount('foo')).toBe(1);
  expect(counter.getCount('bar')).toBe(0);
});

test('return set of counters', async () => {
  const counter = await createCounter({});
  counter.countUp('foo');
  counter.countUp('bar');
  counter.countUp('bar');
  expect(counter.getCounts()).toEqual({ foo: 1, bar: 2 });
});
