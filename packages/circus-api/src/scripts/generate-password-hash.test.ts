import { test, mock } from 'node:test';
import { expect } from 'expect';
import inquirer from 'inquirer';
import { command } from './generate-password-hash.ts';

const answers = [
  { pwd1: 'mypassword', pwd2: 'mypassword' },
  { pwd1: 'mypassword', pwd2: 'unmatched' }
];
mock.method(inquirer, 'prompt', async () => answers.shift());

test('generate hash', async () => {
  const commandFunc = await command(null, {});
  const spy = mock.method(console, 'log', () => {});
  await commandFunc({});
  expect(spy.mock.calls[0].arguments[0]).toMatch(/\$2y\$/);
});

test('error on password mismatch', async () => {
  const commandFunc = await command(null, {});
  mock.method(console, 'log', () => {});
  await expect(commandFunc({})).rejects.toThrow(/Password mismatch/);
});
