const formats = {
  unknown: -1,
  uint8: 0,
  int8: 1,
  uint16: 2,
  int16: 3,
  binary: 4
} as const;

export type PixelFormat = keyof typeof formats;

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
    case 'uint8':
      return {
        bpp: 1,
        minWidth: 1,
        maxWidth: 256,
        minLevel: 0,
        maxLevel: 255,
        arrayClass: Uint8Array
      };
    case 'int8':
      return {
        bpp: 1,
        minWidth: 1,
        maxWidth: 256,
        minLevel: -128,
        maxLevel: 127,
        arrayClass: Int8Array
      };
    case 'uint16':
      return {
        bpp: 2,
        minWidth: 1,
        maxWidth: 65536,
        minLevel: 0,
        maxLevel: 65535,
        arrayClass: Uint16Array
      };
    case 'int16':
      return {
        bpp: 2,
        minWidth: 1,
        maxWidth: 65536,
        minLevel: -32768,
        maxLevel: 32767,
        arrayClass: Int16Array
      };
    case 'binary':
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
