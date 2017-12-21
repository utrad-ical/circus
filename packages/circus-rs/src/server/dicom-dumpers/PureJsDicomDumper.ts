import DicomDumper from './DicomDumper';
import DicomVolume from '../../common/DicomVolume';
import { PixelFormat } from '../../common/PixelFormat';

import { DicomInfo, DicomPixelExtractor } from './DicomPixelExtractor';
import {
  SeriesLoaderInfo,
  SeriesLoader
} from '../dicom-file-repository/DicomFileRepository';

/**
 * DICOM dumper implemented in pure JS.
 * It may be slow but works anywhere against most uncompressed DICOM files.
 */
export default class PureJsDicomDumper extends DicomDumper {
  protected async readSingleDicomImageFile(
    seriesLoader: SeriesLoader,
    image: number
  ): Promise<DicomInfo> {
    const buffer = await seriesLoader(image);
    const data = new Uint8Array(buffer);
    const parser = new DicomPixelExtractor();
    return parser.extract(data);
  }

  public async readDicom(
    seriesLoaderInfo: SeriesLoaderInfo
  ): Promise<DicomVolume> {
    let lastSliceLocation: number;
    let pitch: number | undefined = undefined;
    let seriesMinValue: number = Infinity;
    let seriesMaxValue: number = -Infinity;

    const { count, seriesLoader } = seriesLoaderInfo;

    // read first image
    let dicom = await this.readSingleDicomImageFile(seriesLoader, 1);
    const raw: DicomVolume = new DicomVolume(
      [dicom.columns, dicom.rows, count],
      dicom.pixelFormat
    );
    if ('x00180088' in dicom.dataset.elements) {
      // [0018, 0088] Spacing between slices
      pitch = dicom.dataset.floatString('x00180088');
      if (!pitch) {
        throw new Error('Slice pitch could not be determined');
      }
      raw.setVoxelSize([dicom.pixelSpacing[0], dicom.pixelSpacing[1], pitch]);
    }

    // set headers accordingly
    raw.appendHeader({
      modality: dicom.modality,
      rescaleSlope: dicom.rescale.slope,
      rescaleIntercept: dicom.rescale.intercept
    });
    raw.dicomWindow = dicom.window;
    raw.estimatedWindow = { width: 50, level: 75 };
    lastSliceLocation = dicom.sliceLocation;

    // read subsequent images
    for (let i = 1; i <= count; i++) {
      if (i !== 1) dicom = await this.readSingleDicomImageFile(seriesLoader, i);
      // logger.debug(`inserting ${i} with ${result.pixelData.byteLength} bytes of data`);
      if (i > 1 && pitch === undefined) {
        pitch = Math.abs(lastSliceLocation - dicom.sliceLocation);
        raw.setVoxelSize([dicom.pixelSpacing[0], dicom.pixelSpacing[1], pitch]);
      }
      seriesMinValue = Math.min(seriesMinValue, dicom.minValue);
      seriesMaxValue = Math.max(seriesMinValue, dicom.maxValue);
      lastSliceLocation = dicom.sliceLocation;
      raw.insertSingleImage(i - 1, dicom.pixelData);
    }

    if (pitch === undefined && count === 1) {
      pitch = 1;
      raw.setVoxelSize([dicom.pixelSpacing[0], dicom.pixelSpacing[1], pitch]);
    }

    if (raw.getHeader('modality') === 'CT') {
      const slope = raw.getHeader('rescaleSlope');
      const intercept = raw.getHeader('rescaleIntercept');
      // logger.debug(`Apply rescale: slope=${slope}, intercept=${intercept}`);
      raw.convert(PixelFormat.Int16, originalValue => {
        return originalValue * slope + intercept;
      });
      seriesMinValue = seriesMinValue * slope + intercept;
      seriesMaxValue = seriesMaxValue * slope + intercept;
    }

    // Specific to CIRCUS RS: Apply rescale only when the modality is CT
    const estimatedWidth = Math.floor(seriesMaxValue - seriesMinValue + 1);
    const estimatedLevel = Math.floor(seriesMinValue + estimatedWidth / 2);
    raw.estimatedWindow = { level: estimatedLevel, width: estimatedWidth };
    return raw;
  }
}
