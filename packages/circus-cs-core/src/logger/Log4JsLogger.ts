import Log4jsLogger from '@utrad-ical/circus-lib/lib/logger/Log4JsLogger';

Log4jsLogger.setDefaults({
  appenders: {
    stdout: { type: 'stdout' }
  },
  categories: {
    default: {
      appenders: ['stdout'],
      level: 'ALL'
    }
  }
});

export default Log4jsLogger;
