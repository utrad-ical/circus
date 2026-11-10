import path from 'path';
import { createFileLogger } from '@utrad-ical/circus-lib';

const fileName = path.join(import.meta.dirname, '../../store/logs/test');

const createTestLogger = async () => {
  return await createFileLogger({ fileName }, {});
};

export default createTestLogger;
