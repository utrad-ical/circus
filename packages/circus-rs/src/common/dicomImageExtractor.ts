import { PixelFormat, pixelFormatInfo } from './PixelFormat';

import lj from 'jpeg-lossless-decoder-js';
import * as parser from 'dicom-parser';

interface RescaleParams {
  slope: number;
  intercept: number;
}
interface WindowParams {
  level: number;
  width: number;
}
type ExtractOptions = {
  skipExtractPixels?: boolean;
  frame?: number;
};

type DicomDataset = {
  elements: {
    [tag: string]: {
      dataOffset: number;
      length: number;
    };
  };
  byteArray: Uint8Array;
  string: (tag: string) => string;
  uint16: (tag: string) => number;
  floatString: (tag: string) => number;
};

type ExtractPixelInfo = {
  pixelData: ArrayBuffer;
  minValue: number;
  maxValue: number;
};

type DicomFileBuffer = ArrayBuffer;
type DicomImagePixelData = ArrayBuffer;

export type DicomImageData = {
  metadata: DicomMetadata;
  pixelData?: DicomImagePixelData; // parsed;
};
export type DicomMetadata = {
  modality: string;
  columns: number;
  rows: number;
  pitch?: number;
  pixelSpacing: [number, number];
  pixelFormat: PixelFormat;
  rescale: RescaleParams;
  window?: WindowParams;
  sliceLocation: number;
  minValue?: number;
  maxValue?: number;
};

export type Extractor<T> = (buffer: DicomFileBuffer) => T;

/**
 * DICOM parser and pixel data extractor.
 * This class works synchronouslly.
 *
 * Some lines of codes are taken from chafey/cornerstoneWADOImageLoader.
 * https://github.com/chafey/cornerstoneWADOImageLoader
 * Copyright 2015 Chris Hafey chafey@gmail.com
 */

/**
 * Extracts the pixel data from a DICOM file.
 */
const dicomImageExtractor: (
  options?: ExtractOptions
) => Extractor<DicomImageData> = (options = {}) => {
  const { frame = 1, skipExtractPixels = false } = options;
  if (frame !== 1) throw new Error('Multiframe images are not supported yet.');

  return dicomFileBuffer => {
    const dataset: DicomDataset = parser.parseDicom(
      new Uint8Array(dicomFileBuffer)
    );

    const transferSyntax = dataset.string('x00020010');
    const modality = dataset.string('x00080060');

    const pitch = determinePitch(dataset);

    // Get relevant DICOM element data (in group 0028)
    const columns = dataset.uint16('x00280011'); // columns
    const rows = dataset.uint16('x00280010'); // rows
    const pixelSpacingRaw = dataset.string('x00280030');
    const pixelSpacing = <[number, number]>(pixelSpacingRaw
      ? pixelSpacingRaw.split('\\').map(x => parseFloat(x))
      : [1, 1]);
    const rescale = determineRescale(dataset);
    const pixelFormat = determinePixelFormat(dataset);
    
    if (pixelFormat === PixelFormat.Unknown)
      throw new RangeError('Unsupported pixel format detected.');

    const window = determineWindow(dataset);
    const sliceLocation = dataset.floatString('x00201041');

    // PhotometricInterpretation == 'MONOCHROME1' means
    // large pixel value means blacker instead of whiter
    const photometricInterpretation = dataset.string('x00280004');
    if (!/^MONOCHROME/.test(photometricInterpretation)) {
      throw new Error('Non-monochrome images are not supported yet.');
    }
    // let invert = (photometricInterpretation === 'MONOCHROME1');

    let metadata: DicomMetadata = {
      modality,
      columns,
      rows,
      pitch,
      pixelSpacing,
      pixelFormat,
      rescale,
      window,
      sliceLocation
    };

  if (!skipExtractPixels) {
      let { minValue, maxValue, pixelData } = extractPixels(
        dataset,
        transferSyntax,
        rows,
        columns,
        pixelFormat
      );

      if (modality === 'CT') {
        const { slope, intercept } = rescale;
        minValue = minValue * slope + intercept;
        maxValue = maxValue * slope + intercept;
        const { read, length } = getPixelAccessor(pixelData, pixelFormat);
        const convertedPixelData = new ArrayBuffer(pixelData.byteLength);
        const { write } = getPixelAccessor(
          convertedPixelData,
          PixelFormat.Int16
        );
        for (let i = 0; i < length; i++) {
          write(i, read(i) * slope + intercept);
        }
        metadata.pixelFormat = PixelFormat.Int16;
        pixelData = convertedPixelData;
      }

      metadata.minValue = minValue;
      metadata.maxValue = maxValue;
      return {
        metadata,
        pixelData
      };
    } else {
      return { metadata };
    }
  };
};

function determinePixelFormat(dataset: DicomDataset): PixelFormat {
  const pixelRepresentation = dataset.uint16('x00280103');
  const bitsAllocated = dataset.uint16('x00280100');
  if (pixelRepresentation === 0 && bitsAllocated === 8) {
    return PixelFormat.UInt8;
  } else if (pixelRepresentation === 1 && bitsAllocated === 8) {
    return PixelFormat.Int8; // This should be rare
  } else if (pixelRepresentation === 0 && bitsAllocated === 16) {
    return PixelFormat.UInt16; // unsigned 16 bit
  } else if (pixelRepresentation === 1 && bitsAllocated === 16) {
    return PixelFormat.Int16; // signed 16 bit data
  }
  return PixelFormat.Unknown;
}

function determineRescale(dataset: DicomDataset): RescaleParams {
  let [intercept, slope] = [0.0, 1.0];
  if (dataset.elements['x00281052'] && dataset.elements['x00281053']) {
    intercept = dataset.floatString('x00281052');
    slope = dataset.floatString('x00281053');
  }
  return { intercept, slope };
}

function determineWindow(dataset: DicomDataset): WindowParams | undefined {
  if (dataset.elements['x00281050'] && dataset.elements['x00281051']) {
    const level = dataset.floatString('x00281050');
    const width = dataset.floatString('x00281051');
    return { level, width };
  }
  return;
}

function determinePitch(dataset: DicomDataset): number | undefined {
  // [0018, 0088] Spacing between slices
  let pitch: number | undefined = undefined;
  if ('x00180088' in dataset.elements) {
    pitch = dataset.floatString('x00180088');
    if (!pitch) throw new Error('Slice pitch could not be determined');
  }
  return pitch;
}

function extractUncompressedPixels(
  dataset: DicomDataset,
  rows: number,
  columns: number,
  pixelFormat: PixelFormat
): ExtractPixelInfo {
  const offset = dataset.elements['x7fe00010'].dataOffset; // pixel data itself
  const len = dataset.elements['x7fe00010'].length;
  const pxInfo = pixelFormatInfo(pixelFormat);
  const bpp = pxInfo.bpp;
  if (len !== bpp * rows * columns) {
    throw new Error('Unexpected pixel data length.');
  }
  const buffer = new pxInfo.arrayClass(
    dataset.byteArray.buffer,
    offset,
    rows * columns
  );
  const pixelData = new ArrayBuffer(rows * columns * bpp);
  const resultArray = new pxInfo.arrayClass(pixelData);
  let minValue = pxInfo.maxLevel;
  let maxValue = pxInfo.minLevel;
  for (let i = 0; i < columns * rows; i++) {
    let val = buffer[i];
    resultArray[i] = val;
    if (val < minValue) minValue = val;
    if (val > maxValue) maxValue = val;
  }
  return { pixelData, minValue, maxValue };
}

function extractLosslessJpegPixels(
  dataset: DicomDataset,
  rows: number,
  columns: number,
  pixelFormat: PixelFormat
): ExtractPixelInfo {
  const decoder = new lj.lossless.Decoder();

  // fetch pixel data and decompress
  const pixelDataElement = dataset.elements['x7fe00010'];
  const frameData = parser.readEncapsulatedPixelData(
    dataset,
    pixelDataElement,
    0
  );

  const pxInfo = pixelFormatInfo(pixelFormat);
  const decompressed: ArrayBuffer = decoder.decompress(
    frameData.buffer,
    frameData.byteOffset,
    frameData.length
  );

  const resultArray = new pxInfo.arrayClass(decompressed);
  let minValue = pxInfo.maxLevel;
  let maxValue = pxInfo.minLevel;
  for (let i = 0; i < columns * rows; i++) {
    let val = resultArray[i];
    if (val < minValue) minValue = val;
    if (val > maxValue) maxValue = val;
  }

  return { pixelData: decompressed, minValue: 0, maxValue: 1000 };
}

function extractPixels(
  dataset: DicomDataset,
  transferSyntax: string,
  rows: number,
  columns: number,
  pixelFormat: PixelFormat
): ExtractPixelInfo {
  switch (transferSyntax) {
    case '1.2.840.10008.1.2': // Implicit VR Little Endian (default)
    case '1.2.840.10008.1.2.1': // Explicit VR Little Endian
      return extractUncompressedPixels(dataset, rows, columns, pixelFormat);
    case '1.2.840.10008.1.2.4.57': // JPEG Lossless, Nonhierarchical
    case '1.2.840.10008.1.2.4.70': // JPEG Lossless, Nonhierarchical
      return extractLosslessJpegPixels(dataset, rows, columns, pixelFormat);
    default:
      throw new Error('Unsupported transfer syntax. Maybe compressed?');
  }
}

/**
 * Assigns a correct `read` and `write` methods according to the
 * current pixel format.
 */
interface PixelAccessor {
  read: (pos: number) => number;
  write: (pos: number, value: number) => void;
  length: number;
}
function getPixelAccessor(
  data: ArrayBuffer,
  pixelFormat: PixelFormat
): PixelAccessor {
  const { arrayClass } = pixelFormatInfo(pixelFormat);

  const view = new arrayClass(data);

  if (pixelFormat !== PixelFormat.Binary) {
    return {
      read: pos => view[pos],
      write: (pos, value) => (view[pos] = value),
      length: view.length
    };
  } else {
    return {
      read: pos => (view[pos >> 3] >> (7 - pos % 8)) & 1,
      write: (pos, value) => {
        let cur = view[pos >> 3]; // pos => pos/8
        cur ^= (-value ^ cur) & (1 << (7 - pos % 8)); // set n-th bit to value
        view[pos >> 3] = cur;
      },
      length: view.length
    };
  }
}

export default dicomImageExtractor;
