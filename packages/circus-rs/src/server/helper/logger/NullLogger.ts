import Logger from './Logger';

const nullLogger: (config?: any) => Logger = config => {
  return {
    trace: () => void 0,
    debug: () => void 0,
    info: () => void 0,
    warn: () => void 0,
    error: () => void 0,
    fatal: () => void 0,
    shutdown: () => Promise.resolve()
  };
};

export default nullLogger;
