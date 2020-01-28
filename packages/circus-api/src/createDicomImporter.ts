import * as path from 'path';
import randomstring from 'randomstring';
import fs from 'fs-extra';
import { multirange } from 'multi-integer-range';
import exec from './utils/exec';
import * as os from 'os';
import { Models } from './db/createModels';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';
import { FunctionService } from '@utrad-ical/circus-lib';
import Logger from '@utrad-ical/circus-rs/src/server/helper/logger/Logger';

interface Options {
  dockerImage?: string;
  workDir?: string;
}

export interface DicomImporter {
  readDicomTagsFromFile: (file: string) => Promise<any>;
  readDicomTags: (fileContent: Buffer) => Promise<any>;
  importFromFile: (file: string, domain: string) => Promise<void>;
  workDir: string;
}

const createDicomImporter: FunctionService<
  DicomImporter,
  {
    dicomFileRepository: DicomFileRepository;
    models: Models;
    apiLogger: Logger;
  }
> = async (options: Options = {}, { dicomFileRepository, models }) => {
  const {
    dockerImage = 'circuscad/dicom_utility:1.0.0',
    workDir = os.tmpdir()
  } = options;

  const readDicomTagsFromFile = async (file: string) => {
    if (!file) throw new TypeError('File not specified');
    const dir = path.dirname(file);
    const fileName = path.basename(file);
    const out = await exec('docker', [
      'run',
      '--rm',
      '-v',
      dir + ':/circus',
      dockerImage,
      'dump',
      '--stdout',
      '/circus/' + fileName
    ]);
    return JSON.parse(out);
  };

  const readDicomTags = async (fileContent: Buffer) => {
    const tmpFile = path.join(
      workDir,
      randomstring.generate({ length: 32, charset: 'hex' }) + '.dcm'
    );
    try {
      await fs.writeFile(tmpFile, fileContent);
      return readDicomTagsFromFile(tmpFile);
    } finally {
      await fs.unlink(tmpFile);
    }
  };

  const parseBirthDate = (str: string) => {
    const m = /^(\d\d\d\d)(\d\d)(\d\d)$/.exec(str);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return undefined;
  };

  const buildDate = (dateStr: string, timeStr: string) => {
    const [, year, month, day] = dateStr.match(/^(\d{4})(\d\d)(\d\d)$/);
    const [, hour, minute, second] = timeStr.match(/^(\d\d)(\d\d)(\d\d)/);
    return new Date(
      parseInt(year),
      parseInt(month) - 1, // month is zero-based
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  };

  const buildNewDocument = (tags: any, domain: string) => {
    const doc = {
      seriesUid: tags.seriesInstanceUID,
      studyUid: tags.studyInstanceUID,
      width: parseInt(tags.width),
      height: parseInt(tags.height),
      images: tags.instanceNumber,
      seriesDate: buildDate(tags.seriesDate, tags.seriesTime),
      modality: tags.modality,
      seriesDescription: tags.seriesDescription,
      bodyPart: tags.bodyPart,
      stationName: tags.stationName,
      modelName: tags.modelName,
      manufacturer: tags.manufacturer,
      storageId: 0,
      patientInfo: {
        patientId: tags.patientID,
        patientName: tags.patientName,
        age: parseInt(tags.age),
        birthDate: parseBirthDate(tags.birthDate),
        sex: tags.sex,
        size: parseFloat(tags.size),
        weight: parseFloat(tags.weight)
      },
      parameters: {},
      domain
    };
    return doc;
  };

  const importFromFile = async (file: string, domain: string) => {
    // Read the DICOM file
    const tags = await readDicomTagsFromFile(file);
    const fileContent = await fs.readFile(file);
    const seriesUid = tags.seriesInstanceUID;

    // Check if there is already a series with the same series UID
    const series = await models.series.findById(seriesUid);

    if (series) {
      // Add image number
      const mr = multirange(series.images);
      mr.append(parseInt(tags.instanceNumber));
      await models.series.modifyOne(seriesUid, { images: mr.toString() });
    } else {
      // Insert as a new series
      const doc = buildNewDocument(tags, domain);
      await models.series.insert(doc);
    }

    // const key = `${tags.seriesInstanceUID}/${tags.instanceNumber}`;
    // await this.storage.save(key, fileContent);
    const seriesLoader = await dicomFileRepository.getSeries(seriesUid);
    await seriesLoader.save(parseInt(tags.instanceNumber), fileContent.buffer);
  };

  return { importFromFile, readDicomTags, readDicomTagsFromFile, workDir };
};

createDicomImporter.dependencies = [
  'dicomFileRepository',
  'models',
  'apiLogger'
];

export default createDicomImporter;
