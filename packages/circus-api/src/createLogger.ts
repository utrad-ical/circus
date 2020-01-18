import FileLogger from '@utrad-ical/circus-lib/lib/logger/FileLogger';

const path = require('path');
const logDir = path.resolve(__dirname, '../store/logs');

const createLogger = () => {
  const fileName = path.join(logDir, 'circus-api');
  return FileLogger({ fileName }, {});
};

export default createLogger;
