import * as path from 'path';
import randomstring from 'randomstring';
import fs from 'fs-extra';
import { multirange } from 'multi-integer-range';
import exec from './utils/exec';
import * as os from 'os';
import { Models } from './db/createModels';
import { DicomFileRepository } from '@utrad-ical/circus-lib/lib/dicom-file-repository';

interface Options {
  utility: string;
  workDir?: string;
}

export default class DicomImporter {
  private models: Models;
  private repository: DicomFileRepository;
  private utility: string;
  public workDir: string;

  constructor(repository: DicomFileRepository, models: Models, opts: Options) {
    const { utility, workDir } = opts;
    this.models = models;
    this.repository = repository;
    this.utility = utility;
    this.workDir = workDir ? workDir : os.tmpdir();
  }

  /**
   * @param file Full path for the target file
   */
  async readDicomTagsFromFile(file: string): Promise<any> {
    if (!file) throw new TypeError('File not specified');
    const out = await exec(this.utility, ['dump', '--stdout', file]);
    return JSON.parse(out);
  }

  async readDicomTags(fileContent: Buffer) {
    const tmpFile = path.join(
      this.workDir,
      randomstring.generate({ length: 32, charset: 'hex' }) + '.dcm'
    );
    try {
      await fs.writeFile(tmpFile, fileContent);
      return this.readDicomTagsFromFile(tmpFile);
    } finally {
      await fs.unlink(tmpFile);
    }
  }

  parseBirthDate(str: string) {
    const m = /^(\d\d\d\d)(\d\d)(\d\d)$/.exec(str);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    return undefined;
  }

  buildDate(dateStr: string, timeStr: string) {
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
  }

  buildNewDocument(tags: any, domain: string) {
    const doc = {
      seriesUid: tags.seriesInstanceUID,
      studyUid: tags.studyInstanceUID,
      width: parseInt(tags.width),
      height: parseInt(tags.height),
      images: tags.instanceNumber,
      seriesDate: this.buildDate(tags.seriesDate, tags.seriesTime),
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
        birthDate: this.parseBirthDate(tags.birthDate),
        sex: tags.sex,
        size: parseFloat(tags.size),
        weight: parseFloat(tags.weight)
      },
      parameters: {},
      domain
    };
    return doc;
  }

  async importFromFile(file: string, domain: string) {
    // Read the DICOM file
    const tags = await this.readDicomTagsFromFile(file);
    const fileContent = await fs.readFile(file);
    const seriesUid = tags.seriesInstanceUID;

    // Check if there is already a series with the same series UID
    const series = await this.models.series.findById(seriesUid);

    if (series) {
      // Add image number
      const mr = multirange(series.images);
      mr.append(parseInt(tags.instanceNumber));
      await this.models.series.modifyOne(seriesUid, { images: mr.toString() });
    } else {
      // Insert as a new series
      const doc = this.buildNewDocument(tags, domain);
      await this.models.series.insert(doc);
    }

    // const key = `${tags.seriesInstanceUID}/${tags.instanceNumber}`;
    // await this.storage.save(key, fileContent);
    const seriesLoader = await this.repository.getSeries(seriesUid);
    await seriesLoader.save(parseInt(tags.instanceNumber), fileContent.buffer);
  }
}
