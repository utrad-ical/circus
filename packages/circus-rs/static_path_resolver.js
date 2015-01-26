var path = require('path');
var fs = require('fs');
var config = require('./static_path_resolver_config');

function resolvPath(series, callback)
{
  var dcmdir = path.join(config.datadir, series);
  if (!fs.existsSync(dcmdir)) {
    console.log('not exists:' + dcmdir);
    dcmdir = null;
  }

  callback(dcmdir);
}

module.exports = {
	resolvPath: resolvPath
}

