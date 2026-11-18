import type Logger from './Logger.ts';
import type { LogLevel } from './Logger.ts';
import createStdoutLogger from './StdoutLogger.ts';

const levels = new Set<unknown>([
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent'
]);

type LoggerConfig = { options?: { level?: unknown }; type?: unknown };

export const createLoggerFactory =
  (
    key: 'apiLogger' | 'csCoreDaemonLogger',
    service: string,
    createLogger = createStdoutLogger
  ) =>
  async (config: Record<string, LoggerConfig | undefined>): Promise<Logger> => {
    const settings = config[key];
    const level = settings?.options?.level;
    const validLevel = level === undefined || levels.has(level);
    const chosenLevel = validLevel ? (level as LogLevel | undefined) : 'error';
    const logger = createLogger(service, chosenLevel);

    if (settings && Object.hasOwn(settings, 'type')) {
      logger
        .child({}, { level: 'warn' })
        .warn(
          { setting: key + '.type' },
          'Logger type is ignored. Remove it and use ' +
            key +
            '.options.level to configure logging.'
        );
    }
    if (!validLevel) {
      const message =
        'Invalid ' +
        key +
        '.options.level. Use trace, debug, info, warn, error, fatal, or silent.';
      logger.error({ setting: key + '.options.level' }, message);
      throw new Error(message);
    }
    return logger;
  };
