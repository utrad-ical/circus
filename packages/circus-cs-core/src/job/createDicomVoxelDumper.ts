import {
  DicomFileRepository,
  DicomImageData,
  dicomImageExtractor,
  FunctionService,
  generateMhdHeader,
  partialVolumeDescriptorToArray,
  pixelFormatInfo
} from '@utrad-ical/circus-lib';
import PartialVolumeDescriptor from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import parser from 'dicom-parser';
import extractCommonValues from '../util/extractCommonValues';
import { createEncConverter, EncConverter } from './encConverter';
import tar from 'tar-stream';

type KeyValues = { [key: string]: any };

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
  dataset: parser.DicomDataset,
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

interface SeriesEntry {
  seriesUid: string;
  partialVolumeDescriptor: PartialVolumeDescriptor;
}

interface DicomVoxelDumper {
  dump: (series: SeriesEntry[]) => tar.Pack;
}

interface Options {}

const dataSetToObject = (
  dataset: parser.DicomDataset,
  encConverter: EncConverter
): object => {
  const tags = Object.keys(dataset.elements);
  const tagData: KeyValues = {};

  const elementToValue = (
    dataset: parser.DicomDataset,
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
            dataSetToObject(element.dataSet, encConverter)
          );
        }
        break;
      case 'AT':
        const group = dataset.uint16(tag, 0) as number;
        const groupHexStr = ('0000' + group.toString(16)).substr(-4);
        const element = dataset.uint16(tag, 1) as number;
        const elementHexStr = ('0000' + element.toString(16)).substr(-4);
        return `0x${groupHexStr}${elementHexStr}`;
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
      case 'UN': // UNKNOWN
        return undefined;
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
    if (isPrivateTag) continue;

    // "Item delimitation" tag in a sequence
    if (tag === 'xfffee00d') continue;

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
    stream: tar.Pack
  ) => {
    const seriesTagData = [];
    const seriesAccessor = await dicomFileRepository.getSeries(
      series.seriesUid
    );
    const partialImages = partialVolumeDescriptorToArray(
      series.partialVolumeDescriptor
    );

    let rawBuffer: Uint8Array | undefined = undefined;
    let firstSlice: DicomImageData | undefined = undefined,
      secondSlice: DicomImageData | undefined = undefined;
    let bytesPerSlice: number;
    const pixelExtractor = dicomImageExtractor();

    for (let i = 0; i < partialImages.length; i++) {
      const buffer = await seriesAccessor.load(partialImages[i]);
      const rootDataset: parser.DicomDataset = parser.parseDicom(
        new Uint8Array(buffer)
      );
      // Process DICOM tags
      const specificCharacterSet = rootDataset.string('x00080005');
      const encConverter = await prepareEncConverter(specificCharacterSet);
      seriesTagData.push(dataSetToObject(rootDataset, encConverter));
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
    stream.entry({ name: `${volId}.mhd` }, mhd);
    stream.entry({ name: `${volId}.raw` }, buffer);
    stream.entry({ name: `${volId}.json` }, json);
  };

  const dump = (series: SeriesEntry[]) => {
    const stream = tar.pack();
    (async () => {
      for (let i = 0; i < series.length; i++) {
        await dumpOneSeries(series[i], i, stream);
      }
      stream.finalize();
    })();
    return stream;
  };

  return { dump };
};

createDicomVoxelDumper.dependencies = ['dicomFileRepository'];

export default createDicomVoxelDumper;
