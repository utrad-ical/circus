import type { FunctionService } from '../ServiceLoader.ts';
import type Logger from './Logger.ts';

const createNullLogger: FunctionService<Logger> = async (
  options: {},
  deps: {}
) => {
  const noop = () => {};
  return {
    trace: noop,
    debug: noop,
    info: noop,
    warn: noop,
    error: noop,
    fatal: noop,
    shutdown: () => Promise.resolve()
  };
};

export default createNullLogger;
