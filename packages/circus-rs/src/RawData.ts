/**
 * Raw voxel container with MPR support.
 */

// Make sure you don't add properties
// that heavily depends on DICOM spec.

import { MultiRange } from 'multi-integer-range';

export enum PixelFormat {
	Unknown = -1,
	UInt8 = 0,
	Int8 = 1,
	UInt16 = 2,
	Int16 = 3,
	Binary = 4
}

export type Vector3D = [number, number, number];

interface ObliqueResult {
	buffer: Buffer;
	outWidth:  number;
	outHeight: number;
	pixelSize: number;
	centerX: number;
	centerY: number;
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
	protected data: Buffer;

	// Holds which images are alrady loaded in this volume.
	// When complete, this.loadedSlices.length() will be the same as this.z.
	protected loadedSlices: MultiRange = new MultiRange();

	// Voxel read function (maps to one of data.readIntXX functions)
	protected read: (pos: number) => number;
	// Voxel write function (maps to one of data.writeIntXX functions)
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
	public getPixelWithInterpolation(x: number, y: number, z: number): number
	{
		var x_end = this.x - 1;
		var y_end = this.y - 1;
		var z_end = this.z - 1;
		if (x < 0.0 || y < 0.0 || z < 0.0 || x > x_end || y > y_end || z > z_end) {
			return 0;
		}

		var iz = Math.floor(z);
		if (iz >= z_end) {
			iz = z_end - 1;
			z = z_end;
		}
		var ix = Math.floor(x);
		if (ix >= x_end) {
			ix = x_end - 1;
			x = x_end;
		}
		var iy = Math.floor(y);
		if (iy >= y_end) {
			iy = y_end - 1;
			y = y_end;
		}

		var value_z1 = this.getAxialInterpolation(ix, x, iy, y, iz);
		var value_z2 = this.getAxialInterpolation(ix, x, iy, y, iz + 1);
		var weight_z2 = z - iz;
		var weight_z1 = 1.0 - weight_z2;
		return value_z1 * weight_z1 + value_z2 * weight_z2;
	}

	protected getAxialInterpolation(ix: number, x: number, iy: number, y: number, intz: number): number {
		var ixp1 = ix + 1;
		var iyp1 = iy + 1;

		// p0 p1
		// p2 p3
		var offset = this.x * this.y * intz;
		var p0 = this.read(offset + ix   + iy   * this.x);
		var p1 = this.read(offset + ixp1 + iy   * this.x);
		var p2 = this.read(offset + ix   + iyp1 * this.x);
		var p3 = this.read(offset + ixp1 + iyp1 * this.x);

		var weight_x2 = x - ix;
		var weight_x1 = 1.0 - weight_x2;
		var weight_y2 = y - iy;
		var weight_y1 = 1.0 - weight_y2;
		var value_y1 = p0 * weight_x1 + p1 * weight_x2;
		var value_y2 = p2 * weight_x1 + p3 * weight_x2;
		return (value_y1 * weight_y1 + value_y2 * weight_y2);
	}

	public insertSingleImage(z: number, imageData: Buffer): void {
		if (this.x <= 0 || this.y <= 0 || this.z <= 0) {
			throw new Error('Dimension not set');
		}
		if (z < 0 || z >= this.z) {
			throw new RangeError('z-index out of bounds');
		}
		if (this.x * this.y * this.bpp > imageData.length) {
			throw new Error('Not enough buffer length');
		}
		var len = this.x * this.y * this.bpp;
		var offset = len * z;
		imageData.copy(this.data, offset, 0, len);
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
		switch (type) {
			case PixelFormat.UInt8:
				this.read = pos => this.data.readUInt8(pos);
				this.write = (value, pos) => this.data.writeUInt8(value, pos);
				break;
			case PixelFormat.Int8:
				this.read = pos => this.data.readInt8(pos);
				this.write = (value, pos) => this.data.writeInt8(value, pos);
				break;
			case PixelFormat.UInt16:
				this.read = pos => this.data.readUInt16LE(pos * 2);
				this.write = (value, pos) => this.data.writeUInt16LE(value, pos * 2);
				break;
			case PixelFormat.Int16:
				this.read = pos => this.data.readInt16LE(pos * 2);
				this.write = (value, pos) => this.data.writeInt16LE(value, pos * 2);
				break;
			case PixelFormat.Binary:
				this.read = pos => (this.data.readUInt8(pos >> 3) >> (7 - pos % 8) & 1);
				this.write = (value, pos) => {
					let cur = this.data.readUInt8(pos >> 3);
					cur ^= (-value ^ cur) & (1 << (7 - pos % 8)); // set n-th bit to value
					this.data.writeUInt8(cur, pos >> 3);
				};
				break;
			default:
				throw new RangeError('Invalid pixel format');
		}
		this.bpp = this.getPixelFormatInfo().bpp;
		this.data = new Buffer(x * y * z * this.bpp);
		this.data.fill(0); // Newly created buffer needs to be zerofilled
	}

	public getDimension(): Vector3D {
		return [this.x, this.y, this.z];
	}

	public getPixelFormat(): PixelFormat {
		return this.type;
	}

	public getPixelFormatInfo(type?: PixelFormat):
		{ bpp: number; minLevel: number; maxLevel: number; minWidth: number; maxWidth: number }
	{
		if (typeof type === 'undefined') {
			type = this.type;
		}
		switch (type) {
			case PixelFormat.UInt8:
				return { bpp: 1, minWidth: 1, maxWidth: 256, minLevel: 0, maxLevel: 255};
			case PixelFormat.Int8:
				return { bpp: 1, minWidth: 1, maxWidth: 256, minLevel: -128, maxLevel: 127};
			case PixelFormat.UInt16:
				return { bpp: 2, minWidth: 1, maxWidth: 65536, minLevel: 0, maxLevel: 65535};
			case PixelFormat.Int16:
				return { bpp: 2, minWidth: 1, maxWidth: 65536, minLevel: -32768, maxLevel: 32767};
			case PixelFormat.Binary:
				return { bpp: 0.125, minWidth: 1, maxWidth: 1, minLevel: 0, maxLevel: 1 };
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
		var value = Math.round((pixel - level + width / 2) * (255 / width));
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
		target: number, windowWidth: number, windowLevel: number):
			{ buffer: Buffer; outWidth: number; outHeight: number }
	{
		var buffer: Buffer;
		var buffer_offset = 0;
		var [rx, ry, rz] = [this.x, this.y, this.z];

		var checkZranges = () => {
			if (this.loadedSlices.length() !== this.z)
				throw new ReferenceError('Volume is not fully loaded to construct this MPR');
		};

		switch (axis) {
			case 'sagittal':
				checkZranges();
				buffer = new Buffer(ry * rz);
				for (let z = 0; z < rz; z++)
					for (let y = 0; y < ry; y++)
						buffer.writeUInt8(
							this.applyWindow(windowWidth, windowLevel, this.getPixelAt(target, y, z)),
							buffer_offset++
						);
				return { buffer, outWidth: ry, outHeight: rz };
			case 'coronal':
				checkZranges();
				buffer = new Buffer(rx * rz);
				for (let z = 0; z < rz; z++)
					for (let x = 0; x < rx; x++)
						buffer.writeUInt8(
							this.applyWindow(windowWidth, windowLevel, this.getPixelAt(x, target, z)),
							buffer_offset++
						);
				return { buffer, outWidth: rx, outHeight: rz };
			case 'axial':
			default:
				buffer = new Buffer(rx * ry);
				for (let y = 0; y < ry; y++)
					for (let x = 0; x < rx; x++)
						buffer.writeUInt8(
							this.applyWindow(windowWidth, windowLevel, this.getPixelAt(x, y, target)),
							buffer_offset++
						);
				return { buffer, outWidth: rx, outHeight: ry };
		}
	}

	protected walkUntilObliqueBounds(
			sx: number, sy: number, dx: number, dy: number,
			mx: number, my: number): { count: number, px: number, py: number}
	{
		let count = 0;
		let px = sx;
		let py = sy;
		while (true) {
			px += dx;
			py += dy;
			if (px < 0 || py < 0 || px > mx - 1 || py > my - 1) break;
			count++;
		}
		return { count, px, py };
	}

	public singleOblique(base_axis: string, center: Vector3D, alpha: number,
			windowWidth: number, windowLevel: number): ObliqueResult
	{
		let [eu_x, eu_y, eu_z] = [0, 0, 0];
		let [ev_x, ev_y, ev_z] = [0, 0, 0];
		let [rx, ry, rz] = [this.x, this.y, this.z];
		let [origin_x, origin_y, origin_z] = [0, 0, 0];

		let [outWidth, outHeight] = [0, 0];
		let [centerX, centerY] = [0, 0];
		var pixelSize = Math.min(this.vx, this.vy, this.vz);

		// Determine output size
		if (base_axis === 'axial') {
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
		} else if (base_axis === 'coronal') {
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
		} else if (base_axis === 'sagittal') {
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

		// Create oblique image
		var x = origin_x;
		var y = origin_y;
		var z = origin_z;

		var buffer = new Buffer(outWidth * outHeight);
		var buffer_offset = 0;
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
				buffer.writeUInt8(value, buffer_offset++);

				pos_x += eu_x;
				pos_y += eu_y;
				pos_z += eu_z;
			}
			x += ev_x;
			y += ev_y;
			z += ev_z;
		}

		return {buffer, outWidth, outHeight,
			pixelSize, centerX, centerY};
	}
}
