import { FunctionService } from '@utrad-ical/circus-lib';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import Logger from '@utrad-ical/circus-rs/src/server/helper/logger/Logger';
import { multirange } from 'multi-integer-range';
import { Models } from './db/createModels';
import { DicomTagReader } from './utils/createDicomTagReader';

interface Options {
  dockerImage?: string;
  workDir?: string;
}

export interface DicomImporter {
  importDicom: (fileContent: ArrayBuffer, domain: string) => Promise<void>;
}

const createDicomImporter: FunctionService<
  DicomImporter,
  {
    dicomFileRepository: DicomFileRepository;
    models: Models;
    apiLogger: Logger;
    dicomTagReader: DicomTagReader;
  }
> = async (
  options: Options = {},
  { dicomFileRepository, models, apiLogger, dicomTagReader }
) => {
  const importDicom = async (fileContent: ArrayBuffer, domain: string) => {
    // Read the DICOM file
    const { instanceNumber, ...tags } = await dicomTagReader(fileContent);
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
  'dicomTagReader'
];

export default createDicomImporter;
