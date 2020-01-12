import path from 'path';
import DockerRunner from '@utrad-ical/circus-lib/lib/docker-runner/DockerRunner';
import fs from 'fs-extra';
import buildDicomVolumes from './buildDicomVolumes';

const testDir = path.resolve(__dirname, '../../test/');
const repositoryDir = path.join(testDir, 'repository/');
const seriesUid = 'dicom';

describe('buildDicomVolume', () => {
  // If this test fails, double-check 'dicom_voxel_dump' image
  // has been correctly loaded in the Docker environment.
  test('craetes raw volume file', async () => {
    const srcDir = path.join(repositoryDir, seriesUid);
    const tmpDestDir = path.resolve(__dirname, '../../test/dicom-out');
    await fs.emptyDir(tmpDestDir);
    try {
      const runner = new DockerRunner();
      await buildDicomVolumes(runner, [srcDir], tmpDestDir);
      const files = await fs.readdir(tmpDestDir);
      expect(files).toContain('0.mhd');
      expect(files).toContain('0.raw');
      expect(files).toContain('0.txt');
    } finally {
      await fs.remove(tmpDestDir);
    }
  });
});
