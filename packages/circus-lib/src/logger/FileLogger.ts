import Logger from './Logger';
import * as winston from 'winston';
import { format } from 'logform';
import RotateFile from 'winston-daily-rotate-file';
import { FunctionService } from '../ServiceLoader';
import util from 'util';

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

const localIsoTime = () => {
  var tzOffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().slice(0, -1);
};

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

  const wLogger = winston.createLogger({
    transports: [transport],
    levels: {
      fatal: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4,
      trace: 5
    },
    format: format.printf(info => info.message)
  });

  const bindLevel = (level: string) => {
    return (...args: any[]) => {
      // We format everything into a plain string at this level
      // because Winston's formetting process turned out to be unpredictable
      const body = args
        .map(arg => {
          if (typeof arg === 'string') return arg;
          return util.inspect(arg, { depth: 3 });
        })
        .join(' ');
      const date = localIsoTime();
      const message = `[${date}] [${level}] ${body}`;
      wLogger.log(level, message);
    };
  };

  return {
    trace: bindLevel('trace'),
    debug: bindLevel('debug'),
    info: bindLevel('info'),
    warn: bindLevel('warn'),
    error: bindLevel('error'),
    fatal: bindLevel('fatal'),
    shutdown: () => Promise.resolve()
  };
};

export default createFileLogger;
