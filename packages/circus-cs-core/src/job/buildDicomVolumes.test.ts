import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { createDicomExtractorWorker } from '@utrad-ical/circus-rs/server';
import path from 'path';
import fs from 'node:fs/promises';
import buildDicomVolumes from './buildDicomVolumes.ts';
import type { DicomFileRepository } from '@utrad-ical/circus-lib';
import createDicomVoxelDumper from './createDicomVoxelDumper.ts';
import { PassThrough } from 'stream';

const mockDicomFileRepository: DicomFileRepository = {
  getSeries: async (seriesUid: string) => {
    const testDir = path.join(
      import.meta.dirname,
      '../../test/repository/dicom'
    );
    return {
      load: async (image: number) => {
        const buffer = await fs.readFile(path.join(testDir, `00000001.dcm`));
        return buffer.buffer;
      },
      save: async () => {},
      images: '1-10'
    };
  },
  deleteSeries: async () => {}
};

describe('buildDicomVolume', () => {
  test('craetes raw volume file', async () => {
    const dicomExtractorWorker = await createDicomExtractorWorker({});
    const dicomVoxelDumper = await createDicomVoxelDumper(
      {},
      { dicomFileRepository: mockDicomFileRepository, dicomExtractorWorker }
    );
    const logStream = new PassThrough();
    const tmpDestDir = path.resolve(
      import.meta.dirname,
      '../../test/build-dicom-test'
    );
    await fs.rm(tmpDestDir, { recursive: true, force: true });
    await fs.mkdir(tmpDestDir, { recursive: true });
    try {
      await buildDicomVolumes(
        dicomVoxelDumper,
        [
          {
            seriesUid: '1.2.3.4.5',
            partialVolumeDescriptor: { start: 10, end: 1, delta: -1 }
          }
        ],
        tmpDestDir,
        logStream
      );
      const files = await fs.readdir(tmpDestDir);
      assert.ok(files.includes('0.mhd'));
      assert.ok(files.includes('0.raw'));
      assert.ok(files.includes('0.json'));
    } finally {
      await dicomExtractorWorker.dispose();
      await fs.rm(tmpDestDir, { recursive: true, force: true });
    }
  });
});
