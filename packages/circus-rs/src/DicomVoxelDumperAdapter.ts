/**
 * DICOM Dumper (using dicom_voxel_dumper)
 */

import child_process = require('child_process');
var exec = child_process.exec;
import fs = require('fs');

import logger from './Logger';

import DicomDumper from './DicomDumper';
import RawData from './RawData';
import Promise = require('bluebird');

const GLOBAL_HEADER = -1;
const GLOBAL_FOOTER = -2;

export default class DicomVoxelDumperAdapter extends DicomDumper {

	public readDicom(dcmdir: string): Promise<RawData> {
		return new Promise<RawData>((resolve, reject) => {
			this.readDicomDeferred(dcmdir, resolve, reject);
		})
	}

	protected initialize() {
		if (!('dumper' in this.config)) {
			throw new Error("Dumper is not specified.");
		}
		logger.info('Checking dumper executable: ' + this.config.dumper);
		if (!fs.existsSync(this.config.dumper)) {
			throw new Error("The path to the dumper is incorrect.");
		}
	}

	/**
	 * Buffer data: block data in dcm_voxel_dump combined format
	 */
	public addBlock(raw: RawData, jsonSize: number, binarySize: number, data: Buffer) {
		var jsonData = data.toString('utf8', 0, jsonSize);

		var json = JSON.parse(jsonData);

		//console.log('json size=' + jsonSize);
		//console.log('binary size=' + binarySize);

		if (binarySize == GLOBAL_HEADER) {
			raw.appendHeader(json);
			raw.setDimension(json.width, json.height, json.depth, json.dataType);
		} else if (binarySize == GLOBAL_FOOTER) {
			raw.appendHeader(json);
			raw.setVoxelDimension(json.voxelWidth, json.voxelHeight, json.voxelDepth);
			raw.setEstimatedWindow(json.estimatedWindowLevel, json.estimatedWindowWidth);
		} else if (binarySize > 0) {
			//console.log('image block: ' + json.instanceNumber + ' size:' + binarySize + ' raw:' + data.length);
			if (json.success) {
				var voxelData = new Buffer(binarySize);
				data.copy(voxelData, 0, jsonSize);
				raw.insertSingleImage(json.instanceNumber - 1, voxelData);

				if (typeof json.windowLevel != "undefined" && raw.dcm_wl == null) {
					raw.dcm_wl = json.windowLevel;
				}
				if (typeof json.windowWidth != "undefined" && raw.dcm_ww == null) {
					raw.dcm_ww = json.windowWidth;
				}
			} else {
				logger.warn(json.errorMessage);
			}
		} else {
			// binarySize is 0. read failed.
			logger.warn(json.errorMessage);
		}
	}


	private readDicomDeferred(dcmdir: string, resolve, reject) {
		var rawData = new RawData();

		var jsonLength = 0;
		var binaryLength = 0;

		var blockData: Buffer;
		var blockDataOffset: number = 0;
		var blockDataSize: number;

		const HEADER_LENGTH = 8;

		var headerBuffer = new Buffer(HEADER_LENGTH);
		var headerBufferOffset = 0;

		var command = this.config.dumper + ' combined --input-path="' + dcmdir + '" --stdout';
		var proc = exec(command, {encoding: 'binary', maxBuffer: this.config.bufferSize}, null);

		proc.stderr.on('data', (data) => {
			reject(data);
			logger.error('Error: ' + data);
		});

		proc.stdout.on('data', (chunk: string) => {
			try {

				while (chunk.length > 0) {

					var len: number;

					if (!blockData && jsonLength == 0 && binaryLength == 0) {
						//console.log('no block');

						// block buffer is null
						len = HEADER_LENGTH - headerBufferOffset;
						if (chunk.length < len) {
							len = chunk.length;
						}
						headerBuffer.write(chunk, 0, len, 'binary');
						headerBufferOffset += len;
						if (headerBufferOffset < HEADER_LENGTH) {
							return;
						}

						chunk = chunk.slice(len);

						jsonLength = headerBuffer.readInt32LE(0);
						binaryLength = headerBuffer.readInt32LE(4);

						blockDataSize = jsonLength + ((binaryLength < 0) ? 0 : binaryLength);

						blockData = new Buffer(blockDataSize);
						blockDataOffset = 0;
						//console.log('header read.');
					}

					len = blockDataSize - blockDataOffset;
					if (chunk.length < len) {
						len = chunk.length;
					}

					//console.log('write: offset:'+blockDataOffset+' len:'+len);
					blockData.write(chunk, blockDataOffset, len, 'binary');
					blockDataOffset += len;
					chunk = chunk.slice(len);

					if (blockDataOffset < blockDataSize) {
						return;
					}

					//console.log('block read. size=' + blockDataOffset + '/' + blockDataSize);

					this.addBlock(rawData, jsonLength, binaryLength, blockData);

					headerBuffer = new Buffer(HEADER_LENGTH);
					headerBufferOffset = 0;
					jsonLength = 0;
					binaryLength = 0;

					blockData = null;
					blockDataSize = 0;
					blockDataOffset = 0;
				}
			} catch (e) {
				rawData = null;
				reject(e);
			}
		});

		proc.stdout.on('end', () => {
			if (rawData !== null && rawData.x > 0 && rawData.y > 0 && rawData.z > 0) {
				resolve(rawData);
			} else {
				reject('Could not read image data');
			}
		});

	}
}
