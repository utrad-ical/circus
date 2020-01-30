import { command } from './generate-password-hash';

jest.mock('inquirer', () => {
  let i = 0;
  return {
    prompt: () => {
      if (i++ == 0) return { pwd1: 'mypassword', pwd2: 'mypassword' };
      else return { pwd1: 'mypassword', pwd2: 'unmatched' };
    }
  };
});

test('generate hash', async () => {
  const commandFunc = await command(null, {});
  const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
  await commandFunc({});
  expect(spy.mock.calls[0][0]).toMatch(/\$2y\$/);
});

test('error on password mismatch', async () => {
  const commandFunc = await command(null, {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  await expect(commandFunc({})).rejects.toThrow(/Password mismatch/);
});
