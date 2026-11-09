import type Logger from './Logger.ts';
import * as winston from 'winston';
import RotateFile from 'winston-daily-rotate-file';
import type { FunctionService } from '../ServiceLoader.ts';
import createTextLogger from './createTextLogger.ts';

interface Options {
  /**
   * Do not include an extension (e.g., 'log')
   */
  fileName: string;
  /**
   * Extention including a period, like '.log'.
   */
  extension?: string;
  level?: string;
}

/**
 * Creates a `Logger` implementation that writes logs to a file with dates.
 */
const createFileLogger: FunctionService<Logger> = async (
  options: Options,
  deps: {} = {}
) => {
  const { fileName, level = 'trace', extension = '.log' } = options;
  const transport = new RotateFile({
    filename: fileName,
    extension,
    level
  });
  return createTextLogger(transport);
};

export default createFileLogger;
