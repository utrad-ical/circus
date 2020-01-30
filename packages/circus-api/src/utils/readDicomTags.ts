import parser from 'dicom-parser';

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
 */
const parseDate = (da: string | undefined, tm?: string) => {
  // Some DICOM files have nonstandard separators, so we remove them
  if (da === undefined) return undefined;
  da = da.replace(/[-/.]/g, '');
  tm = tm ? tm.replace(/[: ]/g, '') : '000000.000000';
  const date = new Date();
  date.setFullYear(
    Number(da.substr(0, 4)),
    Number(da.substr(4, 2)) - 1, // month is zero-based
    Number(da.substr(6, 2))
  );
  date.setHours(
    Number(tm.substr(0, 2)),
    Number(tm.substr(2, 2)),
    Number(tm.substr(4, 2)),
    Math.floor(Number((tm.substr(7) + '000000').substr(0, 6)) / 1000)
  );
  return date;
};

const parsePatientName = (pn: string | undefined) => {
  if (typeof pn !== 'string') return undefined;
  return pn.split('=')[0].replace('^', '');
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
    var ageDifMs = Date.now() - birthDate.getTime();
    var ageDate = new Date(ageDifMs); // miliseconds from epoch
    return ageDate.getUTCFullYear() - 1970;
  }
};

const extractParameters = (dataset: DicomDataset) => {
  return {};
};

const readDicomTags = (data: ArrayBuffer) => {
  const dataset = parser.parseDicom(new Uint8Array(data)) as DicomDataset;
  return {
    seriesUid: dataset.string('x0020000e'),
    studyUid: dataset.string('x0020000d'),
    width: dataset.uint16('x00280011'), // columns
    height: dataset.uint16('x00280010'), // rows
    instanceNumber: dataset.intString('x00200013'),
    seriesDate: parseDate(
      dataset.string('x00080021'), // series date
      dataset.string('x00080031') // series time
    ),
    modality: dataset.string('x00080060'),
    seriesDescription: dataset.string('') || '',
    bodyPart: dataset.string('') || '',
    stationName: dataset.string('x00081010') || '',
    modelName: dataset.string('x00081090') || '',
    manufacturer: dataset.string('x00080070') || '',
    patientInfo: {
      patientId: dataset.string('x00100020'),
      patientName: parsePatientName(dataset.string('x00100010')),
      age: extractAge(dataset.string('x00101010'), dataset.string('x00100030')),
      birthDate: parseDate(dataset.string('x00100030')),
      sex: dataset.string('00100040'),
      size: dataset.floatString('x00101020'),
      weight: dataset.floatString('x00101030')
    },
    parameters: extractParameters(dataset)
  };
};

// TODO: Check the validity of auto-age-calculation using UNIX epoch
// TODO: Parse patient name with correct encoding
// TODO: Support timezone offset from UTC
// TODO: extract various parameters

export default readDicomTags;
