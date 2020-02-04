import parser from 'dicom-parser';
import { EncConverter, createEncConverter } from './encConverter';

type DicomDataset = {
  elements: {
    [tag: string]: {
      dataOffset: number;
      length: number;
      fragments: any;
    };
  };
  byteArray: Uint8Array;
  string: (tag: string) => string | undefined;
  uint16: (tag: string) => number | undefined;
  floatString: (tag: string) => number | undefined;
  intString: (tag: string) => number | undefined;
};

/**
 * Parses DICOM Date/Time.
 * This uses the system's *local* time zone.
 * @param da DICOM 'DA' (Date) string (`YYYYMMDD`).
 * @param tm DICOM 'TM' (Time) string (`HHMMSS.FFFFFF`)
 * @param tzOffset Timezone offset represented in minutes (e.g., UTC+9 = 540)
 */
const parseDate = (
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
    Number(da.substr(0, 4)),
    Number(da.substr(4, 2)) - 1, // month is zero-based
    Number(da.substr(6, 2))
  );
  date.setUTCHours(
    Number(tm.substr(0, 2)),
    Number(tm.substr(2, 2)) - tzOffset,
    Number(tm.substr(4, 2)),
    Math.floor(Number((tm.substr(7) + '000000').substr(0, 6)) / 1000)
  );
  return date;
};

const extractPatientName = (
  dataset: DicomDataset,
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
    const nnn = Number(ageStr.substr(0, 3));
    const unit = ageStr.substr(3);
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

const extractParameters = (dataset: DicomDataset) => {
  return {};
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
  if (
    typeof tzOffsetString !== 'string' ||
    !/^[+\-]\d{4}$/.test(tzOffsetString)
  )
    return defaultTzOffset;
  const sign = tzOffsetString[0] === '-' ? -1 : 1;
  const hourOffset = Number(tzOffsetString.substr(1, 2));
  const minuteOffset = Number(tzOffsetString.substr(3, 2));
  return sign * (hourOffset * 60) * minuteOffset;
};

interface Options {
  defaultTzOffset?: number;
}

const readDicomTags = async (data: ArrayBuffer, options: Options = {}) => {
  const dataset = parser.parseDicom(new Uint8Array(data)) as DicomDataset;
  const { defaultTzOffset = 0 } = options;
  const tzOffset = extractTzOffset(
    dataset.string('x00080201'),
    defaultTzOffset
  );

  const specificCharacterSet = dataset.string('x00080005');
  const encConverter = await prepareEncConverter(specificCharacterSet);

  return {
    seriesUid: dataset.string('x0020000e'),
    studyUid: dataset.string('x0020000d'),
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
    patientInfo: {
      patientId: dataset.string('x00100020'),
      patientName: extractPatientName(dataset, encConverter),
      age: extractAge(dataset.string('x00101010'), dataset.string('x00100030')),
      birthDate: parseDate(dataset.string('x00100030')), // Ignores tzOffset
      sex: dataset.string('x00100040'),
      size: dataset.floatString('x00101020'),
      weight: dataset.floatString('x00101030')
    },
    parameters: extractParameters(dataset)
  };
};

// TODO: extract various parameters

export default readDicomTags;
