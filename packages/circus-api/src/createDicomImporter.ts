import { FunctionService } from '@utrad-ical/circus-lib';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import Logger from '@utrad-ical/circus-lib/lib/logger/Logger';
import { multirange } from 'multi-integer-range';
import { DicomImporter, Models, DicomTagReader } from './interface';
import { DicomUtilityRunner } from './utils/createDicomUtilityRunner';

interface Options {
  /**
   * Whether to compress the input file. `compress` means always
   * trying to compress the input DICOM file using the lossless JPEG algorithm.
   */
  compression: 'compress' | 'pass';
}

const createDicomImporter: FunctionService<
  DicomImporter,
  {
    dicomFileRepository: DicomFileRepository;
    models: Models;
    apiLogger: Logger;
    dicomTagReader: DicomTagReader;
    dicomUtilityRunner: DicomUtilityRunner;
  }
> = async (
  options: Options,
  { dicomFileRepository, models, apiLogger, dicomTagReader, dicomUtilityRunner }
) => {
  const importDicom = async (fileContent: ArrayBuffer, domain: string) => {
    // Read the DICOM file
    const { instanceNumber, ...tags } = await dicomTagReader(fileContent);

    if (options.compression === 'compress') {
      fileContent = await dicomUtilityRunner.compress(fileContent);
    }

    if (typeof instanceNumber !== 'number') {
      throw new Error('Instance number not set');
    }
    // Check if there is already a series with the same series UID
    const seriesUid = tags.seriesUid;
    const series = await models.series.findById(seriesUid);

    apiLogger.trace(`Importing ${seriesUid} #${instanceNumber}`, tags);

    if (series) {
      // Add image number
      const mr = multirange(series.images);
      mr.append(instanceNumber);
      await models.series.modifyOne(seriesUid, { images: mr.toString() });
    } else {
      // Insert as a new series
      const doc = {
        ...tags,
        images: String(instanceNumber),
        domain,
        storageId: 0
      };
      await models.series.insert(doc);
    }

    const seriesLoader = await dicomFileRepository.getSeries(seriesUid);
    await seriesLoader.save(instanceNumber, fileContent);
  };

  return { importDicom };
};

createDicomImporter.dependencies = [
  'dicomFileRepository',
  'models',
  'apiLogger',
  'dicomTagReader',
  'dicomUtilityRunner'
];

export default createDicomImporter;
