import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import Log4JsLogger from '@utrad-ical/circus-lib/lib/logger/Log4JsLogger';
import { Configuration as Log4JsConfig } from 'log4js';
import path from 'path';

const loggerOptions: Log4JsConfig = {
  appenders: {
    testLog: {
      type: 'dateFile',
      filename: path.join(__dirname, '../store/logs/test.log'),
      keepFileExt: true
    }
  },
  categories: {
    default: {
      appenders: ['testLog'],
      level: 'ALL'
    }
  }
};

const createTestLogger = async () => {
  Log4JsLogger.configure(loggerOptions);
  return new Log4JsLogger() as Logger;
};

export default createTestLogger;
