import FileLogger from '@utrad-ical/circus-lib/lib/logger/FileLogger';
import { FunctionService } from '@utrad-ical/circus-lib';
import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import path from 'path';

const createLogger: FunctionService<
  Logger,
  undefined,
  { logDir: string }
> = async opts => {
  const { logDir } = opts;
  const fileName = path.join(logDir, 'circus-api');
  return FileLogger({ fileName }, {});
};

export default createLogger;
