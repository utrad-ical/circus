/*************************************************
 * dcm_server path resolver for CIRCUS DB
 *************************************************/
var mongoose = require('mongoose'),
	Schema=mongoose.Schema;
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');

// configuration
var config = require('./CIRCUSDB_path_resolver_config');

// read configuration file
var mongoconfig = JSON.parse(fs.readFileSync(config.config_path, 'utf8'));

// define schema
var SeriesSchema = new Schema({
   studyUID : String,
   seriesUID  : String,
   storageID  : Number
});

var StorageSchema = new Schema({
  storageID : {type:Number},
  path: {type:String},
  active: {type:Boolean}
});

// register schema
mongoose.model('Series', SeriesSchema, 'Series');
mongoose.model('Storages', StorageSchema, 'Storages');

//
// resolve DICOM file's path
//
// seriesUID: series instance UID
// callback: callback function for receive path defined as
//     function callback(path)
//        path: DICOM file's directory. null if seriesUID not found or related storageID not found.
//
function resolvPath(seriesUID, callback)
{
	var constr =
		'mongodb://' + mongoconfig.username + ':' + mongoconfig.password + '@' + mongoconfig.host + ':' + mongoconfig.port + '/' + mongoconfig.database;

	mongoose.connect(constr,
	function(err) {
		if (err) {
			console.log('err:' + err);
			callback(null);
			return;
		}

		var Series = mongoose.model('Series');
		var Storages = mongoose.model('Storages');

		// find series.
		Series.findOne({ 'seriesUID' : seriesUID }, 'seriesUID storageID', function (err, series) {

			if (err) {
				console.log(err);
				callback(null);
				mongoose.disconnect();
				return;
			}

			// find storage
			Storages.findOne({ 'storageID' : series.storageID, 'type' : 'dicom' }, 'path active', function (err, storage) {
				if (err) {
					console.log(err);
					callback(null);
					mongoose.disconnect();
					return;
				}

				var hash = crypto.createHash('sha256');
				hash.update(seriesUID);
				var hashStr = hash.digest('hex');

				// create path
				var dcmdir = path.join(storage.path, hashStr.substring(0,2), hashStr.substring(2,4), seriesUID);

				// check if exists
				if (!fs.existsSync(dcmdir)) {
					console.log('not exists:' + dcmdir);
				} else {
					callback(dcmdir);
					mongoose.disconnect();
					return;
				}

				console.log('no storage for storageID: ' + series.storageID);
				callback(null);
				mongoose.disconnect();

			}); // Stroage.find
		}); // Series.findOne
	}); // mongodb.connect
}

module.exports = {
		resolvPath: resolvPath
}
