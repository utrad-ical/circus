import PartialVolumeDescriptor from '@utrad-ical/circus-lib/src/PartialVolumeDescriptor';
import {
  PixelFormat,
  PixelFormatInfo,
  pixelFormatInfo
} from '@utrad-ical/circus-lib/src/PixelFormat';
import { Box, Section, Vector2D, Vector3D } from './geometry';
import { applyWindow } from './pixel';

// Make sure you don't add properties
// that heavily depends on DICOM spec!

/**
 * Raw voxel container with MPR support.
 */
export default class RawData {
  /**
   * Number of voxels.
   */
  protected size: Vector3D;

  /**
   * Pixel format.
   */
  protected pixelFormat: PixelFormat;

  /**
   * Bytes per voxel [byte/voxel]
   */
  protected bpp!: number;

  /**
   * Actual image data.
   */
  public data: ArrayBuffer;

  /**
   * The array view used with the array buffer (eg, Uint8Array)
   */
  protected view!: { [offset: number]: number };

  /**
   * Voxel reader function.
   */
  protected read!: (pos: number) => number;

  /**
   * Voxel writer function.
   */
  protected write!: (value: number, pos: number) => void;

  /**
   * Set the size of the volume and allocate an byte array.
   * @param size The number of voxels.
   * @param pixelFormat The pixel format.
   */
  constructor(size: Vector3D, pixelFormat: PixelFormat) {
    const [x, y, z] = size;
    if (x <= 0 || y <= 0 || z <= 0) {
      throw new RangeError('Invalid volume size.');
    }
    if (x * y * z > 1024 * 1024 * 1024) {
      throw new RangeError('Maximum voxel limit exceeded.');
    }
    this.size = [x, y, z];
    this.virtualZSize = z;
    this.pixelFormat = pixelFormat;
    const pxInfo = this.getPixelFormatInfo(this.pixelFormat);
    const [rx, ry, rz] = this.size;
    const dataSize = Math.ceil(rx * ry * rz * pxInfo.bpp);
    this.data = new ArrayBuffer(dataSize);
    this.setAccessor();
  }

  protected partialVolumeDescriptor?: PartialVolumeDescriptor;
  protected virtualZSize: number;

  public setPartialVolumeDescriptor(
    partialVolumeDescriptor: PartialVolumeDescriptor | undefined
  ): void {
    this.partialVolumeDescriptor = partialVolumeDescriptor;
    this.virtualZSize = partialVolumeDescriptor
      ? (partialVolumeDescriptor.end - partialVolumeDescriptor.start) /
        partialVolumeDescriptor.delta
      : this.size[2];
  }

  /**
   * Gets pixel value at the specified location. Each parameter must be an integer.
   * @param x x-coordinate
   * @param y y-coordinate
   * @param z z-coordinate
   * @return Corresponding voxel value.
   */
  public getPixelAt(x: number, y: number, z: number): number {
    if (this.partialVolumeDescriptor) {
      z =
        this.partialVolumeDescriptor.start +
        z * this.partialVolumeDescriptor.delta;
    }
    return this.read(x + (y + z * this.size[1]) * this.size[0]);
  }

  /**
   * Write pixel value at the specified location.
   * @param value Pixel value to write.
   * @param x x-coordinate
   * @param y y-coordinate
   * @param z z-coordinate
   */
  public writePixelAt(value: number, x: number, y: number, z: number): void {
    this.write(value, x + (y + z * this.size[1]) * this.size[0]);
  }

  /**
   * Get pixel value from nearest neighbor.
   * @param x x-coordinate (floating point)
   * @param y y-coordinate (floating point)
   * @param z z-coordinate (floating point)
   * @return n Nearest neighbor corresponding voxel value. Returns undefined if out of bounds.
   */
  public getPixelNearestNeighbor(
    x: number,
    y: number,
    z: number
  ): number | undefined {
    if (
      x < 0.0 ||
      y < 0.0 ||
      z < 0.0 ||
      x >= this.size[0] ||
      y >= this.size[1] ||
      z >= this.virtualZSize
    ) {
      return undefined;
    }
    return this.getPixelAt(Math.floor(x), Math.floor(y), Math.floor(z));
  }

  /**
   * Replace the internal data buffer.
   * @param buffer The data to replace. Must be exactly the same size of the existing buffer.
   */
  public assign(buffer: ArrayBuffer): void {
    if (!(buffer instanceof ArrayBuffer)) throw new TypeError('Not a buffer');
    if (buffer.byteLength !== this.dataSize)
      throw new TypeError('Inproper data size');
    this.data = buffer;
    this.setAccessor();
  }

  /**
   * Get pixel value from floating-point coordinate
   * using trilinear interpolation.
   * @param x x-coordinate (floating point)
   * @param y y-coordinate (floating point)
   * @param z z-coordinate (floating point)
   * @return n Interpolated corresponding voxel value. Returns undefined if out of bounds.
   */
  public getPixelWithInterpolation(
    x: number,
    y: number,
    z: number
  ): number | undefined {
    // NOTE: In the case of color image (rgba8), returns incorrect value.

    // Check values
    if (
      x < 0.0 ||
      y < 0.0 ||
      z < 0.0 ||
      x > this.size[0] ||
      y > this.size[1] ||
      z > this.virtualZSize
    ) {
      return undefined;
    }

    const px = x - 0.5;
    const py = y - 0.5;
    const pz = z - 0.5;

    let ix = Math.floor(px);
    let iy = Math.floor(py);
    let iz = Math.floor(pz);

    const fx = px - ix;
    const fy = py - iy;
    const fz = pz - iz;

    let dx = 1.0,
      dy = 1.0,
      dz = 1.0;

    if (ix < 0) {
      ix = 0;
      dx = 0;
    } else if (this.size[0] - 1 <= ix) {
      dx = 0;
    }

    if (iy < 0) {
      iy = 0;
      dy = 0;
    } else if (this.size[1] - 1 <= iy) {
      dy = 0;
    }

    if (iz < 0) {
      iz = 0;
      dz = 0;
    } else if (this.size[2] - 1 <= iz) {
      dz = 0;
    }

    // p0 p1
    // p2 p3
    const z1p0 = this.getPixelAt(ix, iy, iz);
    const z1p1 = this.getPixelAt(ix + dx, iy, iz);
    const z1p2 = this.getPixelAt(ix, iy + dy, iz);
    const z1p3 = this.getPixelAt(ix + dx, iy + dy, iz);

    const z1y1 = this.mix(z1p0, z1p1, fx);
    const z1y2 = this.mix(z1p2, z1p3, fx);
    const z1 = this.mix(z1y1, z1y2, fy);

    const z2p0 = this.getPixelAt(ix, iy, iz + dz);
    const z2p1 = this.getPixelAt(ix + dx, iy, iz + dz);
    const z2p2 = this.getPixelAt(ix, iy + dy, iz + dz);
    const z2p3 = this.getPixelAt(ix + dx, iy + dy, iz + dz);

    const z2y1 = this.mix(z2p0, z2p1, fx);
    const z2y2 = this.mix(z2p2, z2p3, fx);
    const z2 = this.mix(z2y1, z2y2, fy);

    return this.mix(z1, z2, fz);
  }

  private mix(v0: number, v1: number, a: number) {
    return v0 * (1 - a) + v1 * a;
  }

  /**
   * Appends and overwrites one slice.
   * Note that the input data must be in the machine's native byte order
   * (i.e., little endian in x64 CPUs).
   * @param z Z coordinate of the image inserted.
   * @param imageData The inserted image data using the machine's native byte order.
   */
  public insertSingleImage(z: number, imageData: ArrayBuffer): void {
    const [rx, ry, rz] = this.size;
    if (z < 0 || z >= rz) {
      throw new RangeError('z-index out of bounds');
    }

    const pixelsInSlice = rx * ry;
    const bytes = pixelsInSlice * this.bpp;
    if (bytes > imageData.byteLength) {
      throw new Error('Not enough buffer length');
    }

    if (this.pixelFormat !== 'binary' || pixelsInSlice % 8 === 0) {
      const byteLength = bytes; // len:byte of surface
      const byteOffset = byteLength * z;
      const src = new Uint8Array(imageData, 0, byteLength);
      const dst = new Uint8Array(this.data, byteOffset, byteLength);
      dst.set(src); // This overwrites the existing slice (if any)
    } else {
      const byteLength = Math.ceil(bytes);
      const byteOffset = Math.floor(bytes * z);
      const src = new Uint8Array(imageData, 0, byteLength);
      const dst = new Uint8Array(this.data, byteOffset, byteLength);
      const bitOffset1 = (pixelsInSlice * z) % 8;
      const bitOffset2 = 8 - bitOffset1;
      const bitOffset3 = 8 - ((pixelsInSlice * (z + 1)) % 8);
      const containsPrev = bitOffset1 > 0;
      const containsNext = bitOffset3 !== 8;
      for (let i = 0; i < dst.length; i++) {
        if (i === 0) {
          const prevData = containsPrev
            ? (dst[i] >> bitOffset2) << bitOffset2
            : 0;
          const newData = src[i] >> bitOffset1;
          dst[i] = prevData | newData;
        } else if (i < dst.length - 1) {
          const newData1 = src[i - 1] << bitOffset2;
          const newData2 = src[i] >> bitOffset1;
          dst[i] = newData1 | newData2;
        } else {
          const newData1 = src[i - 1] << bitOffset2;
          const newData2 = src[i] >> bitOffset1;
          const nextData = containsNext
            ? dst[i] ^ ((dst[i] >> bitOffset3) << bitOffset3)
            : 0;
          dst[i] = newData1 | newData2 | nextData;
        }
      }
    }
  }

  /**
   * Clear and overwrites one slice.
   * @param z Z coordinate of the image inserted.
   */
  public clearSingleImage(z: number): void {
    const [rx, ry, rz] = this.size;
    const pixelsInSlice = rx * ry;
    const bytes = pixelsInSlice * this.bpp;
    const byteLength =
      this.pixelFormat !== 'binary' || pixelsInSlice % 8 === 0
        ? bytes
        : Math.ceil(bytes);
    const src = new Uint8Array(byteLength);
    this.insertSingleImage(z, src.buffer);
  }

  /**
   * Gets single image at the given z-coordinate.
   * @param z z-coordinate
   * @return The image data
   */
  public getSingleImage(z: number): ArrayBuffer {
    const [rx, ry, rz] = this.size;
    if (z < 0 || z >= rz) {
      throw new RangeError('z-index out of bounds');
    }

    const pixelsInSlice = rx * ry;
    const bytes = pixelsInSlice * this.bpp;
    const byteLength = Math.ceil(bytes);
    const byteOffset = Math.floor(bytes * z);

    const getData = () => {
      const src = new Uint8Array(this.data, byteOffset, byteLength);
      const buffer = new ArrayBuffer(byteLength);
      new Uint8Array(buffer).set(src);
      return buffer;
    };

    if (this.pixelFormat !== 'binary' || pixelsInSlice % 8 === 0) {
      return getData();
    } else {
      const work = new Uint8Array(getData());
      const bitOffset1 = (pixelsInSlice * z) % 8;
      const bitOffset2 = 8 - bitOffset1;
      const bitOffset3 = 8 - ((pixelsInSlice * (z + 1)) % 8);
      const containsNext = bitOffset3 !== 8;
      const src = new Uint8Array(byteLength);
      for (let i = 0; i < work.length; i++) {
        if (i < work.length - 1) {
          src[i] = (work[i] << bitOffset1) | (work[i + 1] >> bitOffset2);
        } else if (!containsNext) {
          src[i] = work[i] << bitOffset1;
        } else {
          const nextData = work[i] ^ ((work[i] >> bitOffset3) << bitOffset3);
          src[i] = (work[i] ^ nextData) << bitOffset1;
        }
      }
      const buffer = new ArrayBuffer(byteLength);
      new Uint8Array(buffer).set(src);
      return buffer;
    }
  }

  /**
   * Assigns a correct `read` and `write` methods according to the
   * current pixel format.
   */
  protected setAccessor(): void {
    const pxInfo = this.getPixelFormatInfo(this.pixelFormat);
    this.bpp = pxInfo.bpp;
    this.view = new pxInfo.arrayClass(this.data);

    if (this.pixelFormat !== 'binary') {
      this.read = pos => this.view[pos];
      this.write = (value, pos) => (this.view[pos] = value);
    } else {
      this.read = pos => (this.view[pos >> 3] >> (7 - (pos % 8))) & 1;
      this.write = (value, pos) => {
        let cur = this.view[pos >> 3]; // pos => pos/8
        cur ^= (-value ^ cur) & (1 << (7 - (pos % 8))); // set n-th bit to value
        this.view[pos >> 3] = cur;
      };
    }
  }

  /**
   * Returns the voxel number of this volume along the three axes.
   * @return The size of this volume.
   */
  public getDimension(): Vector3D {
    return [this.size[0], this.size[1], this.size[2]];
  }

  /**
   * Returns the current pixel format.
   * @return The current pixel format.
   */
  public getPixelFormat(): PixelFormat {
    return this.pixelFormat;
  }

  /**
   * Returns the PixelFormatInfo object if no parameter is given.
   * Returns the corresponding PixelFormatInfo if type is set.
   * @param type The PixelFormat value.
   * @return The PixelFormatInfo object, which holds some
   *     helpful information about the pixel format.
   */
  public getPixelFormatInfo(type?: PixelFormat): PixelFormatInfo {
    if (typeof type === 'undefined') {
      type = this.pixelFormat;
    }
    return pixelFormatInfo(type);
  }

  /**
   * Calculates the volume data size in bytes.
   * @return The byte size of the volume.
   */
  public get dataSize(): number {
    return Math.ceil(this.size[0] * this.size[1] * this.size[2] * this.bpp);
  }

  /**
   * Converts this raw data to new pixel format, optionally using a filter.
   * @param targetFormat
   * @param mapper Optional function which is applied to map the voxel values.
   */
  public convert(
    targetFormat: PixelFormat,
    mapper: (input: number) => number
  ): void {
    // NOTE: In the case of color image (rgba8), returns incorrect value.
    const [rx, ry, rz] = this.size;
    const newRaw = new RawData(this.size, targetFormat);
    for (let z = 0; z < rz; z++) {
      for (let y = 0; y < ry; y++) {
        for (let x = 0; x < rx; x++) {
          const pos = x + (y + z * this.size[1]) * this.size[0];
          let value = this.read(pos);
          if (mapper) {
            value = mapper(value);
          }
          newRaw.write(value, pos);
        }
      }
    }
    this.pixelFormat = targetFormat;
    this.data = newRaw.data;
    this.setAccessor();
  }

  /**
   * Fills the entire volume with the specified value.
   * @param value The value to fill. Can be a function.
   */
  public fillAll(
    value: number | ((x: number, y: number, z: number) => number)
  ): void {
    this.fillCuboid(value, { origin: [0, 0, 0], size: this.size });
  }

  /**
   * Fills the specified cuboid region with the specified value.
   * @param value The value to fill. Can be a function.
   * @param box The bounding box in which the volume is filled.
   */
  public fillCuboid(
    value: number | ((x: number, y: number, z: number) => number),
    box: Box
  ): void {
    const [x, y, z] = box.origin;
    const xmax = x + box.size[0];
    const ymax = y + box.size[1];
    const zmax = z + box.size[2];
    if (typeof value === 'number') {
      for (let zz = z; zz < zmax; zz++) {
        for (let yy = y; yy < ymax; yy++) {
          for (let xx = x; xx < xmax; xx++) {
            this.writePixelAt(value, xx, yy, zz);
          }
        }
      }
    } else {
      for (let zz = z; zz < zmax; zz++) {
        for (let yy = y; yy < ymax; yy++) {
          for (let xx = x; xx < xmax; xx++) {
            this.writePixelAt(value(xx, yy, zz), xx, yy, zz);
          }
        }
      }
    }
  }

  /**
   * Copies the voxel data from another RawData instance.
   * @param src The source RawData.
   * @param srcBox The source bounding box.
   *     If unspecified, copies whole volume.
   * @param destOffset The point of this instance where
   *     the source is started to be copied.
   *     If unspecified, origin (0, 0, 0) is used.
   * @param valueFunc Optional function to filter the source voxel value.
   */
  public copy(
    src: RawData,
    srcBox?: Box,
    offset?: Vector3D,
    valueFunc?: (srcValue: number, destValue: number) => number
  ): void {
    if (src === this) throw new TypeError('Cannot copy from self');
    if (!srcBox) srcBox = { origin: [0, 0, 0], size: src.getDimension() };

    const [ox, oy, oz] = srcBox.origin;
    if (!offset) offset = [0, 0, 0];
    const dim = this.getDimension();

    const xmin = Math.max(0, -offset[0]);
    const xmax = Math.min(dim[0] - offset[0], srcBox.size[0]);
    const ymin = Math.max(0, -offset[1]);
    const ymax = Math.min(dim[1] - offset[1], srcBox.size[1]);
    const zmin = Math.max(0, -offset[2]);
    const zmax = Math.min(dim[2] - offset[2], srcBox.size[2]);

    for (let z = zmin; z < zmax; z++) {
      for (let y = ymin; y < ymax; y++) {
        for (let x = xmin; x < xmax; x++) {
          // TODO: Optimize if src and this share the same pixel format
          const val = valueFunc
            ? valueFunc(
                src.getPixelAt(ox + x, oy + y, oz + z),
                this.getPixelAt(offset[0] + x, offset[1] + y, offset[2] + z)
              )
            : src.getPixelAt(ox + x, oy + y, oz + z);
          this.writePixelAt(val, offset[0] + x, offset[1] + y, offset[2] + z);
        }
      }
    }
  }

  /**
   * Changes the size of this volume by transforming the bounding box.
   * Used to shrink or expand the existing volume.
   * Added region will be filled with zero, and
   * value data not in the newBox will be lost.
   * @param newBox New bounding box
   * @param orig The origin of the current bounding box. Defaults to [0, 0, 0].
   */
  public transformBoundingBox(newBox: Box, origin: Vector3D = [0, 0, 0]): void {
    const newVol = new RawData(newBox.size, this.pixelFormat);
    const srcBox: Box = { origin: [0, 0, 0], size: this.size };
    const offset: Vector3D = [
      origin[0] - newBox.origin[0],
      origin[1] - newBox.origin[1],
      origin[2] - newBox.origin[2]
    ];
    newVol.copy(this, srcBox, offset);

    // Replace the internal voxel data of this insntance
    this.size = [newBox.size[0], newBox.size[1], newBox.size[2]];
    this.data = newVol.data;
    this.setAccessor();
  }

  /**
   * Builds a new MPR image using the given section in index-coordinate.
   */
  public scanObliqueSection(
    section: Section,
    outSize: Vector2D,
    outImage: { [index: number]: number },
    interpolation: boolean = false,
    windowWidth?: number,
    windowLevel?: number
  ): void {
    // NOTE: In the case of 2D image, returns incorrect value.
    const xAxis = section.xAxis;
    const eu: Vector3D = [
      xAxis[0] / outSize[0],
      xAxis[1] / outSize[0],
      xAxis[2] / outSize[0]
    ];
    const yAxis = section.yAxis;
    const ev: Vector3D = [
      yAxis[0] / outSize[1],
      yAxis[1] / outSize[1],
      yAxis[2] / outSize[1]
    ];
    this.scanOblique(
      section.origin as Vector3D,
      eu,
      ev,
      outSize,
      outImage,
      interpolation,
      windowWidth,
      windowLevel
    );
  }

  /**
   * Scans over the volume and make an oblique image,
   * starting from origin and along with the plane defined by eu/ev.
   * The result is written to `image`.
   * If windowWidth/Level is given, output image will be an Uint8Array.
   * Otherwise, the output image must have the same pixel format as the
   * source volume data.
   * @param origin The origin point that corresponds to the top-left corner of the output image.
   * @param eu The scan vector which represents the horizontal one-pixel length of the output image.
   * @param ev The scan vector which represents the vertical one-pixel length of the output image.
   * @param outSize Output image size.
   * @param outImage The output typed array.
   * @param interpolation Whether to perform trilinear interpolation.
   * @param windowWidth The window width.
   * @param windowLevel The window height.
   */
  public scanOblique(
    origin: Vector3D,
    eu: Vector3D,
    ev: Vector3D,
    outSize: Vector2D,
    outImage: { [index: number]: number },
    interpolation: boolean = false,
    windowWidth?: number,
    windowLevel?: number
  ): void {
    const [eu_x, eu_y, eu_z] = eu;
    const [ev_x, ev_y, ev_z] = ev;
    const [outWidth, outHeight] = outSize;

    let [x, y, z] = origin;
    let imageOffset = 0;
    let value: number | undefined;

    const useWindow =
      typeof windowWidth === 'number' && typeof windowLevel === 'number';
    const voxelReader = interpolation
      ? this.getPixelWithInterpolation
      : this.getPixelNearestNeighbor;

    for (let j = 0; j < outHeight; j++) {
      let [pos_x, pos_y, pos_z] = [x, y, z];

      for (let i = 0; i < outWidth; i++) {
        value = voxelReader.call(this, pos_x, pos_y, pos_z); // may return `undefined`
        if (value !== undefined && useWindow) {
          value = applyWindow(windowWidth!, windowLevel!, value);
        }

        // A value of `undefined` will be silently converted
        // to zero according to the TypedArray spec.
        // But Math.round is important.
        outImage[imageOffset++] = Math.round(value!);

        pos_x += eu_x;
        pos_y += eu_y;
        pos_z += eu_z;
      }
      x += ev_x;
      y += ev_y;
      z += ev_z;
    }
  }
}
