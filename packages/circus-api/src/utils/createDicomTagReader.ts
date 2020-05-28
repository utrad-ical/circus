import { NoDepFunctionService } from '@utrad-ical/circus-lib';
import parser from 'dicom-parser';
import { createEncConverter, EncConverter } from './encConverter';
import { DicomTagReader } from '../interface';

const stripUndefined: <T extends object>(input: T) => Partial<T> = input => {
  Object.keys(input).forEach(k => {
    if ((input as any)[k] === undefined) delete (input as any)[k];
  });
  return input;
};

/**
 * Parses DICOM Date/Time.
 * This uses the system's *local* time zone.
 * @param da DICOM 'DA' (Date) string (`YYYYMMDD`).
 * @param tm DICOM 'TM' (Time) string (`HHMMSS.FFFFFF`)
 * @param tzOffset Timezone offset represented in minutes (e.g., UTC+9 = 540)
 */
export const parseDate = (
  da: string | undefined,
  tm?: string,
  tzOffset: number = 0
) => {
  // Some DICOM files have nonstandard separators, so we remove them
  if (da === undefined) return undefined;
  da = da.replace(/[-/.]/g, '');
  tm = tm ? tm.replace(/[: ]/g, '') : '000000.000000';
  const date = new Date();
  date.setUTCFullYear(
    Number(da.substring(0, 4)),
    Number(da.substring(4, 6)) - 1, // month is zero-based
    Number(da.substring(6))
  );
  date.setUTCHours(
    Number(tm.substring(0, 2)),
    Number(tm.substring(2, 4)) - tzOffset,
    Number(tm.substring(4, 6)),
    Math.floor(Number((tm.substring(7) + '000000').substring(0, 6)) / 1000)
  );
  return date;
};

const parseBirthDate = (da: string | undefined) => {
  if (da === undefined || da.length !== 8) return undefined;
  return da.substring(0, 4) + '-' + da.substring(4, 6) + '-' + da.substring(6);
};

const extractPatientName = (
  dataset: parser.DicomDataset,
  encConverter: EncConverter
) => {
  const element = dataset.elements['x00100010'];
  if (!element) return undefined;
  const buffer = Buffer.from(
    dataset.byteArray.buffer,
    element.dataOffset,
    element.length
  );
  const rawPn = encConverter(buffer, 'PN');
  return rawPn;
};

const calcAge = (birthDay: Date, today: Date = new Date()) => {
  let years = today.getFullYear() - birthDay.getFullYear();
  if (
    today.getMonth() < birthDay.getMonth() ||
    (today.getMonth() == birthDay.getMonth() &&
      today.getDate() < birthDay.getDate())
  ) {
    years--;
  }
  return years;
};

const extractAge = (
  ageStr: string | undefined,
  birthDateStr: string | undefined
) => {
  if (typeof ageStr === 'string' && /^(\d\d\d)([DWMY])$/.test(ageStr || '')) {
    const nnn = Number(ageStr.substring(0, 3));
    const unit = ageStr.substring(3);
    switch (unit) {
      case 'Y':
        return nnn;
      case 'M':
        return Math.floor(nnn / 12);
      case 'W':
        return Math.floor((nnn * 7) / 365);
      case 'D':
        return Math.floor(nnn / 365);
    }
  } else {
    const birthDate = parseDate(birthDateStr);
    if (!birthDate) return undefined;
    return calcAge(birthDate, new Date());
  }
};

export interface Parameters {
  pixelSpacingX?: number;
  pixelSpacingY?: number;
  kVP?: number;
  dataCollectionDiameter?: number;
  reconstructionDiameter?: number;
  exposureTime?: number;
  xRayTubeCurrent?: number;
  filterType?: string;
  convolutionKernel?: string;
  scanningSequence?: string;
  sequenceVariant?: string;
  mrAcquisitionType?: string;
  repetitionTime?: number;
  echoTime?: number;
  inversionTime?: number;
  numberOfAverages?: number;
  imagingFrequency?: number;
  echoNumber?: number;
  magneticFieldStrength?: number;
  echoTrainLength?: number;
  flipAngle?: number;
  radiopharmaceutical?: string;
  radionuclideTotalDose?: number;
  pixelValueUnits?: string;
}

const extractParameters = (dataset: parser.DicomDataset) => {
  const data: Parameters = {
    pixelSpacingX: dataset.floatString('x00280030', 0),
    pixelSpacingY: dataset.floatString('x00280030', 1),
    // CT related values
    kVP: dataset.floatString('x00180060'),
    dataCollectionDiameter: dataset.floatString('x00180090'),
    reconstructionDiameter: dataset.floatString('x00181100'),
    exposureTime: dataset.floatString('x00181150'), // IS
    xRayTubeCurrent: dataset.floatString('x00181151'), // IS
    filterType: dataset.string('x00181160'), // SH
    convolutionKernel: dataset.string('x00181210'), // SH
    // MR related values
    scanningSequence: dataset.string('x00180020'), // CS
    sequenceVariant: dataset.string('x00180021'), // CS
    mrAcquisitionType: dataset.string('x00180023'), // CS
    repetitionTime: dataset.floatString('x00180080'),
    echoTime: dataset.floatString('x00180081'),
    inversionTime: dataset.floatString('x00180082'),
    numberOfAverages: dataset.floatString('x00180083'),
    imagingFrequency: dataset.floatString('x00180084'),
    echoNumber: dataset.floatString('x00180086'),
    magneticFieldStrength: dataset.floatString('x00180087'),
    echoTrainLength: dataset.floatString('x00180091'), // IS
    flipAngle: dataset.floatString('x00181314'), // DS
    // PT/NM related values
    radiopharmaceutical: dataset.string('x00180031'), // LO
    radionuclideTotalDose: dataset.floatString('x00181074'),
    // Misc
    pixelValueUnits: dataset.string('x00541001') // CS
  };
  return stripUndefined(data);
};

const prepareEncConverter = async (charSet: string | undefined) => {
  const defaultEncConverter: EncConverter = buf => buf.toString('latin1');
  if (!charSet) {
    // Empty tag means only 7-bit ASCII characters will be used.
    return defaultEncConverter;
  }
  const converter = await createEncConverter(charSet);
  if (converter) {
    // Found a good converter
    return converter;
  }
  throw new Error(`Could not find a encoding ${charSet}`);
};

const extractTzOffset = (
  tzOffsetString: string | undefined,
  defaultTzOffset: number
) => {
  if (typeof tzOffsetString !== 'string' || !/^[+-]\d{4}$/.test(tzOffsetString))
    return defaultTzOffset;
  const sign = tzOffsetString[0] === '-' ? -1 : 1;
  const hourOffset = Number(tzOffsetString.substring(1, 3));
  const minuteOffset = Number(tzOffsetString.substring(3));
  return sign * (hourOffset * 60) * minuteOffset;
};

interface Options {
  defaultTzOffset?: number;
  defaultEncoding?: string;
}

export const readDicomTags = async (
  data: ArrayBuffer,
  options: Options = {}
) => {
  const dataset = (() => {
    try {
      return parser.parseDicom(new Uint8Array(data));
    } catch (err) {
      if (typeof err === 'string') throw new Error(err);
      else throw err;
    }
  })();
  const { defaultTzOffset = 0 } = options;
  const tzOffset = extractTzOffset(
    dataset.string('x00080201'),
    defaultTzOffset
  );

  const specificCharacterSet = dataset.string('x00080005');
  const encConverter = await prepareEncConverter(specificCharacterSet);

  return {
    seriesUid: dataset.string('x0020000e')!,
    studyUid: dataset.string('x0020000d')!,
    width: dataset.uint16('x00280011'), // columns
    height: dataset.uint16('x00280010'), // rows
    instanceNumber: dataset.intString('x00200013'),
    seriesDate: parseDate(
      dataset.string('x00080021'), // series date
      dataset.string('x00080031'), // series time
      tzOffset
    ),
    modality: dataset.string('x00080060'),
    seriesDescription: dataset.string('x0008103e') || '',
    bodyPart: dataset.string('x00180015') || '',
    stationName: dataset.string('x00081010') || '',
    modelName: dataset.string('x00081090') || '',
    manufacturer: dataset.string('x00080070') || '',
    patientInfo: stripUndefined({
      patientId: dataset.string('x00100020'),
      patientName: extractPatientName(dataset, encConverter),
      age: extractAge(dataset.string('x00101010'), dataset.string('x00100030')),
      birthDate: parseBirthDate(dataset.string('x00100030')), // Ignores tzOffset
      sex: dataset.string('x00100040'),
      size: dataset.floatString('x00101020'),
      weight: dataset.floatString('x00101030')
    }),
    parameters: extractParameters(dataset),
    ImagePositionPatientZ: dataset.floatString('x00200032', 2)
  };
};

const createDicomTagReader: NoDepFunctionService<
  DicomTagReader,
  Options
> = async options => {
  return (data: ArrayBuffer) => readDicomTags(data, options);
};

export default createDicomTagReader;
