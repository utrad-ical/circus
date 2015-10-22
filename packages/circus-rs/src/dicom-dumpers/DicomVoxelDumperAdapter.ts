/**
 * DICOM Dumper (using dicom_voxel_dumper)
 */

import child_process = require('child_process');
var exec = child_process.exec;
import fs = require('fs');

import logger from '../Logger';

import DicomDumper from './DicomDumper';
import RawData from '../RawData';
import DicomVolume from './../DicomVolume';
import Promise = require('bluebird');

const GLOBAL_HEADER = -1;
const GLOBAL_FOOTER = -2;

export default class DicomVoxelDumperAdapter extends DicomDumper {

	public readDicom(dcmdir: string): Promise<DicomVolume> {
		return new Promise<DicomVolume>((resolve, reject) => {
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
	public addBlock(volume: DicomVolume, jsonSize: number, binarySize: number, data: Buffer) {
		var jsonData = data.toString('utf8', 0, jsonSize);

		var json = JSON.parse(jsonData);

		//console.log('json size=' + jsonSize);
		//console.log('binary size=' + binarySize);

		if (binarySize == GLOBAL_HEADER) {
			volume.appendHeader(json);
			volume.setDimension(json.width, json.height, json.depth, json.dataType);
		} else if (binarySize == GLOBAL_FOOTER) {
			volume.appendHeader(json);
			volume.setVoxelDimension(json.voxelWidth, json.voxelHeight, json.voxelDepth);
			volume.setEstimatedWindow(json.estimatedWindowLevel, json.estimatedWindowWidth);
		} else if (binarySize > 0) {
			//console.log('image block: ' + json.instanceNumber + ' size:' + binarySize + ' raw:' + data.length);
			if (json.success) {
				var voxelData = new Buffer(binarySize);
				data.copy(voxelData, 0, jsonSize);
				volume.insertSingleImage(json.instanceNumber - 1, voxelData);

				if (typeof json.windowLevel != "undefined" && volume.dcm_wl == null) {
					volume.dcm_wl = json.windowLevel;
				}
				if (typeof json.windowWidth != "undefined" && volume.dcm_ww == null) {
					volume.dcm_ww = json.windowWidth;
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
		var volume = new DicomVolume();

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

					this.addBlock(volume, jsonLength, binaryLength, blockData);

					headerBuffer = new Buffer(HEADER_LENGTH);
					headerBufferOffset = 0;
					jsonLength = 0;
					binaryLength = 0;

					blockData = null;
					blockDataSize = 0;
					blockDataOffset = 0;
				}
			} catch (e) {
				volume = null;
				reject(e);
			}
		});

		proc.stdout.on('end', () => {
			if (volume !== null && volume.getDimension()[2] > 0) {
				resolve(volume);
			} else {
				reject('Could not read image data');
			}
		});

	}
}
