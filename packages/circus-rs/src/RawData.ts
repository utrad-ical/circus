/**
 * Raw voxel container with MPR support.
 */

// Make sure you don't add properties
// that heavily depends on DICOM spec.

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

export default class RawData {
	// Number of voxels
	protected x: number = 0;
	protected y: number = 0;
	protected z: number = 0;

	// Pixel format
	protected type: PixelFormat = PixelFormat.Unknown;

	// Voxel size [mm]
	protected vx: number = 1;
	protected vy: number = 1;
	protected vz: number = 1;

	// Byte per voxel [byte/voxel]
	protected bpp: number = 1;

	// Actual image data
	protected data: ArrayBuffer;
	// The array view for the array buffer (eg Uint8Array)
	protected view: {[offset: number]: number};

	// Holds which images are alrady loaded in this volume.
	// When complete, this.loadedSlices.length() will be the same as this.z.
	protected loadedSlices: MultiRange = new MultiRange();

	// Voxel read function
	protected read: (pos: number) => number;
	// Voxel write function
	protected write: (value: number, pos: number) => void;

	/**
	 * Get pixel value. Each parameter must be an integer.
	 * @param x integer x-coordinate
	 * @param y integer y-coordinate
	 * @param z integer z-coordinate
	 * @returns Corresponding voxel value.
	 */
	public getPixelAt(x: number, y: number, z: number): number {
		return this.read(x + (y + z * this.y) * this.x);
	}

	/**
	 * Write pixel value at the specified location.
	 * @param value Pixel value to write.
	 * @param x integer x-coordinate
	 * @param y integer y-coordinate
	 * @param z integer z-coordinate
	 */
	public writePixelAt(value: number, x: number, y: number, z: number): void {
		this.write(value, x + (y + z * this.y) * this.x);
	}

	/**
	 * Get pixel value using bilinear interpolation.
	 * @param x floating point x-coordinate
	 * @param y floating point y-coordinate
	 * @param z floating point z-coordinate
	 * @returns Corresponding voxel value.
	 */
	public getPixelWithInterpolation(x: number, y: number, z: number): number {
		let x_end = this.x - 1;
		let y_end = this.y - 1;
		let z_end = this.z - 1;
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
		let offset = this.x * this.y * intz;
		let p0 = this.read(offset + ix + iy * this.x);
		let p1 = this.read(offset + ixp1 + iy * this.x);
		let p2 = this.read(offset + ix + iyp1 * this.x);
		let p3 = this.read(offset + ixp1 + iyp1 * this.x);

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
		if (this.x <= 0 || this.y <= 0 || this.z <= 0) {
			throw new Error('Dimension not set');
		}
		if (z < 0 || z >= this.z) {
			throw new RangeError('z-index out of bounds');
		}
		if (this.x * this.y * this.bpp > imageData.byteLength) {
			throw new Error('Not enough buffer length');
		}
		let len = this.x * this.y * this.bpp;
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
		if (this.x > 0 || this.y > 0 || this.z > 0) {
			throw new Error('Dimension already fixed.');
		}
		if (x * y * z > 1024 * 1024 * 1024) {
			throw new Error('Maximum voxel limit exceeded.');
		}
		if (type === PixelFormat.Binary && (x * y) % 8 !== 0) {
			throw new Error('Number of pixels in a slice must be a multiple of 8.');
		}
		this.x = x;
		this.y = y;
		this.z = z;
		this.type = type;

		this.bpp = this.getPixelFormatInfo(this.type).bpp;
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
		return [this.x, this.y, this.z];
	}

	public getPixelFormat(): PixelFormat {
		return this.type;
	}

	public getPixelFormatInfo(type?: PixelFormat): PixelFormatInfo {
		if (typeof type === 'undefined') {
			type = this.type;
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
		this.vx = width;
		this.vy = height;
		this.vz = depth;
	}

	public getVoxelDimension(): Vector3D {
		return [this.vx, this.vy, this.vz];
	}

	public get dataSize(): number {
		return this.x * this.y * this.z * this.bpp;
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
	 * Creates an orthogonal MPR image on a new buffer.
	 */
	public orthogonalMpr(axis: string,
		target: number, windowWidth: number,
		windowLevel: number
	): Promise<MprResult> {
		let image: Uint8Array;
		let buffer_offset = 0;
		let [rx, ry, rz] = [this.x, this.y, this.z];

		let checkZranges = () => {
			if (this.loadedSlices.length() !== this.z)
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

	protected determineObliqueSizeAndScanOrientation(baseAxis: string, center: Vector3D, alpha: number,
		pixelSize: number
	): {outWidth: number, outHeight: number, centerX: number, centerY: number,
		eu: Vector3D, ev: Vector3D, origin: Vector3D
	} {
		let [eu_x, eu_y, eu_z] = [0, 0, 0];
		let [ev_x, ev_y, ev_z] = [0, 0, 0];
		let [rx, ry, rz] = [this.x, this.y, this.z];
		let [centerX, centerY] = [0, 0];
		let [origin_x, origin_y, origin_z] = [0, 0, 0];
		let [outWidth, outHeight] = [0, 0];

		// Determine output size
		if (baseAxis === 'axial') {
			eu_x = Math.cos(alpha) * pixelSize / this.vx;
			eu_y = -1.0 * Math.sin(alpha) * pixelSize / this.vy;
			ev_z = pixelSize / this.vz;

			let minus = this.walkUntilObliqueBounds(center[0], center[1], -eu_x, -eu_y, rx, ry);
			let plus = this.walkUntilObliqueBounds(center[0], center[1], eu_x, eu_y, rx, ry);

			origin_x = minus.px;
			origin_y = minus.py;
			centerX = minus.count;
			centerY = Math.floor(center[2] * this.vz / pixelSize);
			outWidth = minus.count + plus.count + 1;
			outHeight = Math.floor(rz * this.vz / pixelSize);
		} else if (baseAxis === 'coronal') {
			eu_x = Math.cos(alpha) * pixelSize / this.vx;
			eu_z = -1.0 * Math.sin(alpha) * pixelSize / this.vz;
			ev_y = pixelSize / this.vy;

			let minus = this.walkUntilObliqueBounds(center[0], center[2], -eu_x, -eu_z, rx, rz);
			let plus = this.walkUntilObliqueBounds(center[0], center[2], eu_x, eu_z, rx, rz);

			origin_x = minus.px;
			origin_z = minus.py;
			centerX = minus.count;
			centerY = Math.floor(center[1] * this.vy / pixelSize);
			outWidth = minus.count + plus.count + 1;
			outHeight = Math.floor(ry * this.vy / pixelSize);
		} else if (baseAxis === 'sagittal') {
			eu_x = pixelSize / this.vx;
			ev_y = Math.cos(alpha) * pixelSize / this.vy;
			ev_z = -1.0 * Math.sin(alpha) * pixelSize / this.vz;

			let minus = this.walkUntilObliqueBounds(center[1], center[2], -ev_y, -ev_z, ry, rz);
			let plus = this.walkUntilObliqueBounds(center[1], center[2], ev_y, ev_z, ry, rz);

			origin_y = minus.px;
			origin_z = minus.py;
			centerX = Math.floor(center[0] * this.vx / pixelSize);
			centerY = minus.count;
			outWidth = Math.floor(rx * this.vx / pixelSize);
			outHeight = minus.count + plus.count + 1;
		} else {
			throw new Error('Invalid axis argument.');
		}

		return {
			outWidth,
			outHeight,
			centerX,
			centerY,
			eu: [eu_x, eu_y, eu_z],
			ev: [ev_x, ev_y, ev_z],
			origin: [origin_x, origin_y, origin_z]
		};
	}

	public singleOblique(baseAxis: string, center: Vector3D, alpha: number,
		windowWidth: number, windowLevel: number
	): Promise<ObliqueResult> {
		let [rx, ry, rz] = [this.x, this.y, this.z];
		let pixelSize = Math.min(this.vx, this.vy, this.vz);
		let {outWidth, outHeight, centerX, centerY, eu, ev, origin} =
			this.determineObliqueSizeAndScanOrientation(baseAxis, center, alpha, pixelSize);
		let [eu_x, eu_y, eu_z] = eu;
		let [ev_x, ev_y, ev_z] = ev;

		// Create oblique image
		let [x, y, z] = origin;

		let image = new Uint8Array(outWidth * outHeight);
		let imageOffset = 0;
		let value = 0;

		for (let j = 0; j < outHeight; j++) {
			let pos_x = x;
			let pos_y = y;
			let pos_z = z;

			for (let i = 0; i < outWidth; i++) {

				if (pos_x >= 0.0 && pos_y >= 0.0 && pos_z >= 0.0
					&& pos_x <= rx - 1 && pos_y <= ry - 1 && pos_z <= rz - 1) {
					value = this.applyWindow(
						windowWidth, windowLevel,
						this.getPixelWithInterpolation(pos_x, pos_y, pos_z)
					);
				} else value = 0;
				image[imageOffset++] = value;

				pos_x += eu_x;
				pos_y += eu_y;
				pos_z += eu_z;
			}
			x += ev_x;
			y += ev_y;
			z += ev_z;
		}

		return Promise.resolve({
			image,
			outWidth, outHeight,
			pixelSize, centerX, centerY
		});
	}
}
