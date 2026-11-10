import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
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
  assert.match(spy.mock.calls[0].arguments[0], /\$2y\$/);
});

test('error on password mismatch', async () => {
  const commandFunc = await command(null, {});
  mock.method(console, 'log', () => {});
  await assert.rejects(commandFunc({}), { message: /Password mismatch/ });
});
