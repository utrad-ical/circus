/**
 * DICOM series image data class.
 */

const enum PixelFormat {
	Unknown = -1,
	UInt8 = 0,
	Int8 = 1,
	UInt16 = 2,
	Int16 = 3
}

export default class RawData {
	// Number of voxels
	public x: number = 0;
	public y: number = 0;
	public z: number = 0;

	public type: PixelFormat = PixelFormat.Unknown;

	// Voxel size [mm]
	public vx: number = 1;
	public vy: number = 1;
	public vz: number = 1;

	// Estimated window, calculated from the actual voxel data
	public wl: number = 1500;
	public ww: number = 2000;

	// Default window, described in DICOM file
	public dcm_wl: number;
	public dcm_ww: number;

	// Holds DICOM header data
	protected header: any = {};

	// Actual image data
	protected data: Buffer[];
	protected dataFlag: boolean[];

	/**
	 * get pixel value
	 *
	 * z: series image number(0 based)
	 * offset: pixel position (y * width + x)
	 */
	public getPixel(z: number, offset: number): number {
		if (!this.dataFlag[z]) {
			return 0;
		}

		switch (this.type) {
			case PixelFormat.UInt8:
				return this.data[z].readUInt8(offset);
			case PixelFormat.Int8:
				return this.data[z].readInt8(offset);
			case PixelFormat.UInt16:
				return this.data[z].readUInt16LE(offset * 2);
			case PixelFormat.Int16:
				return this.data[z].readInt16LE(offset * 2);
			default:
				return this.data[z].readInt16LE(offset * 2);
		}
	}

	/**
	 * get pixel value using bilinear interpolation (from axial axis)
	 *
	 * z: series image number(0 based)
	 * offset: pixel position (y * width + x)
	 */
	public getPixelFromAxialWithInterpolation(x: number, y: number, z: number): number {

		var ix = Math.floor(x);
		var iy = Math.floor(y);
		var iz = Math.floor(z);
		var x_end = this.x - 1;
		var y_end = this.y - 1;

		if (ix >= x_end) {
			ix = x_end - 1;  x = x_end;
		}

		if (iy >= y_end) {
			iy = y_end - 1;  y = y_end;
		}

		var ixp1 = ix + 1;
		var iyp1 = iy + 1;

		if (!this.dataFlag[iz]) {
			console.log("error");
			return 0;
		}

		var buf = this.data[iz];
		var p0 = 0;
		var p1 = 0;
		var p2 = 0;
		var p3 = 0;
		var weight_x2 = x - ix;
		var weight_x1 = 1.0 - weight_x2;
		var weight_y2 = y - iy;
		var weight_y1 = 1.0 - weight_y2;

		switch (this.type) {
			case PixelFormat.UInt8:
				p0 = buf.readUInt8(ix   + iy   * this.x);
				p1 = buf.readUInt8(ixp1 + iy   * this.x);
				p2 = buf.readUInt8(ix   + iyp1 * this.x);
				p3 = buf.readUInt8(ixp1 + iyp1 * this.x);
				break;
			case PixelFormat.Int8:
				p0 = buf.readInt8(ix   + iy   * this.x);
				p1 = buf.readInt8(ixp1 + iy   * this.x);
				p2 = buf.readInt8(ix   + iyp1 * this.x);
				p3 = buf.readInt8(ixp1 + iyp1 * this.x);
				break;
			case PixelFormat.UInt16:
				p0 = buf.readUInt16LE((ix   + iy   * this.x) * 2);
				p1 = buf.readUInt16LE((ixp1 + iy   * this.x) * 2);
				p2 = buf.readUInt16LE((ix   + iyp1 * this.x) * 2);
				p3 = buf.readUInt16LE((ixp1 + iyp1 * this.x) * 2);
				break;
			case PixelFormat.Int16:
			default:
				p0 = buf.readInt16LE((ix   + iy   * this.x) * 2);
				p1 = buf.readInt16LE((ixp1 + iy   * this.x) * 2);
				p2 = buf.readInt16LE((ix   + iyp1 * this.x) * 2);
				p3 = buf.readInt16LE((ixp1 + iyp1 * this.x) * 2);
				break;
		}

		var value_y1 = p0 * weight_x1 + p1 * weight_x2;
		var value_y2 = p2 * weight_x1 + p3 * weight_x2;
		return (value_y1 * weight_y1 + value_y2 * weight_y2);
	}

	public appendHeader(header: any): void {
		for (var key in header) {
			this.header[key] = header[key];
		}
	}

	public insertSingleImage(z: number, imageData: Buffer): void {
		this.data[z] = imageData;
		this.dataFlag[z] = true;
	}

	/**
	 * Set the size of this volume and allocate an array.
	 */
	public setDimension(x: number, y: number, z: number, type: PixelFormat): void {
		if (x <= 0 || y <= 0 || z <= 0) {
			throw new Error('Invalid volume size.');
		}
		this.x = x;
		this.y = y;
		this.z = z;
		this.type = type;
		this.data = new Array(z);
		this.dataFlag = new Array(z);
	}

	/**
	 * set voxel dimension and window
	 */
	public setVoxelDimension(width: number, height: number, depth: number): void {
		this.vx = width;
		this.vy = height;
		this.vz = depth;
	}

	public setEstimatedWindow(level: number, width: number): void {
		this.wl = level;
		this.ww = width;
	}

	public containImage(image: string): boolean {
		if (image == 'all') {
			for (var index = 0; index < this.dataFlag.length; index++) {
				if (!this.dataFlag[index]) {
					return false;
				}
			}
		} else {
			var ar = image.split(',').map(parseInt);

			var count = 0;
			var index = ar[0];
			while (count < ar[2]) {
				if (!this.dataFlag[index - 1]) {
					return false;
				}
				index += ar[1];
				count++;
			}
		}
		return true;
	}

	public get dataSize(): number {
		var bpp = (this.type == PixelFormat.Int8 || this.type == PixelFormat.UInt8) ? 1 : 2;
		return this.x * this.y * this.z * bpp;
	}

}

