import Logger from './Logger';
import log4js from 'log4js';

const log4jsLogger: (config: any) => Logger = config => {
  let appenders: any[] = [{ type: 'console' }];
  if (config && Array.isArray(config.appenders)) {
    appenders = config.appenders;
  }
  log4js.configure({ appenders });
  const logger = log4js.getLogger();
  return {
    trace: logger.trace.bind(logger),
    info: logger.info.bind(logger),
    debug: logger.debug.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
    fatal: logger.fatal.bind(logger),
    shutdown: () => new Promise<void>(resolve => log4js.shutdown(resolve))
  };
};

export default log4jsLogger;
