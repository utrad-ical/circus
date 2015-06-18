import PathResolver = require('./PathResolver');
import path = require('path');
import fs = require('fs');
import crypto = require('crypto');

export = StaticPathResolver;

class StaticPathResolver extends PathResolver {
	public resolvePath(seriesUID: string, callback: (dir: string) => void): void {
		var hash = crypto.createHash('sha256');
		hash.update(seriesUID);
		var hashStr = hash.digest('hex');
		var dcmdir = path.join(this.config.dataDir, hashStr.substring(0, 2), hashStr.substring(2, 4), seriesUID);
		fs.exists(dcmdir, exists => {
			if (exists) {
				callback(dcmdir);
			} else {
				console.log('not exists:' + dcmdir);
				callback(null);
			}
		});
	}
}
