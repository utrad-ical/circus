/**
 * DICOM series image data class.
 */

import Logger = require('./Logger');
var logger = Logger.prepareLogger();

export = RawData;

class RawData {
	public x: number = 1;
	public y: number = 1;
	public z: number = 1;
	public type: number = -1;
	public vx: number = 1;
	public vy: number = 1;
	public vz: number = 1;
	public wl: number = 1500;
	public ww: number = 2000;
	public dcm_wl: number;
	public dcm_ww: number;
	private header: any;
	private data: any[];
	private dataFlag: boolean[];

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
			case 0:
				return this.data[z].readUInt8(offset);
			case 1:
				return this.data[z].readInt8(offset);
			case 2:
				return this.data[z].readUInt16LE(offset * 2);
			case 3:
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
			ix = x_end - 1;
		}

		if (iy >= y_end) {
			iy = y_end - 1;
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
			case 0:
				p0 = buf.readUInt8(ix   + iy   * this.x);
				p1 = buf.readUInt8(ixp1 + iy   * this.x);
				p2 = buf.readUInt8(ix   + iyp1 * this.x);
				p3 = buf.readUInt8(ixp1 + iyp1 * this.x);
				break;
			case 1:
				p0 = buf.readInt8(ix   + iy   * this.x);
				p1 = buf.readInt8(ixp1 + iy   * this.x);
				p2 = buf.readInt8(ix   + iyp1 * this.x);
				p3 = buf.readInt8(ixp1 + iyp1 * this.x);
				break;
			case 2:
				p0 = buf.readUInt16LE((ix   + iy   * this.x) * 2);
				p1 = buf.readUInt16LE((ixp1 + iy   * this.x) * 2);
				p2 = buf.readUInt16LE((ix   + iyp1 * this.x) * 2);
				p3 = buf.readUInt16LE((ixp1 + iyp1 * this.x) * 2);
				break;
			case 3:
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

	/**
	 * set pixel dimension and allocate array.
	 */
	public setDimension(): void {
		this.x = this.header.width;
		this.y = this.header.height;
		this.z = this.header.depth;
		this.type = this.header.dataType;

		this.data = new Array(this.z);
		this.dataFlag = new Array(this.z);
	}

	/**
	 * set voxel dimension and window
	 */
	public setVoxelDimension(): void {
		this.vx = this.header.voxelWidth;
		this.vy = this.header.voxelHeight;
		this.vz = this.header.voxelDepth;
		this.wl = this.header.estimatedWindowLevel;
		this.ww = this.header.estimatedWindowWidth;
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


	/**
	 * Buffer data: block data in dcm_voxel_dump combined format
	 */
	public addBlock(jsonSize, binarySize, data) {
		var jsonData = data.toString('utf8', 0, jsonSize);
		var offset = jsonSize;

		var json = JSON.parse(jsonData);

		//console.log('json size=' + jsonSize);
		//console.log('binary size=' + binarySize);

		if (binarySize == -1) {
			//console.log('global header');
			//console.log(json);
			// global header
			this.header = json;
			this.setDimension();

		} else if (binarySize == -2) {
			//console.log('global footer');
			// global footer
			//console.log(json);
			if (this.header) {
				for (var key in json) {
					this.header[key] = json[key];
				}
			} else {
				this.header = json;
			}
			this.setVoxelDimension();
		} else if (binarySize > 0) {
			//console.log('image block: ' + json.instanceNumber + ' size:' + binarySize + ' raw:' + data.length);
			if (json.success) {
				var voxelData = new Buffer(binarySize);
				data.copy(voxelData, 0, jsonSize);
				this.data[json.instanceNumber - 1] = voxelData;
				this.dataFlag[json.instanceNumber - 1] = true;

				if (typeof json.windowLevel != "undefined" && this.dcm_wl == null) {
					this.dcm_wl = json.windowLevel;
				}
				if (typeof json.windowWidth != "undefined" && this.dcm_ww == null) {
					this.dcm_ww = json.windowWidth;
				}

				//console.log('image size: ' + voxelData.length);
			} else {
				logger.warn(json.errorMessage);
			}
		} else {
			// binarySize is 0. read failed.
			logger.warn(json.errorMessage);
		}
	}
}

