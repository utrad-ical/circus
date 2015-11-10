// Raw voxel container class

import { MultiRange } from 'multi-integer-range';

import * as Promise from 'bluebird';

export enum PixelFormat {
	Unknown = -1,
	UInt8 = 0,
	Int8 = 1,
	UInt16 = 2,
	Int16 = 3,
	Binary = 4
}

export type Vector3D = [number, number, number];

export type Vector2D = [number, number];

interface MprResult {
	image: Uint8Array;
	outWidth:  number;
	outHeight: number;
}

interface ObliqueResult extends MprResult {
	pixelSize: number;
	centerX: number;
	centerY: number;
}

interface PixelFormatInfo {
	bpp: number;
	minLevel: number;
	maxLevel: number;
	minWidth: number;
	maxWidth: number;
}

// Make sure you don't add properties
// that heavily depends on DICOM spec!

/**
 * Raw voxel container with MPR support.
 */
export default class RawData {
	/**
	 * Number of voxels.
	 */
	protected size: Vector3D = null;

	/**
	 * Pixel format.
	 */
	protected pixelFormat: PixelFormat = PixelFormat.Unknown;

	/**
	 * Voxel size [mm]
	 */
	protected voxelSize: Vector3D = null;

	/**
	 * Byte per voxel [byte/voxel]
	 */
	protected bpp: number = 1;

	/**
	 * Actual image data.
	 */
	protected data: ArrayBuffer;

	/**
	 * The array view used with the array buffer (eg, Uint8Array)
	 */
	protected view: {[offset: number]: number};

	/**
	 * Voxel read function
	 */
	protected read: (pos: number) => number;

	/**
	 * Voxel write function
	 */
	protected write: (value: number, pos: number) => void;

	/**
	 * Holds which images are already loaded in this volume.
	 * When complete, this.loadedSlices.length() will be the same as this.z.
	 */
	protected loadedSlices: MultiRange = new MultiRange();

	/**
	 * Get pixel value. Each parameter must be an integer.
	 * @param x integer x-coordinate
	 * @param y integer y-coordinate
	 * @param z integer z-coordinate
	 * @returns Corresponding voxel value.
	 */
	public getPixelAt(x: number, y: number, z: number): number {
		return this.read(x + (y + z * this.size[1]) * this.size[0]);
	}

	/**
	 * Write pixel value at the specified location.
	 * @param value Pixel value to write.
	 * @param x integer x-coordinate
	 * @param y integer y-coordinate
	 * @param z integer z-coordinate
	 */
	public writePixelAt(value: number, x: number, y: number, z: number): void {
		this.write(value, x + (y + z * this.size[1]) * this.size[0]);
	}

	public markSliceAsLoaded(z: number): void {
		if (z < 0 || z >= this.size[2]) {
			throw new RangeError('z-index out of bounds');
		}
		this.loadedSlices.append(z);
	}

	/**
	 * Get pixel value using bilinear interpolation.
	 * @param x floating point x-coordinate
	 * @param y floating point y-coordinate
	 * @param z floating point z-coordinate
	 * @returns Corresponding voxel value.
	 */
	public getPixelWithInterpolation(x: number, y: number, z: number): number {
		let x_end = this.size[0] - 1;
		let y_end = this.size[1] - 1;
		let z_end = this.size[2] - 1;
		if (x < 0.0 || y < 0.0 || z < 0.0 || x > x_end || y > y_end || z > z_end) {
			return 0;
		}

		let iz = Math.floor(z);
		if (iz >= z_end) {
			iz = z_end - 1;
			z = z_end;
		}
		let ix = Math.floor(x);
		if (ix >= x_end) {
			ix = x_end - 1;
			x = x_end;
		}
		let iy = Math.floor(y);
		if (iy >= y_end) {
			iy = y_end - 1;
			y = y_end;
		}

		let value_z1 = this.getAxialInterpolation(ix, x, iy, y, iz);
		let value_z2 = this.getAxialInterpolation(ix, x, iy, y, iz + 1);
		let weight_z2 = z - iz;
		let weight_z1 = 1.0 - weight_z2;
		return value_z1 * weight_z1 + value_z2 * weight_z2;
	}

	protected getAxialInterpolation(ix: number, x: number, iy: number, y: number, intz: number): number {
		let ixp1 = ix + 1;
		let iyp1 = iy + 1;

		// p0 p1
		// p2 p3
		let rx = this.size[0];
		let offset = rx * this.size[1] * intz;
		let p0 = this.read(offset + ix + iy * rx);
		let p1 = this.read(offset + ixp1 + iy * rx);
		let p2 = this.read(offset + ix + iyp1 * rx);
		let p3 = this.read(offset + ixp1 + iyp1 * rx);

		let weight_x2 = x - ix;
		let weight_x1 = 1.0 - weight_x2;
		let weight_y2 = y - iy;
		let weight_y1 = 1.0 - weight_y2;
		let value_y1 = p0 * weight_x1 + p1 * weight_x2;
		let value_y2 = p2 * weight_x1 + p3 * weight_x2;
		return (value_y1 * weight_y1 + value_y2 * weight_y2);
	}

	/**
	 * Appends one slice.
	 * Note that the input data must be in the machine's native byte order
	 * (i.e., little endian in x64 CPUs).
	 * @param z Z coordinate of the image inserted.
	 * @param imageData The inserted image data using the machine's native byte order.
	 */
	public insertSingleImage(z: number, imageData: ArrayBuffer): void {
		if (!this.size) {
			throw new Error('Dimension not set');
		}
		let [rx, ry, rz] = this.size;
		if (z < 0 || z >= rz) {
			throw new RangeError('z-index out of bounds');
		}
		if (rx * ry * this.bpp > imageData.byteLength) {
			throw new Error('Not enough buffer length');
		}
		let len = rx * ry * this.bpp;
		let offset = len * z;
		let src = new Uint8Array(imageData, 0, len);
		let dst = new Uint8Array(this.data, offset, len);
		dst.set(src);
		this.loadedSlices.append(z);
	}

	/**
	 * Set the size of this volume and allocate an array.
	 */
	public setDimension(x: number, y: number, z: number, type: PixelFormat): void {
		if (x <= 0 || y <= 0 || z <= 0) {
			throw new Error('Invalid volume size.');
		}
		if (this.size) {
			throw new Error('Dimension already fixed.');
		}
		if (x * y * z > 1024 * 1024 * 1024) {
			throw new Error('Maximum voxel limit exceeded.');
		}
		if (type === PixelFormat.Binary && (x * y) % 8 !== 0) {
			throw new Error('Number of pixels in a slice must be a multiple of 8.');
		}
		this.size = [x, y, z];
		this.pixelFormat = type;

		this.bpp = this.getPixelFormatInfo(this.pixelFormat).bpp;
		this.data = new ArrayBuffer(x * y * z * this.bpp);
		this.read = pos => this.view[pos];
		this.write = (value, pos) => this.view[pos] = value;

		switch (type) {
			case PixelFormat.UInt8:
				this.view = new Uint8Array(this.data);
				break;
			case PixelFormat.Int8:
				this.view = new Int8Array(this.data);
				break;
			case PixelFormat.UInt16:
				this.view = new Uint16Array(this.data);
				break;
			case PixelFormat.Int16:
				this.view = new Int16Array(this.data);
				break;
			case PixelFormat.Binary:
				this.view = new Uint8Array(this.data);
				this.read = pos => (this.view[pos >> 3] >> (7 - pos % 8)) & 1;
				this.write = (value, pos) => {
					let cur = this.view[pos >> 3];
					cur ^= (-value ^ cur) & (1 << (7 - pos % 8)); // set n-th bit to value
					this.view[pos >> 3] = cur;
				};
				break;
			default:
				throw new RangeError('Invalid pixel format');
		}
		this.bpp = this.getPixelFormatInfo().bpp;
	}

	public getDimension(): Vector3D {
		if (!this.size) {
			throw new Error('Dimension not set');
		}
		return <Vector3D>this.size.slice(0);
	}

	public getPixelFormat(): PixelFormat {
		return this.pixelFormat;
	}

	public getPixelFormatInfo(type?: PixelFormat): PixelFormatInfo {
		if (typeof type === 'undefined') {
			type = this.pixelFormat;
		}
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

	/**
	 * set voxel dimension and window
	 */
	public setVoxelDimension(width: number, height: number, depth: number): void {
		this.voxelSize = [width, height, depth];
	}

	public getVoxelDimension(): Vector3D {
		return <Vector3D>this.voxelSize.slice(0);
	}

	public get dataSize(): number {
		if (!this.size) {
			throw new Error('Dimension not set');
		}
		return this.size[0] * this.size[1] * this.size[2] * this.bpp;
	}

	/**
	 * Applies window level/width
	 */
	protected applyWindow(width: number, level: number, pixel: number): number {
		let value = Math.round((pixel - level + width / 2) * (255 / width));
		if (value > 255) {
			value = 255;
		} else if (value < 0) {
			value = 0;
		}
		return value;
	}

	/**
	 * Creates an orthogonal MPR image on a new array buffer.
	 */
	public orthogonalMpr(axis: string,
		target: number, windowWidth: number, windowLevel: number
	): Promise<MprResult> {
		let image: Uint8Array;
		let buffer_offset = 0;
		let [rx, ry, rz] = this.size;

		let checkZranges = () => {
			if (this.loadedSlices.length() !== rz)
				throw new ReferenceError('Volume is not fully loaded to construct this MPR');
		};

		switch (axis) {
			case 'sagittal':
				checkZranges();
				image = new Uint8Array(ry * rz);
				for (let z = 0; z < rz; z++)
					for (let y = 0; y < ry; y++)
						image[buffer_offset++] =
							this.applyWindow(windowWidth, windowLevel, this.getPixelAt(target, y, z));
				return Promise.resolve({image, outWidth: ry, outHeight: rz});
			case 'coronal':
				checkZranges();
				image = new Uint8Array(rx * rz);
				for (let z = 0; z < rz; z++)
					for (let x = 0; x < rx; x++)
						image[buffer_offset++] =
							this.applyWindow(windowWidth, windowLevel, this.getPixelAt(x, target, z));
				return Promise.resolve({image, outWidth: rx, outHeight: rz});
			default:
			case 'axial':
				image = new Uint8Array(rx * ry);
				for (let y = 0; y < ry; y++)
					for (let x = 0; x < rx; x++)
						image[buffer_offset++] =
							this.applyWindow(windowWidth, windowLevel, this.getPixelAt(x, y, target));
				return Promise.resolve({image, outWidth: rx, outHeight: ry});
		}
	}

	protected walkUntilObliqueBounds(sx: number, sy: number, dx: number, dy: number,
		mx: number, my: number
	): { count: number, px: number, py: number} {
		let count = 0;
		let px = sx;
		let py = sy;
		while (true) {
			px += dx;
			py += dy;
			if (px < 0 || py < 0 || px > mx - 1 || py > my - 1) break;
			count++;
		}
		return {count, px, py};
	}

	/**
	 * Scan over the volume and make an oblique image,
	 * starting from origin and along with the plane defined by eu/ev.
	 * The result is written to `image`.
	 * If windowWidth/Level is given, output image must be an Uint8Array.
	 * Otherwise, the output image must have the same pixel format as the
	 * source volume data.
	 */
	protected scanOblique(origin: Vector3D,
		eu: Vector3D, ev: Vector3D,
		outSize: Vector2D, image: {[index: number]: number},
		windowWidth?: number, windowLevel?: number
	): void {
		let [rx, ry, rz] = this.size;
		let [x, y, z] = origin;
		let [eu_x, eu_y, eu_z] = eu;
		let [ev_x, ev_y, ev_z] = ev;
		let [outWidth, outHeight] = outSize;

		let imageOffset = 0;
		let value: number;

		let useWindow = (typeof windowWidth === 'number' && typeof windowLevel === 'number');

		for (let j = 0; j < outHeight; j++) {
			let [pos_x, pos_y, pos_z] = [x, y, z];

			for (let i = 0; i < outWidth; i++) {
				if (pos_x >= 0.0 && pos_y >= 0.0 && pos_z >= 0.0
					&& pos_x <= rx - 1 && pos_y <= ry - 1 && pos_z <= rz - 1) {
					value = this.getPixelWithInterpolation(pos_x, pos_y, pos_z);
					if (useWindow) {
						value = this.applyWindow(windowWidth, windowLevel, value);
					}
				} else {
					value = 0;
				}
				image[imageOffset++] = Math.round(value);

				pos_x += eu_x;
				pos_y += eu_y;
				pos_z += eu_z;
			}
			x += ev_x;
			y += ev_y;
			z += ev_z;
		}
	}

	protected determineObliqueSizeAndScanOrientation(baseAxis: string, center: Vector3D, alpha: number,
		pixelSize: number
	): {outSize: Vector2D, outCenter: Vector2D, eu: Vector3D, ev: Vector3D, origin: Vector3D
	} {
		let [eu_x, eu_y, eu_z] = [0, 0, 0];
		let [ev_x, ev_y, ev_z] = [0, 0, 0];
		let [rx, ry, rz] = this.size;
		let [vx, vy, vz] = this.voxelSize;
		let [centerX, centerY] = [0, 0];
		let [outWidth, outHeight] = [0, 0];
		let origin: Vector3D;

		// Determine output size
		if (baseAxis === 'axial') {
			eu_x = Math.cos(alpha) * pixelSize / vx;
			eu_y = -1.0 * Math.sin(alpha) * pixelSize / vy;
			ev_z = pixelSize / vz;

			let minus = this.walkUntilObliqueBounds(center[0], center[1], -eu_x, -eu_y, rx, ry);
			let plus = this.walkUntilObliqueBounds(center[0], center[1], eu_x, eu_y, rx, ry);

			origin = [minus.px, minus.py, 0];
			centerX = minus.count;
			centerY = Math.floor(center[2] * vz / pixelSize);
			outWidth = minus.count + plus.count + 1;
			outHeight = Math.floor(rz * vz / pixelSize);
		} else if (baseAxis === 'coronal') {
			eu_x = Math.cos(alpha) * pixelSize / vx;
			eu_z = -1.0 * Math.sin(alpha) * pixelSize / vz;
			ev_y = pixelSize / vy;

			let minus = this.walkUntilObliqueBounds(center[0], center[2], -eu_x, -eu_z, rx, rz);
			let plus = this.walkUntilObliqueBounds(center[0], center[2], eu_x, eu_z, rx, rz);

			origin = [minus.px, 0, minus.py];
			centerX = minus.count;
			centerY = Math.floor(center[1] * vy / pixelSize);
			outWidth = minus.count + plus.count + 1;
			outHeight = Math.floor(ry * vy / pixelSize);
		} else if (baseAxis === 'sagittal') {
			eu_x = pixelSize / vx;
			ev_y = Math.cos(alpha) * pixelSize / vy;
			ev_z = -1.0 * Math.sin(alpha) * pixelSize / vz;

			let minus = this.walkUntilObliqueBounds(center[1], center[2], -ev_y, -ev_z, ry, rz);
			let plus = this.walkUntilObliqueBounds(center[1], center[2], ev_y, ev_z, ry, rz);

			origin = [0, minus.px, minus.py];
			centerX = Math.floor(center[0] * vx / pixelSize);
			centerY = minus.count;
			outWidth = Math.floor(rx * vx / pixelSize);
			outHeight = minus.count + plus.count + 1;
		} else {
			throw new Error('Invalid axis argument.');
		}

		return {
			outSize: [outWidth, outHeight],
			outCenter: [centerX, centerY],
			eu: [eu_x, eu_y, eu_z],
			ev: [ev_x, ev_y, ev_z],
			origin
		};
	}

	/**
	 * Creates a single oblique MPR image on a new array buffer.
	 */
	public singleOblique(baseAxis: string, center: Vector3D, alpha: number,
		windowWidth: number, windowLevel: number
	): Promise<ObliqueResult> {
		let [vx, vy, vz] = this.voxelSize;
		let pixelSize = Math.min(vx, vy, vz);

		// Determine the output image bounds
		let {outSize, outCenter, eu, ev, origin} =
			this.determineObliqueSizeAndScanOrientation(baseAxis, center, alpha, pixelSize);

		// Prepare the image buffer for output
		let image = new Uint8Array(outSize[0] * outSize[1]);

		// Iterate over the output image
		this.scanOblique(origin, eu, ev, outSize, image, windowWidth, windowLevel);
		return Promise.resolve({
			image,
			outWidth: outSize[0], outHeight: outSize[1],
			centerX: outCenter[0], centerY: outCenter[1],
			pixelSize
		});
	}
}
