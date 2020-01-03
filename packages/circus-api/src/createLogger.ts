import Log4JsLogger from '@utrad-ical/circus-lib/lib/logger/Log4JsLogger';

const path = require('path');
const logDir = path.resolve(__dirname, '../store/logs');

Log4JsLogger.setDefaults({
  appenders: {
    memory: { type: 'recording' },
    csCoreDaemon: {
      type: 'dateFile',
      filename: path.join(logDir, 'cs-core-daemon.log'),
      pattern: '-yyyyMMdd.log',
      alwaysIncludePattern: true
    },
    circusApi: {
      type: 'dateFile',
      filename: path.join(logDir, 'circus-api.log'),
      keepFileExt: true
    }
  },
  categories: {
    default: {
      appenders: ['memory'],
      level: 'ALL'
    },
    off: {
      appenders: ['memory'],
      level: 'off'
    },
    daemon: {
      appenders: ['csCoreDaemon'],
      level: 'ALL'
    },
    apiServer: {
      appenders: ['circusApi'],
      level: 'trace'
    }
  }
});

export function configureLogger(config: any) {
  Log4JsLogger.setDefaults(config);
  Log4JsLogger.configure({});
}

export default function createLogger() {
  return new Log4JsLogger({ category: 'apiServer' });
}
