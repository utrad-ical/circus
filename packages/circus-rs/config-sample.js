var config = {
	// path resolver module name and configurations
	pathResolver: {
		module: 'StaticPathResolver',
		options: {
			dataDir: '<path_to_dcm_folder>',
			useHash: false
		}
	},

	/* OR:
	pathResolver: {
		module: 'CircusDbPathResolver',
		options: {
	 		// full path of configuration file for MongoDB connection settings
			configPath: '<path_to_mongo_settings_json_file>'
		}
	},
	*/

	// log configuration. See nomiddlename/log4js-node.
	logs: [{
			type: 'datefile',
			filename: __dirname + '/logs/debug.log',
			pattern: '-yyyyMMdd.log'
		}
	],

    dumper: {
		module: 'DicomVoxelDumperAdapter',
		options: {
	    	// path for DICOM data dumper tool.
			dumper: '<path_to_"dicom_voxel_dump"_executable_file>',
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
	/* OR:
	mpr: {
		options: {
			pngWriter: 'PNGWriter_nodepng',
			pngWriterOptions: {}
		}
	},
	*/

	cache: {
        /*
    	 * threshold: upper limit of heap memory size. (in bytes)
	     *		When object added, cached object will remove to keep threshold.
	     *		So this threshold is not strictly.
         */
        memoryThreshold: 2 * 1024 * 1024 * 1024
	},


	// server port number
	port: 3000

};

module.exports = config;
