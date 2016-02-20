/**
 * DICOM Dumper (using dicom_voxel_dumper)
 */

import { exec } from 'child_process';
import * as fs from 'fs';

import logger from '../Logger';

import DicomDumper from './DicomDumper';
import DicomVolume from '../../common/DicomVolume';
import { Promise } from 'es6-promise';

const GLOBAL_HEADER = -1;
const GLOBAL_FOOTER = -2;

export default class DicomVoxelDumperAdapter extends DicomDumper {

	public readDicom(dcmdir: string): Promise<DicomVolume> {
		return new Promise<DicomVolume>((resolve, reject) => {
			this.readDicomDeferred(dcmdir, resolve, reject);
		});
	}

	/**
	 * Checks if this machine (server) is using the little endian
	 * for 16-bit integers.
	 */
	protected isLittleEndian(): boolean {
		let ab = new ArrayBuffer(2);
		let i8 = new Int8Array(ab);
		let i16 = new Uint16Array(ab);
		i8[0] = 0xA1;
		i8[1] = 0xB2;
		return (i16[0] === 0xB2A1);
	}

	protected initialize(): void {
		if (!('dumper' in this.config)) {
			throw new Error('Dumper is not specified.');
		}
		logger.info('Checking dumper executable: ' + this.config.dumper);
		try {
			fs.statSync(this.config.dumper);
		} catch (err) {
			throw new Error('The path to the dumper is incorrect.');
		}
		if (!this.isLittleEndian()) {
			throw new Error('The server machine is not using little endian.');
		}
	}

	/**
	 * Buffer data: block data in dcm_voxel_dump combined format
	 */
	public addBlock(volume: DicomVolume, jsonSize: number, binarySize: number, data: Buffer): void {
		let jsonData = data.toString('utf8', 0, jsonSize);

		let json = JSON.parse(jsonData);

		if (binarySize === GLOBAL_HEADER) {
			volume.appendHeader(json);
			volume.setDimension(json.width, json.height, json.depth, json.dataType);
		} else if (binarySize === GLOBAL_FOOTER) {
			volume.appendHeader(json);
			volume.setVoxelDimension(json.voxelWidth, json.voxelHeight, json.voxelDepth);
			volume.setEstimatedWindow(json.estimatedWindowLevel, json.estimatedWindowWidth);
		} else if (binarySize > 0) {
			if (json.success) {
				let voxelData = new Uint8Array(binarySize);
				let binaryOffset = jsonSize;
				for (let i = 0; i < binarySize; i++) {
					voxelData[i] = data.readUInt8(binaryOffset + i);
				}
				volume.insertSingleImage(json.instanceNumber - 1, voxelData.buffer);

				if (typeof json.windowLevel !== 'undefined' && volume.dcm_wl == null) {
					volume.dcm_wl = json.windowLevel;
				}
				if (typeof json.windowWidth !== 'undefined' && volume.dcm_ww == null) {
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

	private readDicomDeferred(dcmdir: string, resolve, reject): void {
		let volume = new DicomVolume();

		let jsonLength = 0;
		let binaryLength = 0;

		let blockData: Buffer;
		let blockDataOffset: number = 0;
		let blockDataSize: number;

		const HEADER_LENGTH = 8;

		let headerBuffer = new Buffer(HEADER_LENGTH);
		let headerBufferOffset = 0;

		let command = this.config.dumper + ' combined --input-path="' + dcmdir + '" --stdout';
		let proc = exec(command, {encoding: 'binary', maxBuffer: this.config.bufferSize}, null);

		proc.stderr.on('data', (data) => {
			reject(data);
			logger.error('Error: ' + data);
		});

		proc.stdout.on('data', (chunk: string) => {
			try {

				while (chunk.length > 0) {

					let len: number;

					if (!blockData && jsonLength === 0 && binaryLength === 0) {
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
					}

					len = blockDataSize - blockDataOffset;
					if (chunk.length < len) {
						len = chunk.length;
					}

					blockData.write(chunk, blockDataOffset, len, 'binary');
					blockDataOffset += len;
					chunk = chunk.slice(len);

					if (blockDataOffset < blockDataSize) {
						return;
					}

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
