// Raw voxel container class

import { MultiRange } from 'multi-integer-range';
import { Promise } from 'es6-promise';

import { PixelFormat, PixelFormatInfo, pixelFormatInfo } from './PixelFormat';
import { RawDataSection } from './RawDataSection';

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

// Make sure you don't add properties
// that heavily depends on DICOM spec!

/**
 * Raw voxel container with MPR support.
 */
export default class RawData {
	/**
	 * Number of voxels.
	 * @protected
	 */
	protected size: Vector3D = null;

	/**
	 * Pixel format.
	 * @protected
	 */
	protected pixelFormat: PixelFormat = PixelFormat.Unknown;

	/**
	 * Voxel size [mm]
	 * @protected
	 */
	protected voxelSize: Vector3D = null;

	/**
	 * Byte per voxel [byte/voxel]
	 * @protected
	 */
	protected bpp: number = 1;

	/**
	 * Actual image data.
	 * @protected
	 */
	protected data: ArrayBuffer;

	/**
	 * The array view used with the array buffer (eg, Uint8Array)
	 * @protected
	 */
	protected view: {[offset: number]: number};

	/**
	 * Voxel read function
	 * @protected
	 */
	protected read: (pos: number) => number;

	/**
	 * Voxel write function
	 * @protected
	 */
	protected write: (value: number, pos: number) => void;

	/**
	 * Holds which images are already loaded in this volume.
	 * When complete, this.loadedSlices.length() will be the same as this.z.
	 * @protected
	 */
	protected loadedSlices: MultiRange = new MultiRange();

	/**
	 * Get pixel value. Each parameter must be an integer.
	 * @param x {integer} x-coordinate
	 * @param y {integer} y-coordinate
	 * @param z {integer} z-coordinate
	 * @return n {number} Corresponding voxel value.
	 */
	public getPixelAt(x: number, y: number, z: number): number {
		return this.read(x + (y + z * this.size[1]) * this.size[0]);
	}

	/**
	 * Write pixel value at the specified location.
	 * @param value Pixel value to write.
	 * @param x {integer} x-coordinate
	 * @param y {integer} y-coordinate
	 * @param z {integer} z-coordinate
	 */
	public writePixelAt(value: number, x: number, y: number, z: number): void {
		this.write(value, x + (y + z * this.size[1]) * this.size[0]);
	}

	/**
	 * Append z to loadedSlices:MultiRange.
	 * @param z {integer} z-coordinate
	 */
	public markSliceAsLoaded(z: number): void {
		if (z < 0 || z >= this.size[2]) {
			throw new RangeError('z-index out of bounds');
		}
		this.loadedSlices.append(z);
	}

	/**
	 * Get pixel value using bilinear interpolation.
	 * @param x {floating point} x-coordinate
	 * @param y {floating point} y-coordinate
	 * @param z {floating point} z-coordinate
	 * @return n {number} Corresponding voxel value.
	 */
	public getPixelWithInterpolation(x: number, y: number, z: number): number {
		// Check values
		let x_end = this.size[0] - 1;
		let y_end = this.size[1] - 1;
		let z_end = this.size[2] - 1;
		if (x < 0.0 || y < 0.0 || z < 0.0 || x > x_end || y > y_end || z > z_end) {
			return 0;
		}

		// Handle edge cases
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

		// Calculate the weight of slices and determine the final value
		let value_z1 = this.getAxialInterpolation(ix, x, iy, y, iz);
		let value_z2 = this.getAxialInterpolation(ix, x, iy, y, iz + 1);
		let weight_z2 = z - iz;
		let weight_z1 = 1.0 - weight_z2;
		return value_z1 * weight_z1 + value_z2 * weight_z2;
	}

	/**
	 * Do 4-neighbor pixel interpolation within a given single axial slice.
	 * @protected
	 * @param ix {number}
	 * @param x {number}
	 * @param iy {number}
	 * @param y {number}
	 * @param intz {number}
	 * @return n {number}
	 */
	protected getAxialInterpolation(ix: number, x: number, iy: number, y: number, intz: number): number {
		let ixp1 = ix + 1;
		let iyp1 = iy + 1;

		// p0 p1
		// p2 p3
		let rx = this.size[0];
		let offset = rx * this.size[1] * intz; // offset of p0 (top-left pixel)
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
	 * Appends and overwrites one slice.
	 * Note that the input data must be in the machine's native byte order
	 * (i.e., little endian in x64 CPUs).
	 * @param z {number} Z coordinate of the image inserted.
	 * @param imageData {ArrayBuffer} The inserted image data using the machine's native byte order.
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

		let byteLength = rx * ry * this.bpp; // len:byte of surface
		let offset = byteLength * z;

		let src = new Uint8Array(imageData, 0, byteLength);
		let dst = new Uint8Array(this.data, offset, byteLength);
		dst.set(src); // This overwrites the existing slice (if any)
		this.loadedSlices.append(z);
	}

	/**
	 * Get single image by z.
	 * @param z {number} z-coordinate
	 * @return arraybuffer {ArrayBuffer} image data
	 */
	public getSingleImage(z: number): ArrayBuffer {
		if (!this.size) {
			throw new Error('Dimension not set');
		}

		let [rx, ry, rz] = this.size;
		if (z < 0 || z >= rz) {
			throw new RangeError('z-index out of bounds');
		}

		let byteLength = rx * ry * this.bpp;
		let offset = byteLength * z;
		let src = new Uint8Array(this.data, offset, byteLength);
		let buffer = new ArrayBuffer(byteLength);
		(new Uint8Array(buffer)).set(src);
		return buffer;
	}

	/**
	 * Set the size of the 'volume' and allocate an array.
	 * @param x {number} x-coordinate
	 * @param y {number} y-coordinate
	 * @param z {number} z-coordinate
	 * @param type {PixelFormat} enum
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
		if (type === PixelFormat.Binary && (x * y) % 8 !== 0) { // image area must be multiple of 8
			throw new Error('Number of pixels in a slice must be a multiple of 8.');
		}

		this.size = [x, y, z];
		this.pixelFormat = type;
		let pxInfo = this.getPixelFormatInfo(this.pixelFormat);
		this.data = new ArrayBuffer(this.size[0] * this.size[1] * this.size[2] * pxInfo.bpp);
		this.setAccessor();
	}

	protected setAccessor(): void {
		let pxInfo = this.getPixelFormatInfo(this.pixelFormat);
		this.bpp = pxInfo.bpp;
		this.view = new pxInfo.arrayClass(this.data);

		if (this.pixelFormat !== PixelFormat.Binary) {
			this.read = pos => this.view[pos];
			this.write = (value, pos) => this.view[pos] = value;
		} else {
			this.read = pos => (this.view[pos >> 3] >> (7 - pos % 8)) & 1;
			this.write = (value, pos) => {
				let cur = this.view[pos >> 3];//pos => pos/8
				cur ^= (-value ^ cur) & (1 << (7 - pos % 8)); // set n-th bit to value
				this.view[pos >> 3] = cur;
			};
		}
	}

	/**
	 * returns Vector3D (copy of this.size)
	 * @return v3d {Vector3D}
	 */
	public getDimension(): Vector3D {
		if (!this.size) {
			throw new Error('Dimension not set');
		}
		return <Vector3D>this.size.slice(0);
	}

	/**
	 * returns pixel format
	 * @return p-format {PixelFormat}
	 */
	public getPixelFormat(): PixelFormat {
		return this.pixelFormat;
	}

	/**
	 * returns PixelFormatInfo
	 * @param type ?PixelFormat
	 * @return pinfo {PixelFormatInfo}
	 */
	public getPixelFormatInfo(type?: PixelFormat): PixelFormatInfo {
		if (typeof type === 'undefined') {
			type = this.pixelFormat;
		}
		return pixelFormatInfo(type);
	}

	/**
	 * set voxel dimension and window
	 * @param width {number}
	 * @param height {number}
	 * @param depth {number}
	 */
	public setVoxelDimension(width: number, height: number, depth: number): void {
		this.voxelSize = [width, height, depth];
	}

	/**
	 * get voxel size (copy of voxelSize)
	 * @return v {Vector3D}
	 */
	public getVoxelDimension(): Vector3D {
		return <Vector3D>this.voxelSize.slice(0);
	}

	/**
	 * get full-datasize
	 * @return bytesize {number}
	 */
	public get dataSize(): number {
		if (!this.size) {
			throw new Error('Dimension not set');
		}
		return this.size[0] * this.size[1] * this.size[2] * this.bpp;
	}

	/**
	 * Converts this raw data to new pixel format, optionally using a filter.
	 * @param targetFormat
	 * @param filter
	 */
	public convert(targetFormat: PixelFormat, filter: (number) => number): void {
		let newRaw = new RawData();
		let [rx, ry, rz] = this.size;
		newRaw.setDimension(this.size[0], this.size[1], this.size[2], targetFormat);
		for (let x = 0; x < rx; x++) {
			for (let y = 0; y < ry; y++) {
				for (let z = 0; z < rz; z++) {
					let pos = x + (y + z * this.size[1]) * this.size[0];
					let value = this.read(pos);
					if (filter) {
						value = filter(value);
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
	 * Applies window level/width.
	 * @protected
	 * @param width {number}
	 * @param level {number}
	 * @param pixel {number}
	 * @return n {number} 0-255
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
	 * not oblique.
	 * MPR:multi-planar reconstruction
	 * @param axis {string}
	 * @param target {number}
	 * @param windowWidth {number}
	 * @param windowLevel {number}
	 * @return promise {Promise<MprResult>}
	 */
	public orthogonalMpr(
		axis: string,
		target: number,
		windowWidth: number,
		windowLevel: number
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

	/**
	 * count cube of voxel from center to edge of voxel
	 * @protected
	 * @param centerX {number}
	 * @param centerY {number}
	 * @param microX {number}
	 * @param microY {number}
	 * @param voxelX {number}
	 * @param voxelY {number}
	 * @return object {{count: number, px: number, py: number}}
	 */
	protected walkUntilObliqueBounds(
		centerX: number,
		centerY: number,
		microX: number,
		microY: number,
		voxelX: number,
		voxelY: number
	): { count: number, px: number, py: number} {
		let count = 0;
		let px = centerX;
		let py = centerY;
		while (true) {
			px += microX;
			py += microY;
			if (px < 0 || py < 0 || px > voxelX - 1 || py > voxelY - 1) break;
			count++;
		}
		return {count, px, py};
	}

	/**
	 * Scan over the volume and make an oblique image,
	 * starting from origin and along with the plane defined by eu/ev.
	 * The result is written to `image`.
	 * If windowWidth/Level is given, output image will be an Uint8Array.
	 * Otherwise, the output image must have the same pixel format as the
	 * source volume data.
	 * @protected
	 * @param origin {Vector3D}
	 * @param eu {Vector3D}
	 * @param ev {Vector3D}
	 * @param outSize {Vector2D}
	 * @param image {{[index: number]: number}}
	 * @param windowWidth {?number}
	 * @param windowLevel {?number}
	 */
	public scanOblique(
		origin: Vector3D,
		eu: Vector3D,
		ev: Vector3D,
		outSize: Vector2D,
		image: {[index: number]: number},
		windowWidth?: number,
		windowLevel?: number
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

	/**
	 * Determine how to scan oblique image
	 * @protected
	 * @param baseAxis {string}
	 * @param center {Vector3D}
	 * @param angle {number}
	 * @param minVoxelSize {number} smallest size of this.voxelSize
	 * @return object {{outSize: Vector2D, outCenter: Vector2D, eu: Vector3D, ev: Vector3D, origin: Vector3D}}
	 */
	protected determineObliqueSizeAndScanOrientation(
		baseAxis: string,
		center: Vector3D,
		angle: number,
		minVoxelSize: number
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
			eu_x = Math.cos(angle) * minVoxelSize / vx;
			eu_y = -1.0 * Math.sin(angle) * minVoxelSize / vy;
			ev_z = minVoxelSize / vz;

			let minus = this.walkUntilObliqueBounds(center[0], center[1], -eu_x, -eu_y, rx, ry);
			let plus = this.walkUntilObliqueBounds(center[0], center[1], eu_x, eu_y, rx, ry);

			origin = [minus.px, minus.py, 0];
			centerX = minus.count;
			centerY = Math.floor(center[2] * vz / minVoxelSize);
			outWidth = minus.count + plus.count + 1;
			outHeight = Math.floor(rz * vz / minVoxelSize);
		} else if (baseAxis === 'coronal') {
			eu_x = Math.cos(angle) * minVoxelSize / vx;
			eu_z = -1.0 * Math.sin(angle) * minVoxelSize / vz;
			ev_y = minVoxelSize / vy;

			let minus = this.walkUntilObliqueBounds(center[0], center[2], -eu_x, -eu_z, rx, rz);
			let plus = this.walkUntilObliqueBounds(center[0], center[2], eu_x, eu_z, rx, rz);

			origin = [minus.px, 0, minus.py];
			centerX = minus.count;
			centerY = Math.floor(center[1] * vy / minVoxelSize);
			outWidth = minus.count + plus.count + 1;
			outHeight = Math.floor(ry * vy / minVoxelSize);
		} else if (baseAxis === 'sagittal') {
			eu_x = minVoxelSize / vx;
			ev_y = Math.cos(angle) * minVoxelSize / vy;
			ev_z = -1.0 * Math.sin(angle) * minVoxelSize / vz;

			let minus = this.walkUntilObliqueBounds(center[1], center[2], -ev_y, -ev_z, ry, rz);
			let plus = this.walkUntilObliqueBounds(center[1], center[2], ev_y, ev_z, ry, rz);

			origin = [0, minus.px, minus.py];
			centerX = Math.floor(center[0] * vx / minVoxelSize);
			centerY = minus.count;
			outWidth = Math.floor(rx * vx / minVoxelSize);
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
	 * @param baseAxis {string}
	 * @param center {Vector3D}
	 * @param angle {number} angle
	 * @param windowWidth {number}
	 * @param windowLevel {number}
	 * @return promise {Promise<ObliqueResult>}
	 */
	public singleOblique(
		baseAxis: string,
		center: Vector3D,
		angle: number,
		windowWidth?: number,
		windowLevel?: number
	): Promise<ObliqueResult> {
		let [vx, vy, vz] = this.voxelSize;
		// Determine the output image resolution,
		// which must be the smallest voxel size of the three axis.
		let pixelSize = Math.min(vx, vy, vz);

		// Determine the output image bounds
		let {outSize, outCenter, eu, ev, origin} =
			this.determineObliqueSizeAndScanOrientation(baseAxis, center, angle, pixelSize);

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

	/**
	 * ミリメートルベース
	 */
	public mmGetDimension(){
		if (!this.size) throw new Error('Dimension not set');
		if (!this.voxelSize) throw new Error('voxel size not set');
		
		return [
			this.size[0] * this.voxelSize[0],
			this.size[1] * this.voxelSize[1],
			this.size[2] * this.voxelSize[2],
		];
	}
	public mmReadPixelAt( mm_x: number, mm_y: number, mm_z: number ): number {
		
		if( mm_x < 0.0 || mm_y < 0.0 || mm_z < 0.0 ) return null;
		
		let [ ix, iy, iz ] = [ Math.floor( mm_x / this.voxelSize[0] ), Math.floor( mm_y / this.voxelSize[1] ), Math.floor( mm_z / this.voxelSize[2] ) ];
		if( this.size[0] <= ix || this.size[1] <= iy || this.size[2] <= iz ) return null;
		
		return this.read( ( iz * this.size[1] + iy ) * this.size[0] + ix );
	}
	// public mmReadPixelWithInterporationAt( mm_x: number, mm_y: number, mm_z: number ): number {
	// }
	
	public mmIndexAt( mm_x: number, mm_y: number, mm_z: number ): Vector3D {
		if( mm_x < 0.0 || mm_y < 0.0 || mm_z < 0.0 ) return null;
		
		let [ ix, iy, iz ] = [ Math.floor( mm_x / this.voxelSize[0] ), Math.floor( mm_y / this.voxelSize[1] ), Math.floor( mm_z / this.voxelSize[2] ) ];
		if( this.size[0] <= ix || this.size[1] <= iy || this.size[2] <= iz ) return null;
		
		return [ ix, iy, iz ];
	}
	
	public mmWritePixelAt( value: number, mm_x: number, mm_y: number, mm_z: number ): boolean {
		if( mm_x < 0.0 || mm_y < 0.0 || mm_z < 0.0 ) return false;
		
		let [ ix, iy, iz ] = [ Math.floor( mm_x / this.voxelSize[0] ), Math.floor( mm_y / this.voxelSize[1] ), Math.floor( mm_z / this.voxelSize[2] ) ];
		if( this.size[0] <= ix || this.size[1] <= iy || this.size[2] <= iz ) return false;
		
		this.write( value, ( iz * this.size[1] + iy ) * this.size[0] + ix );
		
		return true;
	}
	
	public mmGetSection(
		mm_origin: Vector3D,
		mm_u: Vector3D,
		mm_v: Vector3D,
		resolution: Vector2D
	): RawDataSection {

		let [mm_o_x, mm_o_y, mm_o_z] = mm_origin;
		let [mm_u_w, mm_u_h, mm_u_d] = mm_u;
		let [mm_v_w, mm_v_h, mm_v_d] = mm_v;
		
		/**
		 * prepare step
		 */
		let u_count = resolution[0];
		let [ mm_u_step_w, mm_u_step_h, mm_u_step_d ] = [ mm_u_w / u_count, mm_u_h / u_count, mm_u_d / u_count ];

		let v_count = resolution[1];
		let [ mm_v_step_w, mm_v_step_h, mm_v_step_d ] = [ mm_v_w / v_count, mm_v_h / v_count, mm_v_d / v_count ];
		
		// -
		
		let section = new RawDataSection( u_count, v_count, this.pixelFormat );
		let offset = 0;
		let [ mm_v_walker_x, mm_v_walker_y, mm_v_walker_z ] = mm_origin;
		for( let j = 0; j < v_count; j++ ){
			let [ mm_u_walker_x, mm_u_walker_y, mm_u_walker_z ] = [ mm_v_walker_x, mm_v_walker_y, mm_v_walker_z ];
			for( let i = 0; i < u_count; i++ ){
				let value = this.mmReadPixelAt( mm_u_walker_x, mm_u_walker_y, mm_u_walker_z );
				if( value !== null ){
					section.write( offset, value );
				}
				offset++;
				mm_u_walker_x += mm_u_step_w;
				mm_u_walker_y += mm_u_step_h;
				mm_u_walker_z += mm_u_step_d;
			}
			mm_v_walker_x += mm_v_step_w;
			mm_v_walker_y += mm_v_step_h;
			mm_v_walker_z += mm_v_step_d;
		}
		
		return section;
		// return section.data: ArrayBuffer; ... otherwise ... ?
	}
	
	public mmGetSectionMap(
		mm_origin: Vector3D,
		mm_u: Vector3D,
		mm_v: Vector3D,
		resolution: Vector2D
	): RawDataSectionMap {

		let [mm_o_x, mm_o_y, mm_o_z] = mm_origin;
		let [mm_u_w, mm_u_h, mm_u_d] = mm_u;
		let [mm_v_w, mm_v_h, mm_v_d] = mm_v;
		
		/**
		 * prepare step
		 */
		let u_count = resolution[0];
		let [ mm_u_step_w, mm_u_step_h, mm_u_step_d ] = [ mm_u_w / u_count, mm_u_h / u_count, mm_u_d / u_count ];

		let v_count = resolution[1];
		let [ mm_v_step_w, mm_v_step_h, mm_v_step_d ] = [ mm_v_w / v_count, mm_v_h / v_count, mm_v_d / v_count ];
		
		// -
		
		let sectionMap = new RawDataSectionMap( u_count, v_count );
		let offset = 0;
		let [ mm_v_walker_x, mm_v_walker_y, mm_v_walker_z ] = mm_origin;
		for( let j = 0; j < v_count; j++ ){
			let [ mm_u_walker_x, mm_u_walker_y, mm_u_walker_z ] = [ mm_v_walker_x, mm_v_walker_y, mm_v_walker_z ];
			for( let i = 0; i < u_count; i++ ){
				let value = this.mmReadPixelAt( mm_u_walker_x, mm_u_walker_y, mm_u_walker_z );
				let [ix, iy, iz] = this.mmIndexAt( mm_u_walker_x, mm_u_walker_y, mm_u_walker_z );
				sectionMap.write( offset, value === null ? null : [ix, iy, iz] );
				offset++;
				mm_u_walker_x += mm_u_step_w;
				mm_u_walker_y += mm_u_step_h;
				mm_u_walker_z += mm_u_step_d;
			}
			mm_v_walker_x += mm_v_step_w;
			mm_v_walker_y += mm_v_step_h;
			mm_v_walker_z += mm_v_step_d;
		}
		
		return sectionMap;
	}
}
export class RawDataSectionMap {

	public width: number;
	public height: number;
	private view: {[offset: number]: number};
	
	private v_null: number = 0;
	private x_mask: number = 0;
	private y_mask: number = 0;
	private z_mask: number = 0;
	
	constructor( width: number, height: number ){
		this.width = width;
		this.height = height;
		this.view = new Uint32Array( width * height );
		
		this.x_mask = parseInt('00000000000000000000011111111110', 2);
		this.y_mask = parseInt('00000000000111111111100000000000', 2);
		this.z_mask = parseInt('01111111111000000000000000000000', 2);
	};

	/**
	 * フォーマット
	 * -------------------------------------
	 * 0		(1bit)	: not null フラグ
	 * 1-10		(10bit)	: x座標 (最大 1023)
	 * 11-20	(10bit)	: y座標 (最大 1023)
	 * 21-30	(10bit)	: z座標 (最大 1023)
	 */
	
	private pack( x: number, y: number, z: number ): number {
		if( x < 0 || 1023 < x || y < 0 || 1023 < y || z < 0 || 1023 < z ) throw new Error('Out of range');
		return 1 | ( x << 1 ) | ( y << 11 ) | ( z << 21 );
	}
	private unpack( value: number ){
		if( value === this.v_null ) return null;
		return [
			( value & this.x_mask ) >> 1 ,
			( value & this.y_mask ) >> 11 ,
			( value & this.z_mask ) >> 21
		];
	}
	
	public write( offset:number, p: [ number, number, number ] ){
		this.view[ offset ] = p === null ? this.v_null : this.pack( p[0], p[1], p[2] );
	}
	// public set( [x,y], [ x,y,z] );
	public get( x: number, y: number ){
		if( 0 <= x && x < this.width && 0 <= y && y < this.height ){
			let offset = y * this.width + x;
			let v = this.view[ offset ];
			return this.unpack( v );
		}else{
			return null;
		}
	}
	
}