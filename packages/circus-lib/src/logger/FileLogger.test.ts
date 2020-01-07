import createFileLogger from './FileLogger';
import path from 'path';
import fs from 'fs-extra';
import sleep from '../sleep';

const logDir = path.resolve(__dirname, '../../testdata/logger');

beforeAll(async () => {
  await fs.emptyDir(logDir);
});

afterAll(async () => {
  await fs.emptyDir(logDir);
});

test('file logger', async () => {
  const write = async (name: string) => {
    const logger = await createFileLogger(
      { fileName: logDir + '/' + name },
      {}
    );
    logger.trace('Something trivial happened');
    logger.info({ price: 150 }, { stock: true });
    logger.error(new Error('This is bad'));
    logger.warn(true, false, true);
    await logger.shutdown();
  };

  const check = async () => {
    const files = await fs.readdir(logDir);
    for (const file of files) {
      const log = await fs.readFile(path.join(logDir, file), 'utf8');
      expect(log).toMatch(/Something trivial happened/);
      expect(log).toMatch(/price: 150/);
      expect(log).toMatch(/stock: true/);
      expect(log).toMatch(/This is bad/);
      expect(log).toMatch(/true false true/);
    }
  };

  await write('apple');
  await write('banana');
  await sleep(100);
  await check();
});
