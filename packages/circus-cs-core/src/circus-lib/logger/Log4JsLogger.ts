import Logger from './Logger';
import cosmiconfig from 'cosmiconfig';
import { configure, getLogger, shutdown, Configuration } from 'log4js';

const configTitle = 'log4js-logger';
const explorer = cosmiconfig(configTitle);
const result = explorer.searchSync();
if (!result)
  throw Error(
    'Cannot find configuration file for log4js like log4js-logger.config.js'
  );

const { config } = result;
configure(config as Configuration);

type AppendMessage = (message: string, ...args: any[]) => void;
interface Options {
  category?: string;
}
export default class Log4jsLogger implements Logger {
  public trace: AppendMessage;
  public debug: AppendMessage;
  public info: AppendMessage;
  public warn: AppendMessage;
  public error: AppendMessage;
  public fatal: AppendMessage;
  public shutdown: () => Promise<void>;

  constructor(options: Options = {}) {
    const { category = 'default' } = options;
    const logger = getLogger(category);
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
