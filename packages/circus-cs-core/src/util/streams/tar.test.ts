import assert from 'node:assert';
import * as fs from 'node:fs/promises';
import { extractTarToDir, packDirToTar } from './tar';

test('tar', async () => {
  const sampleDir = 'test/sample-input';
  const extractedDir = 'test/extracted';

  // make sample files
  await fs.mkdir(sampleDir, { recursive: true });
  await fs.writeFile(`${sampleDir}/0.txt`, 'sample text');
  await fs.writeFile(`${sampleDir}/japan.jpg`, Buffer.from([0xff, 0xd8, 0xff])); // dummy JPEG data

  await fs.mkdir(extractedDir, { recursive: true });

  try {
    // pack -> extract
    const tarStream = await packDirToTar(sampleDir);
    await extractTarToDir(tarStream, extractedDir);

    // check extracted files
    const files = await fs.readdir(extractedDir);
    assert(files.includes('0.txt'));
    assert(files.includes('japan.jpg'));
  } finally {
    // cleanup
    await fs.rm(sampleDir, { recursive: true, force: true });
    await fs.rm(extractedDir, { recursive: true, force: true });
  }
});
