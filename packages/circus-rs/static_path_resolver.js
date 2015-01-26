var path = require('path');
var fs = require('fs');
var config = require('./static_path_resolver_config');
var crypto = require('crypto');

function resolvPath(series, callback)
{
  var hash = crypto.createHash('sha256');
  hash.update(series);
  var hashStr = hash.digest('hex');

  var dcmdir = path.join(config.datadir, hashStr.substring(0,2), hashStr.substring(2,4), series);
  if (!fs.existsSync(dcmdir)) {
    console.log('not exists:' + dcmdir);
    dcmdir = null;
  }

  callback(dcmdir);
}

module.exports = {
	resolvPath: resolvPath
}
