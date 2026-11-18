import type Logger from './Logger.ts';

const createNullLogger = (): Logger => {
  const noop = () => {};
  const logger: Logger = {
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    child: () => logger
  };
  return logger;
};

export default createNullLogger;
