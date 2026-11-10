import assert from 'node:assert/strict';
import { test, before, after } from 'node:test';
import createFileLogger from './FileLogger.ts';
import path from 'path';
import fs from 'fs-extra';
import sleep from '../sleep.ts';

const logDir = path.resolve(__dirname, '../../testdata/logger');

before(async () => {
  await fs.emptyDir(logDir);
});

after(async () => {
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

  await write('apple');
  await write('banana');
  await sleep(50);

  const files = await fs.readdir(logDir);
  assert.equal(files.length, 2);
  for (const file of files) {
    const log = await fs.readFile(path.join(logDir, file), 'utf8');
    assert.match(log, /Something trivial happened/);
    assert.match(log, /price: 150/);
    assert.match(log, /stock: true/);
    assert.match(log, /This is bad/);
    assert.match(log, /true false true/);
  }
});
