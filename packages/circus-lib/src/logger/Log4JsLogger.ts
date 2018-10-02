import Logger from './Logger';
import * as cosmiconfig from 'cosmiconfig';
import { configure, getLogger, shutdown, Configuration } from 'log4js';

interface Options {
  category?: string;
}
export default class Log4jsLogger implements Logger {

  public static configTitle: string = 'log4js-logger';
  private static configured: boolean = false;
  private static counter: number = 0;

  public trace: (message: string, ...args: any[]) => void;
  public debug: (message: string, ...args: any[]) => void;
  public info: (message: string, ...args: any[]) => void;
  public warn: (message: string, ...args: any[]) => void;
  public error: (message: string, ...args: any[]) => void;
  public fatal: (message: string, ...args: any[]) => void;
  public shutdown: () => Promise<void>;

  public static configure(config?: string|Configuration) {

    if(Log4jsLogger.configured)
      throw Error('Already configured');

    if(config === undefined)
      config = Log4jsLogger.configTitle;

    let log4jsConfiguration: Configuration;
    if(typeof config === 'string') {
      const explorer = cosmiconfig(config);
      const result = explorer.searchSync();
      if (!result)
        throw Error(
          'Cannot find configuration file for log4js like log4js-logger.config.js'
        );
        log4jsConfiguration = result.config as Configuration;
    } else {
      log4jsConfiguration = config;
    }

    Log4jsLogger.configured = true;
    configure(log4jsConfiguration);
  }

  public static async shutdown() {
    await shutdown( e => e && console.error(e) );
  }

  constructor(options: Options = {}) {

    if(!Log4jsLogger.configured)
      Log4jsLogger.configure();

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
      if(--Log4jsLogger.counter === 0)
        await Log4jsLogger.shutdown();
      return;
    };
  }
}
