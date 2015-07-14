/**
 * DICOM Dumper (using dicom_voxel_dumper)
 */

var exec = require('child_process').exec;

import Logger = require('./Logger');
var logger = Logger.prepareLogger();

import DicomDumper = require('./DicomDumper');
import RawData = require('./RawData');

export = DicomVoxelDumperAdapter;

class DicomVoxelDumperAdapter extends DicomDumper {

	public readDicom(dcmdir: string, config: any, callback: (rawData: RawData) => void): void
	{
		var rawData = new RawData();

		var jsonLength = 0;
		var binaryLength = 0;

		var blockData;
		var blockDataOffset = 0;
		var blockDataSize;

		var HEADER_LENGTH = 8;

		var headerBuffer = new Buffer(HEADER_LENGTH);
		var headerBufferOffset = 0;

		var command = this.config.dumper + ' combined --input-path="' + dcmdir + '" --stdout';
		var proc = exec(command, {encoding: 'binary', maxBuffer: this.config.bufferSize}, null);

		proc.stderr.on('data', (data) => {
			logger.error('stderr:' + data);
		});

		proc.stdout.on('data', function (chunk) {

			try {

				while(chunk.length > 0) {

					var len;

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

					rawData.addBlock(jsonLength, binaryLength, blockData);

					headerBuffer = new Buffer(HEADER_LENGTH)
					headerBufferOffset = 0;
					jsonLength = 0;
					binaryLength = 0;

					blockData = null;
					blockDataSize = 0;
					blockDataOffset = 0;
				}
			} catch(e) {
				console.log(e);
				rawData = null;
			}

		});

		proc.stdout.on('end', () => {
			callback(rawData);
		});


	}
}
