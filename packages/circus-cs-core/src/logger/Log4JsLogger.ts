import Logger from './Logger';
import { configure, getLogger, shutdown } from 'log4js';

type Append = (message: string, ...args: any[]) => void;
export default class Log4jsLogger implements Logger {
  public trace: Append;
  public debug: Append;
  public info: Append;
  public warn: Append;
  public error: Append;
  public fatal: Append;
  public shutdown: () => Promise<void>;

  constructor(config: any) {
    configure(config);
    const logger = getLogger();
    this.trace = logger.trace.bind(logger);
    this.debug = logger.debug.bind(logger);
    this.info = logger.info.bind(logger);
    this.warn = logger.warn.bind(logger);
    this.error = logger.error.bind(logger);
    this.fatal = logger.fatal.bind(logger);
    this.shutdown = async () => {
      await shutdown();
      return;
    };
  }
}
