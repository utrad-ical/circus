import {
  DicomFileRepository,
  DicomImageData,
  dicomImageExtractor,
  FunctionService,
  generateMhdHeader,
  partialVolumeDescriptorToArray,
  pixelFormatInfo
} from '@utrad-ical/circus-lib';
import parser from 'dicom-parser';
import extractCommonValues from '../util/extractCommonValues';
import { createEncConverter, EncConverter } from './encConverter';
import {
  DicomVoxelDumper,
  SeriesEntry,
  DicomVoxelDumperOptions
} from '../interface';
import { EventEmitter } from 'events';
import { Archiver } from 'archiver';

type KeyValues = { [key: string]: any };

const personalInfoTags: string[] = [
  'x00080080', // Institution name
  'x00080081', // Institution address
  'x00080082', // Institution Code Sequence
  'x00081040', // Institutional Department Name
  'x00081048', // Physician(s) of Record
  'x00081049', // Physician(s) of Record Identification Sequence
  'x00081050', // Performing Physician's Name
  'x00081052', // Performing Physician Identification Sequence
  'x00081060', // Name of Physician(s) ReadingStudy
  'x00081062', // Physician(s) Reading Study Identification Sequence
  'x00081070', // Operators' Name
  'x00081072', // Operator Identification Sequence
  'x00100010', // Patient's name
  'x00100020', // Patient's ID
  'x00100030', // Patient's birth date
  'x00321031', // Requesting Physician Identification Sequence
  'x00321032', // Requesting Physician
  'x00321033', // Requesting Service
  'x00320030' // Patient's birth date
];

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

const returnNumberOrNumberList = (
  dataset: parser.DataSet,
  tag: string,
  accessor: string,
  valueBytes: number
): number | number[] => {
  const numElements = dataset.elements[tag].length / valueBytes;
  if (!numElements) return [];
  const numbers: number[] = [];
  for (let i = 0; i < numElements; i++) {
    numbers.push((<any>dataset)[accessor](tag, i) as number);
  }
  return numbers.length === 1 ? numbers[0] : numbers;
};

interface Options { }

export const stringifyUN = (data: ArrayBuffer, tag: string) => {
  const arr = new Uint8Array(data);
  if (arr.length > 5 * 1024 * 1024)
    throw new Error(`Data of the private tag ${tag} is too large`);
  let isAscii = true;
  for (let i = 0; i < arr.length; i++) {
    // check printable characters
    if (arr[i] < 0x20 || arr[i] > 0x7e) {
      isAscii = false;
      break;
    }
  }
  if (isAscii) return Buffer.from(data).toString('ascii');
  return (
    'data:application/octet-stream;base64,' +
    Buffer.from(data).toString('base64')
  );
};

const dataSetToObject = (
  dataset: parser.DataSet,
  encConverter: EncConverter,
  neededPrivateTags: string[]
): object => {
  const tags = Object.keys(dataset.elements);
  const tagData: KeyValues = {};

  const elementToValue = (
    dataset: parser.DataSet,
    element: parser.Element
  ): any => {
    const { tag, vr, dataOffset, length, items } = element;

    switch (vr) {
      case 'OB':
      case 'OW':
      case 'OD':
      case 'OF':
      case '??':
        return undefined;
      case 'SQ':
        if (Array.isArray(items)) {
          return items.map(element =>
            dataSetToObject(element.dataSet!, encConverter, neededPrivateTags)
          );
        }
        break;
      case 'AT': {
        const group = dataset.uint16(tag, 0) as number;
        const groupHexStr = ('0000' + group.toString(16)).substr(-4);
        const element = dataset.uint16(tag, 1) as number;
        const elementHexStr = ('0000' + element.toString(16)).substr(-4);
        return `0x${groupHexStr}${elementHexStr}`;
      }
      case 'FL':
        return returnNumberOrNumberList(dataset, tag, 'float', 4);
      case 'FD':
        return returnNumberOrNumberList(dataset, tag, 'double', 8);
      case 'UL':
        return returnNumberOrNumberList(dataset, tag, 'uint32', 4);
      case 'SL':
        return returnNumberOrNumberList(dataset, tag, 'int32', 4);
      case 'US':
        return returnNumberOrNumberList(dataset, tag, 'uint16', 2);
      case 'SS':
        return returnNumberOrNumberList(dataset, tag, 'int16', 2);
      case 'UN': { // UNKNOWN
        const bin = Buffer.from(
          dataset.byteArray.buffer,
          element.dataOffset,
          element.length
        );
        return stringifyUN(bin, tag);
      }
      case 'SH':
      case 'LO':
      case 'ST':
      case 'LT':
      case 'PN':
      case 'UT': {
        const bin = Buffer.from(dataset.byteArray.buffer, dataOffset, length);
        return encConverter(bin, vr);
      }
      default:
        return dataset.string(tag);
    }
  };

  for (const tag of tags) {
    const element = dataset.elements[tag];
    // A tag is private if the group number is odd
    const isPrivateTag = /[13579bdf]/i.test(tag[4]);
    const tagreg = new RegExp(`^${tag}$`, 'i');
    if (isPrivateTag && !neededPrivateTags.some(t => tagreg.test(t))) continue;

    // "Item delimitation" tag in a sequence
    if (tag === 'xfffee00d') continue;

    if (personalInfoTags.includes(tag)) continue;

    const tagStr = tag.slice(1).replace(/^.{4}/, '$&,');
    const value = elementToValue(dataset, element);
    tagData[tagStr] = value;
  }
  return tagData;
};

const createDicomVoxelDumper: FunctionService<
  DicomVoxelDumper,
  { dicomFileRepository: DicomFileRepository },
  Options
> = async (opt, { dicomFileRepository }) => {
  const dumpOneSeries = async (
    series: SeriesEntry,
    volId: number,
    archiver: Archiver,
    options?: DicomVoxelDumperOptions
  ) => {
    const seriesTagData = [];
    const seriesAccessor = await dicomFileRepository.getSeries(
      series.seriesUid
    );
    const partialImages = partialVolumeDescriptorToArray(
      series.partialVolumeDescriptor
    );
    const neededPrivateTags = options?.neededPrivateTags ?? [];

    let rawBuffer: Uint8Array | undefined = undefined;
    let firstSlice: DicomImageData | undefined = undefined,
      secondSlice: DicomImageData | undefined = undefined;
    let bytesPerSlice: number;
    const pixelExtractor = dicomImageExtractor();

    for (let i = 0; i < partialImages.length; i++) {
      const buffer = await seriesAccessor.load(partialImages[i]);
      const rootDataset: parser.DataSet = parser.parseDicom(
        new Uint8Array(buffer)
      );
      // Process DICOM tags
      const specificCharacterSet = rootDataset.string('x00080005');
      const encConverter = await prepareEncConverter(specificCharacterSet);
      seriesTagData.push(
        dataSetToObject(rootDataset, encConverter, neededPrivateTags)
      );
      // Process pixel data
      const slice = pixelExtractor(buffer);
      if (i === 0) {
        firstSlice = slice;
        const pfi = pixelFormatInfo(slice.metadata.pixelFormat);
        bytesPerSlice = Math.ceil(
          slice.metadata.columns * slice.metadata.rows * pfi.bpp
        );
        rawBuffer = new Uint8Array(bytesPerSlice * partialImages.length);
      } else if (i === 1) {
        secondSlice = slice;
      }
      rawBuffer!.set(new Uint8Array(slice.pixelData!), i * bytesPerSlice!);
    }
    const result = extractCommonValues(seriesTagData);
    const json = JSON.stringify(result, null, 2);

    const firstSliceMetadata = firstSlice!.metadata;
    const mhd = generateMhdHeader(
      firstSliceMetadata.pixelFormat,
      [
        firstSliceMetadata.columns,
        firstSliceMetadata.rows,
        partialImages.length
      ],
      [
        firstSliceMetadata.pixelSpacing[0],
        firstSliceMetadata.pixelSpacing[1],
        firstSliceMetadata.pitch ??
        (firstSlice && secondSlice
          ? Math.abs(
            firstSlice.metadata.sliceLocation! -
            secondSlice.metadata.sliceLocation!
          )
          : 1)
      ],
      `${volId}.raw`,
      'lf'
    );

    const buffer = Buffer.from(rawBuffer!.buffer);
    archiver.append(mhd, { name: `${volId}.mhd` });
    archiver.append(buffer, { name: `${volId}.raw` });
    archiver.append(json, { name: `${volId}.json` });
  };

  const dump = (
    series: SeriesEntry[],
    archiver: Archiver,
    options?: DicomVoxelDumperOptions
  ) => {
    const events = new EventEmitter();
    (async () => {
      for (let i = 0; i < series.length; i++) {
        events.emit('volume', i);
        await dumpOneSeries(series[i], i, archiver, options);
      }
      archiver.finalize();
    })();
    return { stream: archiver, events };
  };

  return { dump };
};

createDicomVoxelDumper.dependencies = ['dicomFileRepository'];

export default createDicomVoxelDumper;
