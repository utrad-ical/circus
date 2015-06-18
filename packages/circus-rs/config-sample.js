var config = {
	// path resolver module name and configurations
	pathResolver: {
		module: 'StaticPathResolver',
		options: {
			dataDir: '<path_to_dcm_folder>',
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

	// path for DICOM data dumper tool.
	dumper: 'C:\\CIRCUS-DB\\circus_db_web_ui\\app\\bin\\dicom_voxel_dump.exe',

	// server port number
	port: 3000,

	// stdout buffer size
	bufferSize: 512 * 512 * 1024
};

module.exports = config;
