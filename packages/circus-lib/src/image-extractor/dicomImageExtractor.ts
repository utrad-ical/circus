import { PixelFormat, pixelFormatInfo } from '../PixelFormat';

import lj from 'jpeg-lossless-decoder-js';
import parser, { DataSet } from 'dicom-parser';
import { convertComplement } from './complementUtil';
import { invertPixelValue } from './invertPixelValue';

interface RescaleParams {
  slope: number;
  intercept: number;
}

interface ImageTypeParams {
  pixelDataCharacteristics: string;
  patientExaminationCharacteristics: string;
}

interface WindowParams {
  level: number;
  width: number;
}

type ExtractOptions = {
  skipExtractPixels?: boolean;
  frame?: number;
};

type ExtractPixelInfo = {
  pixelData: ArrayBuffer;
  minValue: number;
  maxValue: number;
};

export type DicomImageData = {
  metadata: DicomMetadata;
  pixelData?: ArrayBuffer; // parsed;
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
  sliceLocation?: number;
  minValue?: number;
  maxValue?: number;
  imageOrientationPatient?: string;
  pixelDataCharacteristics?: string;
  samplesPerPixel?: number;
};

export type DicomImageExtractor = (buffer: ArrayBuffer) => DicomImageData;

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
const dicomImageExtractor: (options?: ExtractOptions) => DicomImageExtractor = (
  options = {}
) => {
  const { frame = 1, skipExtractPixels = false } = options;
  if (frame !== 1) throw new Error('Multiframe images are not supported yet.');

  return dicomFileBuffer => {
    const dataset = parser.parseDicom(new Uint8Array(dicomFileBuffer));

    const transferSyntax = dataset.string('x00020010')!;
    const modality = dataset.string('x00080060')!;

    const pitch = determinePitch(dataset);

    // Get relevant DICOM element data (in group 0028)
    const columns = dataset.uint16('x00280011')!; // columns
    const rows = dataset.uint16('x00280010')!; // rows
    const pixelSpacingRaw = dataset.string('x00280030');
    const pixelSpacing = (
      pixelSpacingRaw
        ? pixelSpacingRaw.split('\\').map(x => parseFloat(x))
        : [1, 1]
    ) as [number, number];
    const rescale = determineRescale(dataset);
    const pixelFormat = determinePixelFormat(dataset);

    if (pixelFormat === 'unknown')
      throw new RangeError('Unsupported pixel format detected.');

    const window = determineWindow(dataset);
    const sliceLocation = dataset.floatString('x00201041');

    const imageOrientationPatient = dataset.string('x00200037');

    const imageType = determineImageType(dataset);
    const pixelDataCharacteristics = imageType
      ? imageType.pixelDataCharacteristics
      : undefined;

    const samplesPerPixel = dataset.uint16('x00280002');

    const metadata: DicomMetadata = {
      modality,
      columns,
      rows,
      pitch,
      pixelSpacing,
      pixelFormat,
      rescale,
      window,
      sliceLocation,
      imageOrientationPatient,
      pixelDataCharacteristics,
      samplesPerPixel
    };

    const bitsStored = dataset.uint16('x00280101')!; // Bits Stored
    const highBit = dataset.uint16('x00280102')!; // High Bit

    if (!skipExtractPixels) {
      let { minValue, maxValue, pixelData } = extractPixels(
        dataset,
        transferSyntax,
        rows,
        columns,
        pixelFormat,
        bitsStored,
        highBit,
        samplesPerPixel
      );

      if (modality === 'CT') {
        const { slope, intercept } = rescale;
        minValue = minValue * slope + intercept;
        maxValue = maxValue * slope + intercept;
        const { read, length } = getPixelAccessor(pixelData, pixelFormat);
        const convertedPixelData = new ArrayBuffer(pixelData.byteLength);
        const { write } = getPixelAccessor(convertedPixelData, 'int16');

        for (let i = 0; i < length; i++) {
          write(i, read(i) * slope + intercept);
        }
        metadata.pixelFormat = 'int16';
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

function determinePixelFormat(dataset: DataSet): PixelFormat {
  // NOTE: About PhotometricInterpretation
  // PhotometricInterpretation will probably be set to 'MONOCHROME1', 'MONOCHROME2', 'RGB', or 'PALETTE COLOR'.
  // PhotometricInterpretation == 'MONOCHROME1' means large pixel value means blacker instead of whiter
  const photometricInterpretation = dataset.string('x00280004') || '';

  const determineMonochromePixelFormat = () => {
    const bitsAllocated = dataset.uint16('x00280100');
    const pixelRepresentation = dataset.uint16('x00280103');
    if (pixelRepresentation === 0 && bitsAllocated === 8) {
      return 'uint8';
    } else if (pixelRepresentation === 1 && bitsAllocated === 8) {
      return 'int8'; // This should be rare
    } else if (pixelRepresentation === 0 && bitsAllocated === 16) {
      return 'uint16'; // unsigned 16 bit
    } else if (pixelRepresentation === 1 && bitsAllocated === 16) {
      return 'int16'; // signed 16 bit data
    } else {
      return 'unknown';
    }
  };

  switch (photometricInterpretation) {
    case 'MONOCHROME1':
    case 'MONOCHROME2':
      return determineMonochromePixelFormat();
    case 'RGB':
      return 'rgba8';
    default:
      return 'unknown';
  }
}

function determineRescale(dataset: DataSet): RescaleParams {
  let [intercept, slope] = [0.0, 1.0];
  if (dataset.elements['x00281052'] && dataset.elements['x00281053']) {
    intercept = dataset.floatString('x00281052')!;
    slope = dataset.floatString('x00281053')!;
  }
  return { intercept, slope };
}

function determineWindow(dataset: DataSet): WindowParams | undefined {
  if (dataset.elements['x00281050'] && dataset.elements['x00281051']) {
    const level = dataset.floatString('x00281050')!;
    const width = dataset.floatString('x00281051')!;
    return { level, width };
  }
  return;
}

function determinePitch(dataset: DataSet): number | undefined {
  // [0018, 0088] Spacing between slices
  let pitch: number | undefined = undefined;
  if ('x00180088' in dataset.elements) {
    // This value can be negative (respresents the direction of stacking)!
    pitch = dataset.floatString('x00180088');
    if (!pitch) throw new Error('Slice pitch could not be determined');
  }
  return pitch;
}

function determineImageType(dataset: DataSet): ImageTypeParams | undefined {
  if (dataset.elements['x00080008']) {
    const imageType = dataset
      .string('x00080008')!
      .split('\\')
      .map(x => x);
    const pixelDataCharacteristics = imageType[0];
    const patientExaminationCharacteristics = imageType[1];
    return { pixelDataCharacteristics, patientExaminationCharacteristics };
  }
  return;
}

function isRgb(pixelFormat: PixelFormat, samplesPerPixel: number) {
  return pixelFormat === 'rgba8' && samplesPerPixel === 3;
}

function extractUncompressedRGBPixels(
  dataset: DataSet,
  rows: number,
  columns: number,
  pixelFormat: PixelFormat,
  samplesPerPixel: number
): ExtractPixelInfo {
  const bppOfRGB = 3;
  const bppOfRGBA = 4;
  const pxInfo = pixelFormatInfo(pixelFormat);
  const offset = dataset.elements['x7fe00010'].dataOffset; // pixel data itself
  const len = dataset.elements['x7fe00010'].length;
  if (bppOfRGB != samplesPerPixel) {
    throw new Error('Unexpected samples per pixel.');
  }
  if (len !== bppOfRGB * rows * columns) {
    throw new Error('Unexpected pixel data length.');
  }

  // Convert RGB to RGBA8
  const srcArray = new Uint8Array(dataset.byteArray.buffer, offset, len);
  const destArray = new Uint8Array(rows * columns * bppOfRGBA);
  for (let i = 0, j = 0; i < len; ) {
    destArray[j++] = srcArray[i++]; // red
    destArray[j++] = srcArray[i++]; // green
    destArray[j++] = srcArray[i++]; // blue
    destArray[j++] = 0xff; // alpha
  }

  return {
    pixelData: destArray.buffer,
    minValue: pxInfo.maxLevel,
    maxValue: pxInfo.minLevel
  };
}

function extractUncompressedPixels(
  dataset: DataSet,
  rows: number,
  columns: number,
  pixelFormat: PixelFormat,
  bitsStored: number,
  highBit: number
): ExtractPixelInfo {
  const offset = dataset.elements['x7fe00010'].dataOffset; // pixel data itself
  const len = dataset.elements['x7fe00010'].length;
  const pxInfo = pixelFormatInfo(pixelFormat);
  const bpp = pxInfo.bpp;
  if (len !== bpp * rows * columns) {
    throw new Error('Unexpected pixel data length.');
  }

  const readType = pxInfo.bpp === 2 ? Uint16Array : Uint8Array;
  const buffer = new readType(dataset.byteArray.buffer, offset, rows * columns);
  const pixelData = new ArrayBuffer(rows * columns * bpp);
  const resultArray = new pxInfo.arrayClass(pixelData);

  let minValue = pxInfo.maxLevel;
  let maxValue = pxInfo.minLevel;
  const pixelRepresentation = dataset.uint16('x00280103') || 0; // 0 = unsigned
  const photometricInterpretation = dataset.string('x00280004');
  const isMonochrome1 = photometricInterpretation === 'MONOCHROME1';
  for (let i = 0; i < columns * rows; i++) {
    const rawVal = buffer[i];
    let val =
      pixelRepresentation === 0
        ? rawVal
        : convertComplement(rawVal, bitsStored, highBit);
    if (isMonochrome1)
      val = invertPixelValue(val, bitsStored, pixelRepresentation);
    resultArray[i] = val;
    if (val < minValue) minValue = val;
    if (val > maxValue) maxValue = val;
  }
  return { pixelData, minValue, maxValue };
}

function extractLosslessJpegPixels(
  dataset: DataSet,
  rows: number,
  columns: number,
  pixelFormat: PixelFormat,
  bitsStored: number,
  highBit: number
): ExtractPixelInfo {
  const decoder = new lj.lossless.Decoder();

  // fetch pixel data and decompress
  const pixelDataElement = dataset.elements['x7fe00010'];
  const frameData = parser.readEncapsulatedPixelDataFromFragments(
    dataset,
    pixelDataElement,
    0,
    pixelDataElement.fragments!.length
  );

  const pxInfo = pixelFormatInfo(pixelFormat);
  const decompressed: ArrayBuffer = decoder.decompress(
    // https://github.com/cornerstonejs/dicomParser/issues/159
    (frameData as any).buffer,
    (frameData as any).byteOffset,
    frameData.length
  );

  const resultArray = new pxInfo.arrayClass(decompressed);
  let minValue = pxInfo.maxLevel;
  let maxValue = pxInfo.minLevel;
  for (let i = 0; i < columns * rows; i++) {
    const val = resultArray[i];
    if (val < minValue) minValue = val;
    if (val > maxValue) maxValue = val;
  }

  return { pixelData: decompressed, minValue: 0, maxValue: 1000 };
}

function extractPixels(
  dataset: DataSet,
  transferSyntax: string,
  rows: number,
  columns: number,
  pixelFormat: PixelFormat,
  bitsStored: number,
  highBit: number,
  samplesPerPixel: number
): ExtractPixelInfo {
  switch (transferSyntax) {
    case '1.2.840.10008.1.2': // Implicit VR Little Endian (default)
    case '1.2.840.10008.1.2.1': // Explicit VR Little Endian
      return isRgb(pixelFormat, samplesPerPixel)
        ? extractUncompressedRGBPixels(
            dataset,
            rows,
            columns,
            pixelFormat,
            samplesPerPixel
          )
        : extractUncompressedPixels(
            dataset,
            rows,
            columns,
            pixelFormat,
            bitsStored,
            highBit
          );
    case '1.2.840.10008.1.2.4.57': // JPEG Lossless, Nonhierarchical
    case '1.2.840.10008.1.2.4.70': // JPEG Lossless, Nonhierarchical
      return extractLosslessJpegPixels(
        dataset,
        rows,
        columns,
        pixelFormat,
        bitsStored,
        highBit
      );
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

  if (pixelFormat !== 'binary') {
    return {
      read: pos => view[pos],
      write: (pos, value) => (view[pos] = value),
      length: view.length
    };
  } else {
    return {
      read: pos => (view[pos >> 3] >> (7 - (pos % 8))) & 1,
      write: (pos, value) => {
        let cur = view[pos >> 3]; // pos => pos/8
        cur ^= (-value ^ cur) & (1 << (7 - (pos % 8))); // set n-th bit to value
        view[pos >> 3] = cur;
      },
      length: view.length
    };
  }
}

export default dicomImageExtractor;
