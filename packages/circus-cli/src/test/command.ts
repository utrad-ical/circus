import assert from 'node:assert/strict';
import type { TestContext } from 'node:test';
import { Command } from 'commander';
import type { CommandAction, CommandDeps } from '../commands/CommandAction.ts';

const unexpectedPrompt = async () => assert.fail('Unexpected prompt');

export const commandDeps = (
  overrides: Partial<Omit<CommandDeps, 'prompts'>> & {
    prompts?: Partial<CommandDeps['prompts']>;
  } = {}
): CommandDeps => ({
  configPath: '',
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

export { tempDirectory } from '@utrad-ical/circus-lib/test/cli';

export const captureExitCode = (t: TestContext) => {
  const savedExitCode = process.exitCode;
  process.exitCode = undefined;
  t.after(() => {
    process.exitCode = savedExitCode;
  });
};
