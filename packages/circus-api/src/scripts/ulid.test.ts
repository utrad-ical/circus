import { command } from './ulid';

test('ulid', async () => {
  const commandFunc = await command(undefined, {});
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  await commandFunc({});
  expect(spy.mock.calls[0][0]).toMatch(/[a-z0-9]{26}/);
});
