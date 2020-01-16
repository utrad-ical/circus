import path from 'path';
import createFileLogger from '@utrad-ical/circus-lib/lib/logger/FileLogger';

const fileName = path.join(__dirname, '../store/logs/test');

const createTestLogger = async () => {
  return await createFileLogger({ fileName }, {});
};

export default createTestLogger;
