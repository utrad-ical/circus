// Raw voxel container class

import { MultiRange } from 'multi-integer-range';
import { Promise } from 'es6-promise';

import { PixelFormat, PixelFormatInfo, pixelFormatInfo } from './PixelFormat';

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
	 * Medium quality interpolation.
	 * @param x {floating point} x-coordinate
	 * @param y {floating point} y-coordinate
	 * @param z {floating point} z-coordinate
	 * @return n {number} Corresponding voxel value.
	 */
	public getPixelWithInterpolation(x: number, y: number, z: number): number {
		//check value
		let x_end = this.size[0] - 1;
		let y_end = this.size[1] - 1;
		let z_end = this.size[2] - 1;
		if (x < 0.0 || y < 0.0 || z < 0.0 || x > x_end || y > y_end || z > z_end) {
			return 0;
		}

		//fix value for "EDGE" of image
		let iz = Math.floor(z);//iz: int z
		if (iz >= z_end) {
			iz = z_end - 1;
			z = z_end;
		}
		let ix = Math.floor(x);//ix: int x
		if (ix >= x_end) {
			ix = x_end - 1;
			x = x_end;
		}
		let iy = Math.floor(y);//iy: int y
		if (iy >= y_end) {
			iy = y_end - 1;
			y = y_end;
		}

		//calc "WEIGHT" of voxel and determine final voxel value.
		let value_z1 = this.getAxialInterpolation(ix, x, iy, y, iz);
		let value_z2 = this.getAxialInterpolation(ix, x, iy, y, iz + 1);
		let weight_z2 = z - iz;
		let weight_z1 = 1.0 - weight_z2;
		return value_z1 * weight_z1 + value_z2 * weight_z2;
	}

	/**
	 * get axis interpolation
	 * @protected
	 * @param ix {number}
	 * @param x {number}
	 * @param iy {number}
	 * @param u {number}
	 * @param intz {number}
	 * @return n {number}
	 */
	protected getAxialInterpolation(ix: number, x: number, iy: number, y: number, intz: number): number {
		let ixp1 = ix + 1;//int x plus 1
		let iyp1 = iy + 1;//int y plus 1

		// p0 p1
		// p2 p3
		let rx = this.size[0];
		let offset = rx * this.size[1] * intz;//calc "VOLUME" : x*y*z | this is used as basic offset.
		//get 4 voxel value around offset voxel.
		let p0 = this.read(offset + ix + iy * rx);
		let p1 = this.read(offset + ixp1 + iy * rx);
		let p2 = this.read(offset + ix + iyp1 * rx);
		let p3 = this.read(offset + ixp1 + iyp1 * rx);

		//calc "WEIGHT" of voxel and determine final voxel value.
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
		//check dimension
		if (!this.size) {
			throw new Error('Dimension not set');
		}

		let [rx, ry, rz] = this.size;
		//check z argument
		if (z < 0 || z >= rz) {
			throw new RangeError('z-index out of bounds');
		}

		//image size check
		if (rx * ry * this.bpp > imageData.byteLength) {
			throw new Error('Not enough buffer length');
		}

		let len = rx * ry * this.bpp;//len:byte of surface
		let offset = len * z;//calc "VOLUME". this is used as offset

		let src = new Uint8Array(imageData, 0, len);//imageData can be smaller than len
		let dst = new Uint8Array(this.data, offset, len);//determine public area with offset and len
		dst.set(src);//overwrite
		this.loadedSlices.append(z);
	}

	/**
	 * Get single image by z.
	 * @param z {number} z-coordinate
	 * @return arraybuffer {ArrayBuffer} image data
	 */
	public getSingleImage(z: number): ArrayBuffer {
		//check size
		if (!this.size) {
			throw new Error('Dimension not set');
		}

		let [rx, ry, rz] = this.size;
		//validate z value
		if (z < 0 || z >= rz) {
			throw new RangeError('z-index out of bounds');
		}

		let len = rx * ry * this.bpp;//bpp:byte per voxel. calc surface byte
		let offset = len * z;//calc "VOLUNE". this is used as offset
		let src = new Uint8Array(this.data, offset, len);//data:Actual image data (full voxel data)
			//determine public area with offset and len
		let buffer = new ArrayBuffer(len);
		(new Uint8Array(buffer)).set(src);//extract 2d image data
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
		//validate section
		if (x <= 0 || y <= 0 || z <= 0) {
			throw new Error('Invalid volume size.');
		}
		if (this.size) {
			throw new Error('Dimension already fixed.');
		}
		if (x * y * z > 1024 * 1024 * 1024) {
			throw new Error('Maximum voxel limit exceeded.');
		}
		if (type === PixelFormat.Binary && (x * y) % 8 !== 0) {//image area must be multiple of 8
			throw new Error('Number of pixels in a slice must be a multiple of 8.');
		}

		this.size = [x, y, z];//Vector3D
		this.pixelFormat = type;

		//getPixelFormatInfo returns PixelFormatInfo
		this.bpp = this.getPixelFormatInfo(this.pixelFormat).bpp;//byte per voxel
		this.data = new ArrayBuffer(x * y * z * this.bpp);//allocate data area

		//set read and write function
		this.read = pos => this.view[pos];//view:array view.
		this.write = (value, pos) => this.view[pos] = value;//Set "Action" to write

		switch (type) {//set view by type
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
				this.read = pos => (this.view[pos >> 3] >> (7 - pos % 8)) & 1;//Re-set function
				this.write = (value, pos) => {//Re-set "Action"
					let cur = this.view[pos >> 3];//???
					cur ^= (-value ^ cur) & (1 << (7 - pos % 8)); // set n-th bit to value
					this.view[pos >> 3] = cur;
				};
				break;
			default:
				throw new RangeError('Invalid pixel format');
		}
		this.bpp = this.getPixelFormatInfo().bpp;//byte per voxel
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
	 * Applies window level/width. level:brightness?
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
	 * @param azeis {string}
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
			if (this.loadedSlices.length() !== rz)//loadedSlices:MultiRange
				throw new ReferenceError('Volume is not fully loaded to construct this MPR');
		};

		switch (axis) {
			case 'sagittal':
				checkZranges();
				image = new Uint8Array(ry * rz);
				for (let z = 0; z < rz; z++)
					for (let y = 0; y < ry; y++)//write data to image one by one...
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
	 * @param sy {number}
	 * @param dx {number}
	 * @param dy {number}
	 * @param mx {number}
	 * @param my {number}
	 * @return object {{ count: number, px: number, py: number}}
	 */
	protected walkUntilObliqueBounds(
		centerX: number,//step? center x
		centerY: number,//center y
		microX: number,//micro unit of x
		microY: number,//micro unit of y
		voxelX: number,//m??? voxel size x
		voxelY: number//voxel size y
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
	 * If windowWidth/Level is given, output image must be an Uint8Array.
	 * Otherwise, the output image must have the same pixel format as the
	 * source volume data.
	 * @protected
	 * @param origin {Vector3D}
	 * @param eu {Vector3D}
	 * @param ev {Vector3D}
	 * @param outSize {Vector2D}
	 * @param image {{[index: number]: number}} uint8array
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
	 * ???
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
		let [rx, ry, rz] = this.size;//Vector3D
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
	 * @param alpha {number} angle?
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
		let pixelSize = Math.min(vx, vy, vz);//min of voxel

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
	
}
