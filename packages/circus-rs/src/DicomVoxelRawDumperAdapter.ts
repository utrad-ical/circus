/**
 * DICOM Dumper (using dicom_voxel_dumper)
 */

var exec = require('child_process').exec;

import PathResolver from './path-resolver/PathResolver';
import DicomRawDumper from './DicomRawDumper';
import logger from './Logger';

export default class DicomVoxelDumperAdapter extends DicomRawDumper {

	private resolver: PathResolver;

	constructor(config: any) {
		super(config);

		var resolverClass = require('./path-resolver/' + config.pathResolver.module);
		this.resolver = new resolverClass(config.pathResolver.options);
	}

	public dump(series: string, config: any, callback: (data: any) => void): void
	{
		this.resolver.resolvePath(series).then((dcmdir: string) => {
			var command = this.config.dumper.options.dumper + ' combined --input-path="' + dcmdir + '" --stdout';
			var proc = exec(command, {encoding: 'binary', maxBuffer: this.config.bufferSize}, null);

			proc.stderr.on('data', (data) => {
				logger.error(data);
			});

			callback(proc.stdout);
		}).catch((err) => {
			callback(null);
			return;
		});

	}
}
