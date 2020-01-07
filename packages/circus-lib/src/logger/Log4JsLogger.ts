import Logger from './Logger';
import cosmiconfig from 'cosmiconfig';
import { configure, getLogger, shutdown, Configuration } from 'log4js';
import merge from 'merge';

interface Options {
  category?: string;
}

export function getRecording() {
  const recording = require('log4js/lib/appenders/recording') as {
    replay(): any;
    erase(): void;
  };
  return recording;
}

/**
 * @deprecated Use createFileLogger instead.
 */
export default class Log4jsLogger implements Logger {
  public static configTitle: string = 'log4js-logger';
  public static configured: boolean = false;
  private static defaults: Configuration = {
    appenders: {
      default: { type: 'recording' }
    },
    categories: {
      default: {
        appenders: ['default'],
        level: 'ALL'
      }
    }
  };
  private static counter: number = 0;

  public trace: (message: string, ...args: any[]) => void;
  public debug: (message: string, ...args: any[]) => void;
  public info: (message: string, ...args: any[]) => void;
  public warn: (message: string, ...args: any[]) => void;
  public error: (message: string, ...args: any[]) => void;
  public fatal: (message: string, ...args: any[]) => void;
  public shutdown: () => Promise<void>;

  public static configure(options?: string | object | null) {
    if (options === undefined) options = Log4jsLogger.configTitle;

    let log4jsConfiguration: any;
    if (options === null) {
      log4jsConfiguration = {};
    } else if (typeof options === 'string') {
      const explorer = cosmiconfig(options);
      const result = explorer.searchSync();
      if (result) log4jsConfiguration = result ? result.config : {};
    } else {
      log4jsConfiguration = options;
    }

    const config = merge.recursive(
      {},
      Log4jsLogger.defaults,
      log4jsConfiguration
    ) as Configuration;

    Log4jsLogger.configured = true;
    configure(config);
  }

  public static setDefaults(config: Configuration) {
    Log4jsLogger.defaults = config;
  }

  public static async shutdown() {
    await shutdown(e => e && console.error(e));
  }

  constructor(options: Options = {}) {
    if (!Log4jsLogger.configured) Log4jsLogger.configure();

    const { category = 'default' } = options;
    const logger = getLogger(category);

    ++Log4jsLogger.counter;

    this.trace = logger.trace.bind(logger);
    this.debug = logger.debug.bind(logger);
    this.info = logger.info.bind(logger);
    this.warn = logger.warn.bind(logger);
    this.error = logger.error.bind(logger);
    this.fatal = logger.fatal.bind(logger);
    this.shutdown = async () => {
      if (--Log4jsLogger.counter === 0) await Log4jsLogger.shutdown();
      return;
    };
  }
}
