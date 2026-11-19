import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestContext } from 'node:test';
import { Command } from 'commander';
import type { CommandAction, CommandDeps } from '../commands/CommandAction.ts';

const unexpectedPrompt = async () => assert.fail('Unexpected prompt');

export const commandDeps = (
  overrides: Partial<Omit<CommandDeps, 'prompts'>> & {
    prompts?: Partial<CommandDeps['prompts']>;
  } = {}
): CommandDeps => ({
  rcFilePath: '',
  isInputTTY: false,
  getFetch: () => assert.fail('Unexpected API client creation'),
  ...overrides,
  prompts: {
    input: unexpectedPrompt,
    password: unexpectedPrompt,
    select: unexpectedPrompt,
    confirm: unexpectedPrompt,
    ...overrides.prompts
  }
});

export const runCommand = (
  group: string,
  configure: (parent: Command) => Command,
  action: CommandAction,
  args: string[],
  deps: CommandDeps
) => {
  const program = new Command().exitOverride();
  const command = configure(program.command(group)).action(action(deps));
  return program.parseAsync([group, command.name(), ...args], { from: 'user' });
};

export const tempDirectory = async (t: TestContext) => {
  const directory = await mkdtemp(join(tmpdir(), 'circus-cli-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
};

export const captureExitCode = (t: TestContext) => {
  const savedExitCode = process.exitCode;
  process.exitCode = undefined;
  t.after(() => {
    process.exitCode = savedExitCode;
  });
};
