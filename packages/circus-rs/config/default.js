/*
 * CIRCUS RS default configuration file
 *
 * ** DO NOT EDIT THIS FILE DIRECTLY! **
 * Instead, do one of the followings:
 * - Add a file named local.json in this directory
 * - Start the server with --config=<config-file-path>.
 */

var path = require('path');

module.exports = {
	// Path resolver settings.
	"dicomFileRepository": {
		"module": "StaticDicomFileRepository",
		"options": {
			// Path to DICOM filter
			"dataDir": "/var/dicom-data",
			"useHash": false
		}
	},

	// server port number
	"port": 3000,

	// Log configurations. See log4js-node.
	"logs": [
		{
			"type": "dateFile",
			"filename": path.resolve(__dirname, "../logs/debug.log"),
			"pattern": "-yyyyMMdd.log"
		}
	],

	// DICOM loader
	"dumper": {
		"module": "PureJsDicomDumper",
		"options": {}
	},

	// PNG writer options
	"imageEncoder": {
		"module": "ImageEncoder_pngjs",
		"options": {}
	},

	"cache": {
		/*
 		 * threshold: upper limit of heap memory size. (in bytes)
 		 *		When object added, cached object will be removed to keep threshold.
 		 *		So this threshold is not strict.
 		 */
		"memoryThreshold": 2147483648
	},
	"authorization": {
		"require": false,
	  	"allowFrom": "127.0.0.1",
	  	"expire": 1800
	}
};
