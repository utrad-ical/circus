export enum PixelFormat {
	Unknown = -1,
	UInt8 = 0,
	Int8 = 1,
	UInt16 = 2,
	Int16 = 3,
	Binary = 4
}

export interface PixelFormatInfo {
	bpp: number;
	minLevel: number;
	maxLevel: number;
	minWidth: number;
	maxWidth: number;
}

export function pixelFormatInfo(type: PixelFormat): PixelFormatInfo {
	switch (type) {
		case PixelFormat.UInt8:
			return {bpp: 1, minWidth: 1, maxWidth: 256, minLevel: 0, maxLevel: 255};
		case PixelFormat.Int8:
			return {bpp: 1, minWidth: 1, maxWidth: 256, minLevel: -128, maxLevel: 127};
		case PixelFormat.UInt16:
			return {bpp: 2, minWidth: 1, maxWidth: 65536, minLevel: 0, maxLevel: 65535};
		case PixelFormat.Int16:
			return {bpp: 2, minWidth: 1, maxWidth: 65536, minLevel: -32768, maxLevel: 32767};
		case PixelFormat.Binary:
			return {bpp: 0.125, minWidth: 1, maxWidth: 1, minLevel: 0, maxLevel: 1};
		default:
			throw new Error('Undefined pixel format.');
	}
}
