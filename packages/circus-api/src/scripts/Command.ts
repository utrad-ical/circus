import type { FunctionService } from '@utrad-ical/circus-lib';
import { ConfigLoadError } from '@utrad-ical/circus-lib/config';
import { InvalidArgumentError } from 'commander';
import { styleText } from 'node:util';
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

const printErrorLine = (line: string) =>
  console.error(styleText('red', line, { stream: process.stderr }));

const printErrorDetails = (error: unknown) => {
  if (error instanceof CommandCleanupError) {
    printErrorDetails(error.cause);
    printErrorLine('Service cleanup also failed.');
    printErrorDetails(error.cleanupError);
  } else if (error instanceof AggregateError) {
    printErrorLine(error.message);
    for (const cause of error.errors) printErrorDetails(cause);
  } else if (
    error instanceof ConfigLoadError ||
    error instanceof InvalidArgumentError ||
    error instanceof ValidationError
  ) {
    printErrorLine(error.message);
    if (error instanceof ValidationError) console.error(error.issues);
  } else {
    printErrorLine(
      error instanceof Error ? (error.stack ?? error.message) : String(error)
    );
  }
};

export const printCommandError = (error: unknown, context?: string) => {
  console.error(styleText('bgRed', 'Error', { stream: process.stderr }));
  if (context) printErrorLine(context);
  printErrorDetails(error);
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
