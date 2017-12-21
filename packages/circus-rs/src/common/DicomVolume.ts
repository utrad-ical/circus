import AnisotropicRawData from './AnisotropicRawData';
import { MultiRange } from 'multi-integer-range';
import { ViewWindow } from './ViewWindow';

export default class DicomVolume extends AnisotropicRawData {
  /**
   * Estimated window, calculated from the actual voxel data
   */
  public estimatedWindow: ViewWindow | null;

  /**
   * Default window, described in DICOM file
   */
  public dicomWindow: ViewWindow | null;

  /**
   * Holds which images are already loaded in this volume.
   * When complete, this.loadedSlices.length() will be the same as this.size[2].
   */
  protected loadedSlices: MultiRange = new MultiRange();

  /**
   * Holds misc DICOM header data.
   */
  protected header: { [key: string]: any } = {};

  public appendHeader(header: { [key: string]: any }): void {
    for (var key in header) {
      this.header[key] = header[key];
    }
  }

  public getHeader(key: string): any {
    return this.header[key];
  }

  /**
   * Append z to loadedSlices:MultiRange.
   * @param z z-coordinate
   */
  public markSliceAsLoaded(z: number): void {
    if (z < 0 || z >= this.size[2]) {
      throw new RangeError('z-index out of bounds');
    }
    this.loadedSlices.append(z);
  }

  /**
   * Appends and overwrites one slice.
   * Note that the input data must be in the machine's native byte order
   * (i.e., little endian in x64 CPUs).
   * @param z Z coordinate of the image inserted.
   * @param imageData The inserted image data using the machine's native byte order.
   */
  public insertSingleImage(z: number, imageData: ArrayBuffer): void {
    super.insertSingleImage(z, imageData);
    this.loadedSlices.append(z);
  }
}
