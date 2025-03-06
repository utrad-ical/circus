import asset from 'node:assert';
import * as fs from 'node:fs/promises';
import test from 'node:test';
import { extractTarToDir, packDirToTar } from './tar.js';

test('tar', async () => {
  await fs.mkdir('test/extracted', { recursive: true });
  try {
    const tarStream = await packDirToTar('test/sample-input');
    await extractTarToDir(tarStream, 'test/extracted');
    const files = await fs.readdir('test/extracted');
    asset(files.includes('0.txt'));
    asset(files.includes('japan.jpg'));
  } finally {
    await fs.rm('test/extracted', { recursive: true });
  }
});
