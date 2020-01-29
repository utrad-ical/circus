import { command } from './ulid';

test('ulid', async () => {
  const commandFunc = await command(undefined, {});
  const consoleSpy = jest.spyOn(console, 'log');
  await commandFunc({});
  expect(consoleSpy.mock.calls[0][0]).toMatch(/[a-z0-9]{26}/);
});
