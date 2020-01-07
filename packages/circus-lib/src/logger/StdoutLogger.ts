import Logger from './Logger';
import * as winston from 'winston';
import { FunctionService } from '../ServiceLoader';
import createTextLogger from './createTextLogger';

interface Options {
  /**
   * Array of strings containing the levels to log to stderr instead of stdout.
   */
  stderrLevels?: string[];
}

/**
 * Creates a `Logger` implementation that writes logs to a file with dates.
 */
const createStdoutLogger: FunctionService<Logger> = async (
  options: Options = {},
  deps: {} = {}
) => {
  const { stderrLevels = [] } = options;
  const transport = new winston.transports.Console({ stderrLevels });
  return createTextLogger(transport);
};

export default createStdoutLogger;
