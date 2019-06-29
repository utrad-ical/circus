import DockerRunner from '../util/DockerRunner';

/**
 * Builds raw volume data (and associated files) from DICOM series
 * using dicom_voxel_dump.
 * @param dockerRunner Docker runner instance.
 * @param srcDir Directory that contains a DICOM series (00000001.dcm, ...).
 * @param destDir Directory that will have the generated volume (0.vol,...).
 */
const buildDicomVolumes = async (
  dockerRunner: DockerRunner,
  srcDirs: string[],
  destDir: string
) => {
  const dockerImage = 'circus/dicom_voxel_dump:1.0';

  for (let i = 0; i < srcDirs.length; i++) {
    const srcDir = srcDirs[i];
    const result = await dockerRunner.run({
      Image: dockerImage,
      HostConfig: {
        Binds: [`${srcDir}:/circus/in`, `${destDir}:/circus/out`],
        AutoRemove: false
      }
    });

    if (!result) {
      throw new Error('Voxel dumper did not finish correctly.');
    }
    if (!result.match(/Export\s+result:(\d+),(-?\d+),(\d+)\s+Succeeded/)) {
      throw new Error('Voxel dumper returned unexpected result:\n' + result);
    }
  }
};

export default buildDicomVolumes;
