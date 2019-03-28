export enum PixelFormat {
  Unknown = -1,
  UInt8 = 0,
  Int8 = 1,
  UInt16 = 2,
  Int16 = 3,
  Binary = 4
}

export interface PixelFormatInfo {
  /**
   * Bytes per second.
   */
  bpp: number;
  minLevel: number;
  maxLevel: number;
  minWidth: number;
  maxWidth: number;
  // This works because other typed arrays have compatible interface
  arrayClass: any;
}

export function pixelFormatInfo(type: PixelFormat): PixelFormatInfo {
  switch (type) {
    case PixelFormat.UInt8:
      return {
        bpp: 1,
        minWidth: 1,
        maxWidth: 256,
        minLevel: 0,
        maxLevel: 255,
        arrayClass: Uint8Array
      };
    case PixelFormat.Int8:
      return {
        bpp: 1,
        minWidth: 1,
        maxWidth: 256,
        minLevel: -128,
        maxLevel: 127,
        arrayClass: Int8Array
      };
    case PixelFormat.UInt16:
      return {
        bpp: 2,
        minWidth: 1,
        maxWidth: 65536,
        minLevel: 0,
        maxLevel: 65535,
        arrayClass: Uint16Array
      };
    case PixelFormat.Int16:
      return {
        bpp: 2,
        minWidth: 1,
        maxWidth: 65536,
        minLevel: -32768,
        maxLevel: 32767,
        arrayClass: Int16Array
      };
    case PixelFormat.Binary:
      return {
        bpp: 0.125,
        minWidth: 1,
        maxWidth: 1,
        minLevel: 0,
        maxLevel: 1,
        arrayClass: Uint8Array
      };
    default:
      throw new Error('Undefined pixel format.');
  }
}
