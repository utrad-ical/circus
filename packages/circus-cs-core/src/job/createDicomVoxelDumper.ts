import type {
  DicomFileRepository,
  FunctionService
} from '@utrad-ical/circus-lib';
import type { DicomExtractorWorker } from '@utrad-ical/circus-rs/server';
import {
  generateMhdHeader,
  openSeriesVolume,
  pixelFormatInfo
} from '@utrad-ical/circus-rs/server';
import parser from 'dicom-parser';
import extractCommonValues from '../util/extractCommonValues.ts';
import type { EncConverter } from './encConverter.ts';
import { createEncConverter } from './encConverter.ts';
import type {
  DicomVoxelDumper,
  SeriesEntry,
  DicomVoxelDumperOptions
} from '../interface.ts';
import { EventEmitter } from 'events';
import { createTarPacker, type TarPackController } from 'modern-tar';

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
    numbers.push((dataset as any)[accessor](tag, i) as number);
  }
  return numbers.length === 1 ? numbers[0] : numbers;
};

interface Options {}

const encoder = new TextEncoder();

export const stringifyUN = (data: ArrayBuffer | Uint8Array, tag: string) => {
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
  if (isAscii) return Buffer.from(arr).toString('ascii');
  return (
    'data:application/octet-stream;base64,' +
    Buffer.from(arr).toString('base64')
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
      case 'UN': {
        // UNKNOWN
        const bin = Buffer.from(
          dataset.byteArray.buffer as ArrayBuffer,
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
  {
    dicomFileRepository: DicomFileRepository;
    dicomExtractorWorker: DicomExtractorWorker;
  },
  Options
> = async (opt, deps) => {
  const addEntry = async (
    controller: TarPackController,
    name: string,
    data: string | ReadableStream<Uint8Array>,
    size?: number
  ) => {
    const bytes = typeof data === 'string' ? encoder.encode(data) : undefined;
    const entry = controller.add({
      name,
      size: bytes ? bytes.byteLength : size!,
      type: 'file',
      mode: 0o644,
      mtime: new Date()
    });
    if (bytes) await new Blob([bytes]).stream().pipeTo(entry);
    else await (data as ReadableStream<Uint8Array>).pipeTo(entry);
  };

  const dumpOneSeries = async (
    controller: TarPackController,
    series: SeriesEntry,
    volId: number,
    options?: DicomVoxelDumperOptions
  ) => {
    const neededPrivateTags = options?.neededPrivateTags ?? [];
    const seriesTagData: object[] = [];
    const { metadata, slices } = await openSeriesVolume(
      deps,
      series.seriesUid,
      series.partialVolumeDescriptor,
      async (_, dicom) => {
        const dataSet = parser.parseDicom(new Uint8Array(dicom));
        const encConverter = await prepareEncConverter(
          dataSet.string('x00080005')
        );
        seriesTagData.push(
          dataSetToObject(dataSet, encConverter, neededPrivateTags)
        );
      }
    );
    const { dimension, pixelFormat, elementSpacing } = metadata;
    await addEntry(
      controller,
      `${volId}.mhd`,
      generateMhdHeader(
        pixelFormat,
        dimension,
        elementSpacing,
        `${volId}.raw`,
        'lf'
      )
    );
    const rawSize =
      dimension[0] *
      dimension[1] *
      dimension[2] *
      pixelFormatInfo(pixelFormat).bpp;
    await addEntry(controller, `${volId}.raw`, slices, rawSize);
    const json = JSON.stringify(extractCommonValues(seriesTagData), null, 2);
    await addEntry(controller, `${volId}.json`, json);
  };

  const dump = (series: SeriesEntry[], options?: DicomVoxelDumperOptions) => {
    const events = new EventEmitter();
    const { readable, controller } = createTarPacker();
    (async () => {
      try {
        for (let i = 0; i < series.length; i++) {
          events.emit('volume', i);
          await dumpOneSeries(controller, series[i], i, options);
        }
        controller.finalize();
      } catch (err) {
        // No effect if the reader has already canceled the stream
        controller.error(err);
      }
    })();
    return { stream: readable, events };
  };

  return { dump };
};

createDicomVoxelDumper.dependencies = [
  'dicomFileRepository',
  'dicomExtractorWorker'
];

export default createDicomVoxelDumper;
