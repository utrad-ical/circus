import util from 'util';
import Transport from 'winston-transport';
import winston from 'winston';
import { format } from 'logform';

const localIsoTime = () => {
  const tzOffset = new Date().getTimezoneOffset() * 60000;
  return new Date(Date.now() - tzOffset).toISOString().slice(0, -1);
};

const formatInfo = (args: any[], level: string) => {
  const body = args
    .map(arg => {
      if (typeof arg === 'string') return arg;
      return util.inspect(arg, { depth: 3 });
    })
    .join(' ');
  const date = localIsoTime();
  const message = `[${date}] [${level}] ${body}`;
  return message;
};

const createTextLogger = (transport: Transport) => {
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
      const message = formatInfo(args, level);
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

export default createTextLogger;
