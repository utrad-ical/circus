/**
 * DICOM Dumper (using dicom_voxel_dumper)
 */

var exec = require('child_process').exec;

import PathResolver = require('./path-resolver/PathResolver');
import DicomRawDumper = require('./DicomRawDumper');
import logger = require('./Logger');

export = DicomVoxelDumperAdapter;

class DicomVoxelDumperAdapter extends DicomRawDumper {

	private resolver: PathResolver;

	/**
	 * Constructor
	 */
	constructor(config: any) {
		super(config);

		var resolverClass = require('./path-resolver/' + config.pathResolver.module);
		this.resolver = new resolverClass(config.pathResolver.options);
	}

	public dump(series: string, config: any, callback: (data: any) => void): void
	{
		this.resolver.resolvePath(series, (dcmdir: string) => {
			if (!dcmdir) {
				callback(null);
				return;
			}

			var command = this.config.dumper.options.dumper + ' combined --input-path="' + dcmdir + '" --stdout';
			var proc = exec(command, {encoding: 'binary', maxBuffer: this.config.bufferSize}, null);

			proc.stderr.on('data', (data) => {
				logger.error(data);
			});

			callback(proc.stdout);
		});


	}
}
