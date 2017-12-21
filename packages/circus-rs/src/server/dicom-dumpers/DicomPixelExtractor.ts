import { PixelFormat, pixelFormatInfo } from '../../common/PixelFormat';

import * as lj from 'jpeg-lossless-decoder-js';
import * as parser from 'dicom-parser';

interface RescaleParams {
  slope: number;
  intercept: number;
}
interface WindowParams {
  level: number;
  width: number;
}

export interface DicomInfo {
  modality: string;
  columns: number;
  rows: number;
  pixelSpacing: [number, number];
  pixelFormat: PixelFormat;
  rescale: RescaleParams;
  window: WindowParams | null;
  sliceLocation: number;
  minValue: number;
  maxValue: number;
  dataset: DicomDataset;
  pixelData: ArrayBuffer;
}

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

/**
 * DICOM parser and pixel data extractor.
 * This class works synchronouslly.
 *
 * Some lines of codes are taken from chafey/cornerstoneWADOImageLoader.
 * https://github.com/chafey/cornerstoneWADOImageLoader
 * Copyright 2015 Chris Hafey chafey@gmail.com
 */
export class DicomPixelExtractor {
  private determinePixelFormat(dataset: DicomDataset): PixelFormat {
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

  private determineRescale(dataset: DicomDataset): RescaleParams {
    let [intercept, slope] = [0.0, 1.0];
    if (dataset.elements['x00281052'] && dataset.elements['x00281053']) {
      intercept = dataset.floatString('x00281052');
      slope = dataset.floatString('x00281053');
    }
    return { intercept, slope };
  }

  protected determineWindow(dataset: DicomDataset): WindowParams | null {
    if (dataset.elements['x00281050'] && dataset.elements['x00281051']) {
      const level = dataset.floatString('x00281050');
      const width = dataset.floatString('x00281051');
      return { level, width };
    }
    return null;
  }

  protected extractUncompressedPixels(
    dataset: DicomDataset,
    transferSyntax: string,
    rows: number,
    columns: number,
    pixelFormat: PixelFormat
  ): { buffer: ArrayBuffer; minValue: number; maxValue: number } {
    const offset = dataset.elements['x7fe00010'].dataOffset; // pixel data itself
    const len = dataset.elements['x7fe00010'].length;
    const pxInfo = pixelFormatInfo(pixelFormat);
    const bpp = pxInfo.bpp;
    if (len !== bpp * rows * columns) {
      throw new Error('Unexpected pixel data length.');
    }
    const pixelData = new pxInfo.arrayClass(
      dataset.byteArray.buffer,
      offset,
      rows * columns
    );
    const buffer = new ArrayBuffer(rows * columns * bpp);
    const resultArray = new pxInfo.arrayClass(buffer);
    let minValue = pxInfo.maxLevel;
    let maxValue = pxInfo.minLevel;
    for (let i = 0; i < columns * rows; i++) {
      let val = pixelData[i];
      resultArray[i] = val;
      if (val < minValue) minValue = val;
      if (val > maxValue) maxValue = val;
    }
    return { buffer, minValue, maxValue };
  }

  protected extractLosslessJpegPixels(
    dataset: DicomDataset,
    transferSyntax: string,
    rows: number,
    columns: number,
    pixelFormat: PixelFormat
  ): { buffer: ArrayBuffer; minValue: number; maxValue: number } {
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

    return { buffer: decompressed, minValue: 0, maxValue: 1000 };
  }

  protected extractPixels(
    dataset: DicomDataset,
    transferSyntax: string,
    rows: number,
    columns: number,
    pixelFormat: PixelFormat
  ): { buffer: ArrayBuffer; minValue: number; maxValue: number } {
    switch (transferSyntax) {
      case '1.2.840.10008.1.2': // Implicit VR Little Endian (default)
      case '1.2.840.10008.1.2.1': // Explicit VR Little Endian
        return this.extractUncompressedPixels(
          dataset,
          transferSyntax,
          rows,
          columns,
          pixelFormat
        );
      case '1.2.840.10008.1.2.4.57': // JPEG Lossless, Nonhierarchical
      case '1.2.840.10008.1.2.4.70': // JPEG Lossless, Nonhierarchical
        return this.extractLosslessJpegPixels(
          dataset,
          transferSyntax,
          rows,
          columns,
          pixelFormat
        );
      default:
        throw new Error('Unsupported transfer syntax. Maybe compressed?');
    }
  }

  /**
   * Extracts the pixel data from a DICOM file.
   */
  public extract(dicomFileData: Uint8Array, frame: number = 1): DicomInfo {
    if (frame !== 1)
      throw new Error('Multiframe images are not supported yet.');
    const dataset: DicomDataset = parser.parseDicom(dicomFileData);
    const transferSyntax = dataset.string('x00020010');

    const modality = dataset.string('x00080060'); // modality

    // Get relevant DICOM element data (in group 0028)
    const columns = dataset.uint16('x00280011'); // columns
    const rows = dataset.uint16('x00280010'); // rows
    const pixelSpacing = <[number, number]>dataset
      .string('x00280030')
      .split('\\')
      .map(x => parseFloat(x));
    const rescale = this.determineRescale(dataset);
    const pixelFormat = this.determinePixelFormat(dataset);

    if (pixelFormat === PixelFormat.Unknown) {
      throw new RangeError('Unsupported pixel format detected.');
    }

    const window = this.determineWindow(dataset);
    const sliceLocation = dataset.floatString('x00201041');

    // PhotometricInterpretation == 'MONOCHROME1' means
    // large pixel value means blacker instead of whiter
    const photometricInterpretation = dataset.string('x00280004');
    if (!/^MONOCHROME/.test(photometricInterpretation)) {
      throw new Error('Non-monochrome images are not supported yet.');
    }
    // let invert = (photometricInterpretation === 'MONOCHROME1');

    const { buffer, minValue, maxValue } = this.extractPixels(
      dataset,
      transferSyntax,
      rows,
      columns,
      pixelFormat
    );

    return {
      modality,
      columns,
      rows,
      pixelSpacing,
      minValue,
      maxValue,
      rescale,
      window,
      sliceLocation,
      pixelFormat,
      dataset,
      pixelData: buffer
    };
  }
}
