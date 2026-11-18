import { createNullLogger } from '@utrad-ical/circus-lib';

const createTestLogger = async () => {
  return createNullLogger();
};

export default createTestLogger;
