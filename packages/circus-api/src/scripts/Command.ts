import type { FunctionService } from '@utrad-ical/circus-lib';
import { ConfigLoadError } from '@utrad-ical/circus-lib/config';
import { InvalidArgumentError } from 'commander';
import loadApiConfig from '../config/index.ts';
import createServiceLoader from '../createServiceLoader.ts';
import { ValidationError } from '../createValidator.ts';

type CommandFunc<Options = void> = (options: Options) => Promise<void>;
export type CommandService<Dependencies, Options = void> = FunctionService<
  CommandFunc<Options>,
  Dependencies
>;

class CommandCleanupError extends Error {
  readonly cleanupError: unknown;

  constructor(commandError: unknown, cleanupError: unknown) {
    super('The command and service cleanup failed', { cause: commandError });
    this.cleanupError = cleanupError;
  }
}

export const printCommandError = (error: unknown) => {
  if (error instanceof CommandCleanupError) {
    printCommandError(error.cause);
    console.error('Service cleanup also failed.');
    printCommandError(error.cleanupError);
  } else if (error instanceof AggregateError) {
    console.error(error.message);
    for (const cause of error.errors) printCommandError(cause);
  } else if (
    error instanceof ConfigLoadError ||
    error instanceof InvalidArgumentError ||
    error instanceof ValidationError
  ) {
    console.error(error.message);
    if (error instanceof ValidationError) console.error(error.issues);
  } else {
    console.error(
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    );
  }
};

export const runCommand = async <Dependencies, Options>(
  command: CommandService<Dependencies, Options>,
  options: Options
) => {
  const loader = await createServiceLoader(await loadApiConfig());
  try {
    loader.register('theCommand', command);
    const execute = (await loader.get('theCommand')) as CommandFunc<Options>;
    await execute(options);
  } catch (commandError) {
    try {
      await loader.dispose();
    } catch (cleanupError) {
      throw new CommandCleanupError(commandError, cleanupError);
    }
    throw commandError;
  }
  await loader.dispose();
};
