var config = {
	// path resolver module name and configurations
	pathResolver: {
		module: 'CircusDbPathResolver',
		options: {
			dataDir: 'C:\\circus_db_data\\dicom_storage',
			configPath: 'C:\\CIRCUS-DB\\circus_db_web_ui\\app\\config\\db_config.json'
		}
	},

	// log configuration. See nomiddlename/log4js-node.
	logs: [{
		type: 'dateFile',
		filename: __dirname + '/logs/debug.log',
		pattern: '-yyyyMMdd.log'
	}],

	// server port number
	port: 3000,

	// stdout buffer size
	bufferSize: 512 * 512 * 1024,

	dumper: {
		module: 'DicomVoxelDumperAdapter',
		options: {
			// path for DICOM data dumper tool.
			dumper: 'C:\\CIRCUS-DB\\circus_db_web_ui\\app\\bin\\dicom_voxel_dump.exe',
			// stdout buffer size
			bufferSize: 512 * 512 * 1024
		}
	},

	// MPR module configurations.
	mpr: {
		options: {
			pngWriter: 'PNGWriter_pngjs',
			pngWriterOptions: {}
		}
	},

	cache: {
		/*
		 * threshold: upper limit of heap memory size. (in bytes)
		 *		When object added, cached object will remove to keep threshold.
		 *		So this threshold is not strictly.
		 */
		memoryThreshold: 2 * 1024 * 1024 * 1024
	},


};

module.exports = config;
